/**
 * Reading fonts the person can choose from. All are free to bundle: OpenDyslexic under its own free licence (Bitstream
 * Vera based), the rest under the SIL Open Font License 1.1. Each font's licence file sits beside its font files.
 * Files are latin and latin-ext subsets (from Fontsource), so the browser only downloads what a page uses.
 */

export interface ReadingFont {
  id: string;
  /** Name shown to the person. */
  name: string;
  /** One line on what it is like. */
  about: string;
  /** Family name used in CSS. Prefixed so it never clashes with a web page's own fonts. */
  family: string;
  /** Font files relative to the fonts folder, with the characters each covers. */
  faces: { file: string; weight: 400 | 700; range?: string }[];
  /** OpenDyslexic's bold is only slightly heavier than its regular, so bold word starts get a thin outline as well. */
  thinBold?: boolean;
}

const LATIN = 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD';
const LATIN_EXT = 'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF';

const fontsource = (id: string, ext = true): ReadingFont['faces'] => [400, 700].flatMap((weight) => [
  { file: `${id}/${id}-latin-${weight}-normal.woff2`, weight: weight as 400 | 700, range: LATIN },
  ...(ext ? [{ file: `${id}/${id}-latin-ext-${weight}-normal.woff2`, weight: weight as 400 | 700, range: LATIN_EXT }] : []),
]);

export const FONTS: readonly ReadingFont[] = [
  {
    id: 'opendyslexic', name: 'OpenDyslexic', about: 'Heavy bottoms on each letter so they stay the right way up.',
    family: 'ER OpenDyslexic', thinBold: true,
    faces: [{ file: 'opendyslexic/OpenDyslexic-Regular.otf', weight: 400 }, { file: 'opendyslexic/OpenDyslexic-Bold.otf', weight: 700 }],
  },
  { id: 'lexend', name: 'Lexend', about: 'Wide, evenly spaced letters made to cut down reading effort.', family: 'ER Lexend', faces: fontsource('lexend') },
  {
    id: 'atkinson-hyperlegible-next', name: 'Atkinson Hyperlegible Next', about: 'Letters that are hard to mix up, such as b and d, or I and l.',
    family: 'ER Atkinson Hyperlegible Next', faces: fontsource('atkinson-hyperlegible-next'),
  },
  {
    id: 'atkinson-hyperlegible', name: 'Atkinson Hyperlegible', about: 'The original Braille Institute font for clear letter shapes.',
    family: 'ER Atkinson Hyperlegible', faces: fontsource('atkinson-hyperlegible'),
  },
  { id: 'andika', name: 'Andika', about: 'Simple letter shapes like the ones children learn to write.', family: 'ER Andika', faces: fontsource('andika') },
  { id: 'comic-neue', name: 'Comic Neue', about: 'A tidier Comic Sans, with rounded, friendly letters.', family: 'ER Comic Neue', faces: fontsource('comic-neue', false) },
  { id: 'readex-pro', name: 'Readex Pro', about: 'Built on Lexend, designed to cover many languages.', family: 'ER Readex Pro', faces: fontsource('readex-pro') },
];

/** "off" means: leave the text in whatever font it already has. */
export const FONT_OFF = 'off';

export const fontById = (id: string): ReadingFont | undefined => FONTS.find((f) => f.id === id);

/** @font-face rules for every reading font. `url` turns a file path (relative to the fonts folder) into a loadable URL. */
export function fontFaces(url: (file: string) => string): string {
  return FONTS.flatMap((f) => f.faces.map((face) => {
    const format = face.file.endsWith('.otf') ? 'opentype' : 'woff2';
    const range = face.range ? `;unicode-range:${face.range}` : '';
    return `@font-face{font-family:"${f.family}";src:url("${url(face.file)}") format("${format}");font-weight:${face.weight};font-style:normal;font-display:swap${range}}`;
  })).join('\n');
}

/** CSS font-family value for a chosen font, with fallbacks. */
export const fontStack = (f: ReadingFont) => `"${f.family}", system-ui, sans-serif`;
