import { fontById, fontStack } from './fonts';
import type { Settings } from './settings';

/** CSS colour for the tint layer. */
export function tintColour(s: Settings): string {
  const hex = s.tint.colour.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return `rgba(${r}, ${g}, ${b}, ${(s.tint.strength / 100).toFixed(2)})`;
}

/** Whether the tint should currently be drawn. */
export const tintVisible = (s: Settings) => s.tint.on && s.tint.strength > 0;

/** Elements whose font must not change: code, and icon fonts that would turn into letters. */
const KEEP_FONT = ':not(code):not(pre):not(kbd):not(samp):not(i):not([class*="icon" i]):not([class*="material-symbols" i]):not([class*="fa-"])';

/**
 * Page-wide rules used by the browser extension. They only take effect while the matching class is on <html>
 * (`dr-font`, `dr-spacing`), so turning a feature off is just removing a class.
 */
export function pageCss(): string {
  return `html.dr-font body, html.dr-font body *${KEEP_FONT}{font-family:var(--dr-family) !important}
html.dr-spacing body *${KEEP_FONT}{letter-spacing:var(--dr-ls) !important;word-spacing:var(--dr-ws) !important}
b.dr-b{font-weight:700 !important}
html.dr-thin-bold b.dr-b{-webkit-text-stroke:0.035em currentColor}
#dr-tint{position:fixed;inset:0;pointer-events:none;z-index:2147483647;mix-blend-mode:multiply;transition:background-color .2s}`;
}

/** Values for the CSS variables used by `pageCss`. */
export function cssVars(s: Settings): Record<string, string> {
  const font = fontById(s.font);
  return {
    '--dr-ls': `${s.letterSpacing / 100}em`,
    '--dr-ws': `${0.1 + s.letterSpacing / 50}em`,
    '--dr-family': font ? fontStack(font) : 'inherit',
  };
}

/** Classes for <html>: `dr-font` while a reading font is chosen, `dr-thin-bold` when its bold needs the extra outline. */
export function fontClasses(s: Settings): { 'dr-font': boolean; 'dr-thin-bold': boolean } {
  const font = fontById(s.font);
  return { 'dr-font': !!font, 'dr-thin-bold': !!font?.thinBold };
}
