# Easy Reader

Dyslexia-friendly reading on Android, iPhone, Windows, Mac and Linux:

- **A choice of reading fonts**: OpenDyslexic, Lexend, Atkinson Hyperlegible Next, Atkinson Hyperlegible, Andika, Comic Neue and Readex Pro, or the text's own font. All are free to bundle; each font's licence is in its folder under `packages/core/fonts/`.
- **Bold the start of words** (bionic-style), with a slider from off to 80% of each word. Light, Medium and Strong match the steps in Emotion Shaper. Short words always get one bold letter, and longer words always keep at least one plain letter.
- **Colour overlay** in any colour, with adjustable strength.
- Text size, line spacing and letter spacing.

## What works where

Apps aren't allowed to change the font inside *other* apps on any of these systems, so the app reads text you bring to it, and a browser extension restyles web pages directly.

| | Reader app (paste, type, open .txt/.md/.html/.pdf) | Tint over the whole screen | Web pages restyled in place | Send text from other apps |
|---|---|---|---|---|
| Windows | ✅ | ✅ | ✅ Chrome, Edge, Firefox extension | ✅ copy, then Ctrl+Alt+R |
| Mac | ✅ | ✅ | ✅ Chrome, Edge, Firefox; Safari after conversion | ✅ copy, then Cmd+Option+R |
| Linux | ✅ | ✅ on X11 (Wayland varies) | ✅ Chrome, Firefox | ✅ copy, then Ctrl+Alt+R |
| Android | ✅ | Planned (needs a small native add-on) | ✅ Firefox for Android | Planned: "Read in Easy Reader" in the text-selection menu |
| iPhone / iPad | ✅ | ❌ not allowed by iOS. Use Settings > Accessibility > Display & Text Size > Colour Filters | Planned: Safari extension | Planned: Share sheet |

## Layout

| Path | What |
|---|---|
| `packages/core` | The restyling itself, shared by everything: bold word starts, settings, tint colour, page CSS. Has tests. |
| `apps/reader` | The reader app. Web code (Vite, TypeScript) wrapped by [Tauri 2](https://tauri.app) into desktop and phone apps. `src-tauri` holds the native part: the screen tint windows, tray menu and keyboard shortcut. |
| `apps/extension` | Browser extension (Manifest V3) that restyles any web page. |

## Running it

```bash
npm install
npm test               # core tests
npm run dev            # reader in a browser at http://localhost:5173
npm run desktop        # reader as a desktop app (needs Rust; on Linux also the WebKitGTK packages listed in .github/workflows/desktop.yml)
npm run build:extension  # browser extension in apps/extension/dist
npm -w @dr/reader run build:single  # the whole reader as one HTML file, in apps/reader/dist-single
```

**Installing the extension for testing:** Chrome or Edge: open `chrome://extensions`, turn on Developer mode, choose "Load unpacked" and pick `apps/extension/dist`. Firefox: open `about:debugging`, "This Firefox", "Load Temporary Add-on", and pick `apps/extension/dist/manifest.json`. Safari: on a Mac with Xcode, run `xcrun safari-web-extension-converter apps/extension/dist`.

**Installers:** every pull request builds Windows, Mac and Linux installers on GitHub Actions ("Desktop apps" workflow). Download them from the run's Artifacts. They are not code-signed yet, so Windows and macOS will warn the first time you open them.

## Fonts

| Font | By | Licence |
|---|---|---|
| OpenDyslexic | Abbie Gonzalez | Free licence based on Bitstream Vera |
| Lexend | The Lexend Project Authors | SIL Open Font License 1.1 |
| Atkinson Hyperlegible Next | The Atkinson Hyperlegible Next Project Authors | SIL Open Font License 1.1 |
| Atkinson Hyperlegible | Braille Institute of America | SIL Open Font License 1.1 |
| Andika | SIL International | SIL Open Font License 1.1 |
| Comic Neue | The Comic Neue Project Authors | SIL Open Font License 1.1 |
| Readex Pro | The Readex Pro Project Authors | SIL Open Font License 1.1 |

The OFL fonts are the unmodified Latin and Latin Extended files published by [Fontsource](https://fontsource.org). Full licence texts are beside the font files.
