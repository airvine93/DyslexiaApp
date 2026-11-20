# Video lab

One Three.js script that draws 100 short videos for Easy Reader, each tagged so the results can be compared later.

Every video has the same five acts:

1. **Hook.** A word, a word origin, a quote, a word fact or a phrase, in large letters.
2. **Lesson.** One short paragraph that teaches something about it.
3. **The question.** The paragraph turns hard to read, and the video asks "Find this difficult to read?"
4. **The change.** The same letters move into a reading font from the app. Bold word starts, the colour overlay and the reading ruler follow in some videos.
5. **Close.** One line and the Easy Reader name.

The videos teach first. The app only appears once the viewer has felt the problem it solves.

## Use it

```sh
cd tools/video
npm install
npm run build                       # makes dist/player.html: open it to browse and play all 100
node render.mjs list                # every variant with its tag
node render.mjs render ER-001       # one video
node render.mjs render 1-10         # a range
node render.mjs render font=lexend  # every video with one setting
node render.mjs render all --link https://example.com/easy-reader
node render.mjs stills 41-60        # five still frames each, for a quick look
node render.mjs manifest            # rewrites manifest.csv, results-template.csv and IDEAS.md
npm test
```

Rendering needs `ffmpeg` and Playwright's Chromium. A 20 second video takes about a minute; all 100 take about two hours with `--jobs 3`.
Videos are 1080x1920 at 30 frames a second with a silent audio track, so music or a voice can be added in an editor.
`--size 1080x1350` and other sizes scale the text layer to fit and fill the rest with the background.

## Where the style comes from

Neither the DaVinci folder nor the Emotion Shaper repository had a Three.js script, so this one borrows the two video styles that were there:

- **Emotion Shaper videos** (`tools/video` in that repository). Every frame is a pure function of the timeline and the time, drawn in headless Chromium and piped to ffmpeg. Same here: `player.frame(t)` has no clocks and all randomness is seeded, so a video is identical every time it renders. The navy theme, the safe areas for TikTok, Reels and Shorts, the pill at the end and the rule that quotes must be checked all come from there.
- **DaVinci captions** (`caption_style_spec.md`). A large pastel line, a small white line of connecting words, then a large pastel line, with the eight pastels. The hook of every video is laid out this way.

## How the script works

`src/scene.js` exports `createPlayer(THREE, canvas, variant)`, which returns `{ duration, frame(t) }`.

Every letter is its own textured plane in 3D. A layout places those letters in one font. Because a letter keeps its place in the list across layouts of the same text, the script can slide each one to its new position while its glyph cross-fades to the new font. That is how plain text becomes cramped text and then OpenDyslexic. Bold word starts use the app's own rule from `packages/core/src/bionic.ts`, and the fonts are the app's own font files.

| File | What it holds |
|---|---|
| `src/ideas.js` | The 100 ideas: headline, connecting words, landing words and the lesson |
| `src/design.js` | The settings, how they are dealt across the videos, the tag format and the timeline |
| `src/scene.js` | The Three.js script |
| `src/page.js`, `src/shell.html` | The page that previews the videos and that the renderer drives |
| `render.mjs` | Renders videos and writes the manifest |
| `analyse.mjs` | Compares results by setting |
| `IDEAS.md` | The 100 ideas with their settings (generated) |
| `manifest.csv` | The same as a spreadsheet (generated) |

## The experiment

Thirteen settings change between videos. `IDEAS.md` lists them with every level.

The type of lesson follows the idea. Every other setting is dealt out evenly and then shuffled with a fixed seed, so each level appears about the same number of times and no two settings always appear together. That makes it fair to compare the average result of each level of a setting.

### Tags

Each video has an id and a tag:

```
ER-011_wd-qn-dst-crm-mnt-glr-a3-sct-cn-all-c2-fst-psh
```

The tag is the id followed by one short code per setting, in the order of `DIMENSIONS` in `src/design.js`. `parseTag()` reads it back. The tag is used in four places so a video can always be traced:

- the file name of the video
- the `title` and `comment` stored inside the mp4
- the `.json` file written beside it, with every setting and the timeline
- the tracking link in the `.txt` post caption, when `--link` is given: `utm_content` is the id and `utm_term` is the whole tag

### Recording results

Copy `results-template.csv`, and fill in one row per video per platform from that platform's own analytics. Then:

```sh
node analyse.mjs results.csv                      # share of people who watch past 3 seconds
node analyse.mjs results.csv --metric completion  # or avg_watch, share, save, click, install
```

It prints the average for each level of each setting, with a standard error, and says whether one level clearly leads.

Keep in mind when reading it:

- Post the videos the same way: same account, similar times, no paid boost on some and not others. Otherwise the differences measure the posting, not the video.
- 100 videos can show which single settings matter. They cannot show which combinations work best. Take the leading levels, build a second, smaller round from them, and test that before spending on adverts.
- Views per video on a new account vary a lot by luck. Rates such as hold and completion are steadier than raw views.

## Before posting

- **Quotes.** All 20 are public domain and written from memory of the standard texts. Each is marked `v: false` in `src/ideas.js` and listed as `quote_checked: no` in the manifest until someone checks the wording against the full text. The renderer prints a reminder.
- **Facts.** Etymologies and word facts are stated with the usual hedges where the origin is disputed. Worth one read-through by a person before they go out.
- **The hard-to-read styles** show cramped, crowded, faint, glaring or drifting text. They are pictures of effort, not a simulation of dyslexia, and the videos never say otherwise.
- **Claims.** The closing lines say what the app does. They make no promise about prices, platforms or results.
