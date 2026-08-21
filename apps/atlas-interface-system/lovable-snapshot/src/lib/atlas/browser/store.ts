import { useCallback, useEffect, useState } from "react";
import {
  DEFAULT_SETTINGS,
  DEMO_EVIDENCE,
  type BrowserSettings,
  type EvidenceRecord,
} from "./data";

const EVIDENCE_KEY = "atlas.browser.evidence.v1";
const SETTINGS_KEY = "atlas.browser.settings.v1";
const HISTORY_KEY = "atlas.browser.history.v1";
const FAVORITES_KEY = "atlas.browser.favorites.v1";

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable — prototype degrades to in-memory state */
  }
}

/** Local-only persisted state. Hydrates after mount to avoid SSR mismatch. */
function useLocalState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setValue(read(key, initial));
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const update = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const resolved = typeof next === "function" ? (next as (p: T) => T)(prev) : next;
        write(key, resolved);
        return resolved;
      });
    },
    [key],
  );

  return [value, update, hydrated] as const;
}

export function useEvidence() {
  const [records, setRecords, hydrated] = useLocalState<EvidenceRecord[]>(
    EVIDENCE_KEY,
    DEMO_EVIDENCE,
  );

  const add = useCallback(
    (record: Omit<EvidenceRecord, "id" | "createdAt">) => {
      const full: EvidenceRecord = {
        ...record,
        id: `ev-${Date.now().toString(36)}`,
        createdAt: new Date().toISOString(),
      };
      setRecords((prev) => [full, ...prev]);
      return full;
    },
    [setRecords],
  );

  const update = useCallback(
    (id: string, patch: Partial<EvidenceRecord>) =>
      setRecords((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r))),
    [setRecords],
  );

  const remove = useCallback(
    (id: string) => setRecords((prev) => prev.filter((r) => r.id !== id)),
    [setRecords],
  );

  const reset = useCallback(() => setRecords(DEMO_EVIDENCE), [setRecords]);
  const clear = useCallback(() => setRecords([]), [setRecords]);

  return { records, add, update, remove, reset, clear, hydrated };
}

export function useBrowserSettings() {
  const [settings, setSettings, hydrated] = useLocalState<BrowserSettings>(
    SETTINGS_KEY,
    DEFAULT_SETTINGS,
  );
  const set = useCallback(
    <K extends keyof BrowserSettings>(key: K, value: BrowserSettings[K]) =>
      setSettings((prev) => ({ ...prev, [key]: value })),
    [setSettings],
  );
  const reset = useCallback(() => setSettings(DEFAULT_SETTINGS), [setSettings]);
  return { settings, set, reset, hydrated };
}

export type HistoryEntry = { url: string; title: string; at: string };

export function useBrowsingHistory() {
  const [history, setHistory] = useLocalState<HistoryEntry[]>(HISTORY_KEY, []);
  const push = useCallback(
    (entry: Omit<HistoryEntry, "at">) =>
      setHistory((prev) =>
        [{ ...entry, at: new Date().toISOString() }, ...prev.filter((h) => h.url !== entry.url)].slice(
          0,
          30,
        ),
      ),
    [setHistory],
  );
  const clear = useCallback(() => setHistory([]), [setHistory]);
  return { history, push, clear };
}

export function useFavorites() {
  const [favorites, setFavorites] = useLocalState<{ url: string; title: string }[]>(FAVORITES_KEY, [
    { url: "/finance", title: "ATLAS Finance" },
    { url: "https://riders.uber.com/trips", title: "Uber — Trips" },
  ]);
  const toggle = useCallback(
    (fav: { url: string; title: string }) =>
      setFavorites((prev) =>
        prev.some((f) => f.url === fav.url) ? prev.filter((f) => f.url !== fav.url) : [fav, ...prev],
      ),
    [setFavorites],
  );
  const clear = useCallback(() => setFavorites([]), [setFavorites]);
  return { favorites, toggle, clear };
}

export function clearAllBrowserData() {
  [EVIDENCE_KEY, SETTINGS_KEY, HISTORY_KEY, FAVORITES_KEY].forEach((k) => {
    try {
      window.localStorage.removeItem(k);
    } catch {
      /* noop */
    }
  });
}