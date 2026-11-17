import { normalise, type Settings } from '@dr/core';

/**
 * What the extension keeps: the shared settings (also used by the reader page built into the extension), whether it is
 * on at all, sites where it is switched off, and two web-only options: page zoom and line spacing on web pages.
 */
export interface State { settings: Settings; enabled: boolean; offSites: string[]; zoom: number; lineOn: boolean }

export const ZOOM_MIN = 100;
export const ZOOM_MAX = 200;

export async function load(): Promise<State> {
  const raw = await chrome.storage.sync.get(['settings', 'enabled', 'offSites', 'zoom', 'lineOn']);
  const zoom = typeof raw.zoom === 'number' && Number.isFinite(raw.zoom) ? Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, raw.zoom)) : ZOOM_MIN;
  return {
    settings: normalise(raw.settings),
    enabled: raw.enabled !== false,
    offSites: Array.isArray(raw.offSites) ? raw.offSites.filter((x): x is string => typeof x === 'string') : [],
    zoom,
    lineOn: raw.lineOn === true,
  };
}

export const save = (patch: Partial<State>) => chrome.storage.sync.set(patch);

/** Sites that draw their text as pictures, so their words can't be restyled in place. */
export const PICTURE_TEXT_SITES: { test: RegExp; name: string; tip: string }[] = [
  { test: /^docs\.google\.com$/, name: 'Google Docs', tip: 'In Google Docs, choose File > Download > Microsoft Word (.docx), then open that file in Easy Reader. Or select text, copy it, and press Open in Easy Reader.' },
  { test: /^(read\.amazon\.|.*kindle)/, name: 'Kindle', tip: 'Kindle books are protected, so they can\u2019t be restyled. You can copy short passages and press Open in Easy Reader.' },
  { test: /^(www\.)?canva\.com$|^(www\.)?figma\.com$/, name: 'this site', tip: 'This site draws its text as pictures. Copy the text, then press Open in Easy Reader.' },
];
