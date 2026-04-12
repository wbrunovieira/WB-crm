"use client";

/**
 * GoToCallPlayer
 *
 * Plays two GoTo call tracks (agent + client) simultaneously, synced by the
 * timestamp embedded in each S3 key. Renders an attributed transcript with
 * active-segment highlighting.
 *
 * Audio sync strategy:
 *   S3 key format: {yyyy}/{MM}/{dd}/{isoTimestamp}~{callId}~...
 *   The ISO timestamp tells us when each recording started. If the client track
 *   started 4 s after the agent track, we delay starting the client audio by 4 s.
 *   On seek, both elements are repositioned to keep the invariant:
 *     clientTime = agentTime - offsetSeconds   (clamped to 0)
 */

import { useRef, useState, useEffect, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TranscriptSegment {
  start: number;       // seconds within that speaker's recording
  end: number;
  speaker: "agent" | "client";
  speakerName: string;
  text: string;
}

interface Props {
  activityId: string;
  agentKey: string;             // gotoRecordingUrl  — S3 key
  clientKey?: string | null;    // gotoRecordingUrl2 — S3 key (may be absent)
  transcriptText?: string | null;
  compact?: boolean;            // smaller layout for list views
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseTranscript(raw: string | null | undefined): TranscriptSegment[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    if (Array.isArray(arr) && arr.length > 0 && "speaker" in arr[0]) return arr;
  } catch {}
  // Legacy plain-text transcript — wrap as single agent segment
  return [{ start: 0, end: 0, speaker: "agent", speakerName: "Agente", text: raw ?? "" }];
}

function isoFromKey(key: string): number {
  const filename = key.split("/").pop() ?? "";
  return Date.parse(filename.split("~")[0]);
}

function offsetSeconds(agentKey: string, clientKey: string): number {
  const ag = isoFromKey(agentKey);
  const cl = isoFromKey(clientKey);
  if (isNaN(ag) || isNaN(cl)) return 0;
  return (cl - ag) / 1000; // positive → client started later
}

function fmt(s: number): string {
  if (!isFinite(s) || isNaN(s)) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function GoToCallPlayer({
  activityId,
  agentKey,
  clientKey,
  transcriptText,
  compact = false,
}: Props) {
  const agentAudio = useRef<HTMLAudioElement>(null);
  const clientAudio = useRef<HTMLAudioElement>(null);
  const clientDelayTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showTranscript, setShowTranscript] = useState(false);

  const offset = clientKey ? offsetSeconds(agentKey, clientKey) : 0;
  const segments = parseTranscript(transcriptText);

  // ── Sync currentTime display from agent track ──────────────────────────────
  useEffect(() => {
    const el = agentAudio.current;
    if (!el) return;
    const onTime = () => setCurrentTime(el.currentTime);
    const onMeta = () => setDuration(el.duration);
    const onEnded = () => { setPlaying(false); setCurrentTime(0); };
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("loadedmetadata", onMeta);
    el.addEventListener("ended", onEnded);
    return () => {
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("loadedmetadata", onMeta);
      el.removeEventListener("ended", onEnded);
    };
  }, []);

  // ── Clear pending timers on unmount ───────────────────────────────────────
  useEffect(() => () => {
    if (clientDelayTimer.current) clearTimeout(clientDelayTimer.current);
  }, []);

  // ── Play / Pause ──────────────────────────────────────────────────────────
  const handlePlayPause = useCallback(() => {
    const agent = agentAudio.current;
    const client = clientAudio.current;

    if (playing) {
      agent?.pause();
      client?.pause();
      if (clientDelayTimer.current) {
        clearTimeout(clientDelayTimer.current);
        clientDelayTimer.current = null;
      }
      setPlaying(false);
      return;
    }

    if (!agent) return;
    const agentTime = agent.currentTime;
    agent.play();

    if (client && clientKey) {
      const clientTime = agentTime - offset;
      if (clientTime >= 0) {
        // We're past the client start — play it from the right position
        client.currentTime = clientTime;
        client.play();
      } else {
        // Agent hasn't reached client start yet — delay
        const delayMs = Math.max(0, -clientTime * 1000);
        clientDelayTimer.current = setTimeout(() => {
          client.currentTime = 0;
          client.play();
        }, delayMs);
      }
    }
    setPlaying(true);
  }, [playing, clientKey, offset]);

  // ── Seek ─────────────────────────────────────────────────────────────────
  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const agent = agentAudio.current;
    if (!agent || !duration) return;

    if (clientDelayTimer.current) {
      clearTimeout(clientDelayTimer.current);
      clientDelayTimer.current = null;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const newAgentTime = ratio * duration;
    agent.currentTime = newAgentTime;

    const client = clientAudio.current;
    if (client && clientKey) {
      const clientTime = newAgentTime - offset;
      if (clientTime >= 0) {
        client.currentTime = clientTime;
        if (playing) client.play();
      } else {
        client.currentTime = 0;
        client.pause();
        if (playing) {
          const delayMs = -clientTime * 1000;
          clientDelayTimer.current = setTimeout(() => {
            client.currentTime = 0;
            client.play();
          }, delayMs);
        }
      }
    }
  }, [duration, clientKey, offset, playing]);

  // ── Active segment for highlight ─────────────────────────────────────────
  const activeIdx = segments.findIndex(
    (s) => currentTime >= s.start && currentTime <= s.end
  );

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
      {/* Hidden audio elements */}
      <audio
        ref={agentAudio}
        preload="metadata"
        src={`/api/goto/recordings/${activityId}?track=agent`}
      />
      {clientKey && (
        <audio
          ref={clientAudio}
          preload="metadata"
          src={`/api/goto/recordings/${activityId}?track=client`}
        />
      )}

      {/* Player bar */}
      <div className="flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2">
        {/* Play / Pause */}
        <button
          onClick={handlePlayPause}
          className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          aria-label={playing ? "Pausar" : "Reproduzir"}
        >
          {playing ? (
            <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
            </svg>
          ) : (
            <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        {/* Current time */}
        <span className="w-8 text-right text-xs tabular-nums text-blue-700">
          {fmt(currentTime)}
        </span>

        {/* Progress bar */}
        <div
          className="relative h-1.5 flex-1 cursor-pointer rounded-full bg-blue-200"
          onClick={handleSeek}
          role="slider"
          aria-valuenow={Math.round(currentTime)}
          aria-valuemax={Math.round(duration)}
        >
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-blue-600 transition-[width]"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Duration */}
        <span className="w-8 text-xs tabular-nums text-blue-400">
          {fmt(duration)}
        </span>

        {/* Transcript toggle */}
        {segments.length > 0 && (
          <button
            onClick={() => setShowTranscript((v) => !v)}
            className="flex-shrink-0 text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors"
          >
            {showTranscript ? "Ocultar" : "Transcrição"}
          </button>
        )}

        {/* Pending indicator (has recording but no transcript yet) */}
        {!transcriptText && (
          <span className="flex-shrink-0 text-xs text-blue-400">
            ⏳ Transcrevendo...
          </span>
        )}
      </div>

      {/* Transcript */}
      {showTranscript && segments.length > 0 && (
        <div className={`overflow-y-auto rounded-md border border-blue-200 bg-white ${compact ? "max-h-52" : "max-h-72"}`}>
          <div className="divide-y divide-gray-100">
            {segments.map((seg, i) => {
              const isActive = i === activeIdx;
              const isAgent = seg.speaker === "agent";
              return (
                <div
                  key={i}
                  className={`px-3 py-2 transition-colors cursor-pointer hover:bg-gray-50 ${isActive ? "bg-yellow-50" : ""}`}
                  onClick={() => {
                    // Click on segment → seek to that moment
                    const agent = agentAudio.current;
                    if (!agent) return;
                    const targetTime = isAgent ? seg.start : seg.start + offset;
                    agent.currentTime = Math.max(0, targetTime);
                    if (!playing) handlePlayPause();
                  }}
                >
                  <div className="flex items-baseline gap-2">
                    <span className={`text-xs font-semibold ${isAgent ? "text-blue-700" : "text-violet-700"}`}>
                      {seg.speakerName}
                    </span>
                    <span className="text-xs text-gray-400">
                      {fmt(seg.start)}
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm leading-snug text-gray-800">
                    {seg.text}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
