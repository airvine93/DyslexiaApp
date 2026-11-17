/**
 * What the app can do beyond its own window depends on where it runs. In a browser it can only restyle its own page.
 * Inside the installed app (Tauri) on Windows, Mac, Linux and Android it can also tint the whole screen.
 */
import type { Settings } from '@dr/core';

type Invoke = <T>(cmd: string, args?: Record<string, unknown>) => Promise<T>;

const tauri = () => (window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__ !== undefined;

let invokeFn: Invoke | null = null;
async function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  if (!invokeFn) invokeFn = (await import('@tauri-apps/api/core')).invoke as Invoke;
  return invokeFn<T>(cmd, args);
}

export interface Capabilities {
  /** Can draw the tint over every app, not just this one. */
  screenTint: boolean;
  /** Short note shown under the whole-screen option. */
  screenNote: string;
}

export async function capabilities(): Promise<Capabilities> {
  if (!tauri()) {
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    return {
      screenTint: false,
      screenNote: ios
        ? 'To tint everything on an iPhone or iPad, use Settings > Accessibility > Display & Text Size > Colour Filters > Colour Tint.'
        : 'Install the app to tint the whole screen, or use the browser extension to restyle web pages.',
    };
  }
  try {
    const c = await invoke<{ screen_tint: boolean; note: string }>('capabilities');
    return { screenTint: c.screen_tint, screenNote: c.note };
  } catch {
    return { screenTint: false, screenNote: '' };
  }
}

/** Show, change or hide the whole-screen tint. */
export async function setScreenTint(s: Settings, on: boolean): Promise<void> {
  if (!tauri()) return;
  await invoke('set_screen_tint', { on: on && s.tint.on, colour: s.tint.colour, alpha: s.tint.strength / 100 });
}

/** Text sent to the app from elsewhere: the desktop shortcut, or "Read in Easy Reader" on Android. */
export async function onIncomingText(handler: (text: string) => void): Promise<void> {
  if (!tauri()) return;
  const { listen } = await import('@tauri-apps/api/event');
  await listen<string>('read-text', (e) => handler(e.payload));
  const pending = await invoke<string | null>('take_pending_text').catch(() => null);
  if (pending) handler(pending);
}

/** The tray menu's "Turn screen tint off". */
export async function onScreenTintOff(handler: () => void): Promise<void> {
  if (!tauri()) return;
  const { listen } = await import('@tauri-apps/api/event');
  await listen('screen-tint-off', () => handler());
}
