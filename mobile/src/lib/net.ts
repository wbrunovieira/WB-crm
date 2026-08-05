import NetInfo from "@react-native-community/netinfo";

/**
 * True when NetInfo reports a usable connection. Treats "unknown" reachability as online
 * (don't block on ambiguity) — only a confirmed false blocks. This is a fast, non-authoritative
 * pre-check (captive portals etc. can lie); the real source of truth is still the outcome of
 * the actual network call, handled independently wherever `apiFetch` is used.
 */
export async function isOnline(): Promise<boolean> {
  const state = await NetInfo.fetch();
  return state.isConnected !== false && state.isInternetReachable !== false;
}
