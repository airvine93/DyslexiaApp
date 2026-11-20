/**
 * Where the reader keeps things. Settings are small and live in localStorage, or in the browser extension's own
 * storage when the reader runs inside the extension, so both share one set of settings. Documents can be big, so
 * they live in IndexedDB, which has far more room than localStorage.
 */
import { normalise, type Settings } from '@dr/core';

type ChromeStorage = { get(keys: string[]): Promise<Record<string, unknown>>; set(v: Record<string, unknown>): Promise<void>; remove(k: string): Promise<void> };
const ext = (globalThis as unknown as { chrome?: { storage?: { sync?: ChromeStorage; local?: ChromeStorage }; runtime?: { id?: string } } }).chrome;
/** True when this page is the reader built into the browser extension. */
export const inExtension = !!ext?.runtime?.id && !!ext.storage?.sync;

const read = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const write = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* storage full or blocked: keep going */ } };
const parse = (v: string | null): unknown => { try { return JSON.parse(v ?? 'null'); } catch { return null; } };

const KEY = { settings: 'dr.settings', screen: 'dr.screenTint', setups: 'dr.setups', current: 'dr.current', seen: 'dr.seenSetup', oldDoc: 'dr.doc' };

export async function loadSettings(): Promise<{ settings: Settings; fresh: boolean }> {
  if (inExtension) {
    const raw = await ext!.storage!.sync!.get(['settings']);
    return { settings: normalise(raw.settings), fresh: raw.settings === undefined };
  }
  const raw = read(KEY.settings);
  return { settings: normalise(parse(raw)), fresh: raw === null };
}

let saveTimer = 0;
export function saveSettings(s: Settings): void {
  if (!inExtension) { write(KEY.settings, JSON.stringify(s)); return; }
  // The extension's synced storage only allows a few writes a minute, so wait until a slider stops moving
  clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => void ext!.storage!.sync!.set({ settings: s }), 400);
}

/** Settings changed by the extension's popup while the reader is open. */
export function onSettingsChanged(handler: (s: Settings) => void): void {
  const api = ext as unknown as { storage?: { onChanged?: { addListener(f: (c: Record<string, { newValue?: unknown }>, area: string) => void): void } } };
  api?.storage?.onChanged?.addListener((changes, area) => {
    if (inExtension && area === 'sync' && changes.settings) handler(normalise(changes.settings.newValue));
  });
}

export const screenTintWanted = () => read(KEY.screen) === '1';
export const setScreenTintWanted = (on: boolean) => write(KEY.screen, on ? '1' : '0');
export const setupSeen = () => read(KEY.seen) === '1';
export const markSetupSeen = () => write(KEY.seen, '1');

// ---- saved setups ("Work", "Tired evening")

export interface SavedSetup { name: string; settings: Settings }
export function loadSetups(): SavedSetup[] {
  const raw = parse(read(KEY.setups));
  if (!Array.isArray(raw)) return [];
  return raw.filter((x) => x && typeof x.name === 'string').map((x) => ({ name: String(x.name).slice(0, 40), settings: normalise(x.settings) }));
}
export const saveSetups = (list: SavedSetup[]) => write(KEY.setups, JSON.stringify(list));

// ---- documents

export interface Doc { id: string; title: string; html: string; /** How far down the reader had got, 0 to 1. */ place: number; opened: number }
/** How many documents to keep. Older ones are forgotten. */
const KEEP_DOCS = 20;

let dbPromise: Promise<IDBDatabase | null> | null = null;
function db(): Promise<IDBDatabase | null> {
  dbPromise ??= new Promise((resolve) => {
    try {
      const req = indexedDB.open('easy-reader', 1);
      req.onupgradeneeded = () => req.result.createObjectStore('docs', { keyPath: 'id' });
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch { resolve(null); }
  });
  return dbPromise;
}
function tx<T>(mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
  return db().then((d) => new Promise((resolve) => {
    if (!d) { resolve(undefined); return; }
    try {
      const t = d.transaction('docs', mode);
      const req = run(t.objectStore('docs'));
      t.oncomplete = () => resolve(req ? req.result : undefined);
      t.onerror = t.onabort = () => resolve(undefined);
    } catch { resolve(undefined); }
  }));
}

export async function listDocs(): Promise<Doc[]> {
  const all = (await tx<Doc[]>('readonly', (s) => s.getAll() as IDBRequest<Doc[]>)) ?? [];
  return all.sort((a, b) => b.opened - a.opened);
}
export const getDoc = (id: string) => tx<Doc>('readonly', (s) => s.get(id) as IDBRequest<Doc>);
export async function putDoc(doc: Doc): Promise<void> {
  await tx('readwrite', (s) => { s.put(doc); });
  const all = await listDocs();
  for (const old of all.slice(KEEP_DOCS)) await tx('readwrite', (s) => { s.delete(old.id); });
}
export const deleteDoc = (id: string) => tx('readwrite', (s) => { s.delete(id); });
export const currentDocId = () => read(KEY.current);
export const setCurrentDocId = (id: string | null) => { if (id) write(KEY.current, id); else try { localStorage.removeItem(KEY.current); } catch { /* ignore */ } };

/** The first version kept a single document in localStorage. Move it into the library once. */
export async function migrateOldDoc(): Promise<void> {
  const html = read(KEY.oldDoc);
  if (!html) return;
  const id = newId();
  await putDoc({ id, title: titleOf(html, 'Earlier document'), html, place: 0, opened: Date.now() });
  setCurrentDocId(id);
  try { localStorage.removeItem(KEY.oldDoc); } catch { /* ignore */ }
}

export const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

/** A short name for a document: its first heading, or its first few words. */
export function titleOf(html: string, fallback = 'Untitled'): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const h = doc.querySelector('h1, h2, h3')?.textContent?.trim();
  const text = (h || doc.body.textContent || '').replace(/\s+/g, ' ').trim();
  if (!text) return fallback;
  return text.length > 60 ? `${text.slice(0, 57).replace(/\s+\S*$/, '')}…` : text;
}
