import AsyncStorage from "@react-native-async-storage/async-storage";
import { createLeadWithVisit, addVisitToExistingLead, type LeadBody, type CaptureOptions, type ContactInput } from "./leads";
import { checkGoogleId } from "./places";
import { ApiError } from "./api";
import { isOnline } from "./net";
import { queryClient } from "./query-client";

const KEY = "outbox:v1";

/** A capture that failed to submit for lack of connectivity, persisted for later replay. */
export interface OutboxItem {
  id: string;
  createdAt: string;
  body: LeadBody;
  opts: CaptureOptions;
  attempts: number;
  lastError?: string;
  lastAttemptAt?: string;
}

// Serializes every read-modify-write against the AsyncStorage key. Without this, two callers
// (e.g. a capture enqueueing at the same moment a connectivity-triggered drain is removing a
// different item) can each read-then-write and silently clobber each other's change — losing a
// just-captured lead is exactly the failure this feature exists to prevent. JS never runs two
// synchronous sections in parallel, so chaining onto one module-level promise is enough; no
// native mutex needed.
let chain: Promise<unknown> = Promise.resolve();
function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const result = chain.then(fn, fn);
  chain = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

async function readAll(): Promise<OutboxItem[]> {
  const raw = await AsyncStorage.getItem(KEY);
  return raw ? (JSON.parse(raw) as OutboxItem[]) : [];
}

async function writeAll(items: OutboxItem[]): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(items));
  notify();
}

/** Lets the Home screen's pending-count query pick up the change immediately. */
function notify() {
  queryClient.invalidateQueries({ queryKey: ["outbox", "count"] });
}

export function enqueue(body: LeadBody, opts: CaptureOptions): Promise<void> {
  return withLock(async () => {
    const items = await readAll();
    items.push({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      createdAt: new Date().toISOString(),
      body,
      opts,
      attempts: 0,
    });
    await writeAll(items);
  });
}

export async function listOutbox(): Promise<OutboxItem[]> {
  return readAll();
}

export async function countOutbox(): Promise<number> {
  return (await readAll()).length;
}

function removeItem(id: string): Promise<void> {
  return withLock(async () => {
    const items = await readAll();
    await writeAll(items.filter((i) => i.id !== id));
  });
}

function markFailed(id: string, error: unknown): Promise<void> {
  return withLock(async () => {
    const items = await readAll();
    const message = error instanceof Error ? error.message : String(error);
    await writeAll(
      items.map((i) =>
        i.id === id
          ? { ...i, attempts: i.attempts + 1, lastError: message, lastAttemptAt: new Date().toISOString() }
          : i,
      ),
    );
  });
}

// By construction (see ManualLeadForm.tsx), an item only reaches the outbox after a genuine
// connectivity failure — so an ApiError seen here during replay means something changed
// server-side since capture (dedup, validation, an expired JWT), not a transient network blip.
// There's no queue-review/edit UI yet (Fase 5), so cap retries instead of hammering the API
// forever; the item still counts as pending so the field team notices it needs attention.
const MAX_AUTO_ATTEMPTS = 5;

// apiFetch has no request timeout, so a hung connection could otherwise leave `draining` stuck
// true forever — silently disabling every future drain trigger (NetInfo, AppState, the poll,
// even the manual "Sincronizar agora" button) for the rest of the app session. Bound each
// replay attempt so drainOutbox always eventually finishes and resets the flag.
const REPLAY_TIMEOUT_MS = 20_000;
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error("outbox-replay-timeout")), ms)),
  ]);
}

let draining = false;

/** Replays every queued item sequentially (preserves capture order, avoids hammering a flaky
 *  connection with parallel requests). Safe to call anytime — it's a no-op while offline, empty,
 *  or already draining. */
export async function drainOutbox(): Promise<void> {
  if (draining) return;
  // Set the flag synchronously, before any `await` — otherwise two near-simultaneous callers
  // (e.g. the cold-start drain and the NetInfo listener, which fires almost immediately after
  // subscribing) can both pass the `if (draining) return` check before either sets it.
  draining = true;
  try {
    if (!(await isOnline())) return;
    const items = await readAll();
    for (const item of items) {
      if (item.attempts >= MAX_AUTO_ATTEMPTS) continue; // paused, still counted as pending
      try {
        // Google-sourced item: the dedup check may have been skipped at capture time (offline),
        // so reconfirm before replaying — avoids creating a duplicate lead. A hit doesn't mean
        // discard: add the queued visit/contact to the existing lead instead (see ManualLeadForm
        // for why — revisiting a known business is the common case, not an error).
        if ("googleId" in item.body && item.body.googleId) {
          const check = await withTimeout(checkGoogleId(item.body.googleId as string), REPLAY_TIMEOUT_MS);
          if (check.exists && check.leadId) {
            const contact = (item.body.contacts as ContactInput[] | undefined)?.[0];
            await withTimeout(
              addVisitToExistingLead(check.leadId, check.businessName ?? item.body.businessName, contact, item.opts),
              REPLAY_TIMEOUT_MS,
            );
            await removeItem(item.id);
            continue;
          }
        }
        await withTimeout(createLeadWithVisit(item.body, item.opts), REPLAY_TIMEOUT_MS);
        await removeItem(item.id);
      } catch (e) {
        if (e instanceof ApiError) {
          // Real rejection (validation, auth, dedup) — keep it, but don't let it block the rest.
          await markFailed(item.id, e);
          continue;
        }
        // Connectivity dropped (or a request hung past the timeout) mid-drain — stop this pass,
        // the next trigger retries the rest.
        await markFailed(item.id, e);
        break;
      }
    }
  } finally {
    draining = false;
  }
}
