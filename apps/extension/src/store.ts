import { normalise, type Settings } from '@dr/core';

/** What the extension keeps: the shared settings, whether it is on at all, and sites where it is switched off. */
export interface State { settings: Settings; enabled: boolean; offSites: string[] }

export async function load(): Promise<State> {
  const raw = await chrome.storage.sync.get(['settings', 'enabled', 'offSites']);
  return {
    settings: normalise(raw.settings),
    enabled: raw.enabled !== false,
    offSites: Array.isArray(raw.offSites) ? raw.offSites.filter((x): x is string => typeof x === 'string') : [],
  };
}

export const save = (patch: Partial<State>) => chrome.storage.sync.set(patch);
