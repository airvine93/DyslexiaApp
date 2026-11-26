# Easy Reader videos in Blender

Six Blender scripts ("styles") that turn any of the 100 video-lab ideas into a 9:16 video for Reels, TikTok
and Shorts. Every style tells the same story as the Three.js lab, so results stay comparable:

1. **Hook**: the word, quote or fact in the pastel rule (big pastel / small white / big pastel)
2. **Lesson**: the explanation, set like an ordinary book page
3. **Hard to read**: the page turns cramped, crowded, faint, glaring or swimming, and a question appears
4. **The change**: every word changes into the idea's reading font (OpenDyslexic, Lexend, Atkinson Hyperlegible, Andika, Comic Neue or Readex Pro)
5. **Features**: bold word starts, colour overlay and/or reading ruler, as set in the idea
6. **Close**: closing line and an "Easy Reader" pill

The words, font, features, question, closing line, pastel colour, "hard" effect and pace all come from
`ideas.csv` (a copy of the lab's `manifest.csv`). The style decides only the look and the motion.
See [STYLES.md](STYLES.md) for the research, what each style looks like and why it was chosen.

| Style | Name | Look | Speed (EEVEE) |
|---|---|---|---|
| `paper` | Paper cut | Layered craft paper, cut-paper hills, words flip like paper tabs | medium |
| `clay` | Clay | Chunky plasticine letters, stop-motion "on twos" at 24 fps | medium |
| `glass` | Coloured glass | White words on black, a pastel glass bar sweeps the page | medium |
| `desk` | Reading nook | A real page on a wooden desk, lamp light, plastic overlay and ruler | slowest |
| `kinetic` | Bold type | Flat motion graphics, colour wipes, camera punches | fastest |
| `lantern` | Night light | Glowing words, fireflies, a lantern lights each line | medium |

---

## What you need on the desktop

- **Blender 5.2 LTS** (free) from <https://www.blender.org/download/lts/>. I wrote and tested everything on
  Blender 5.2.5. It should also work on 4.2 to 5.3; if something breaks on another version, use 5.2.
- **This folder**, `tools/blender`, copied as a whole (it holds the fonts and the ideas). Nothing needs the internet.
- **A graphics card** helps a lot. Any recent NVIDIA, AMD or Intel Arc card is fine. It works without one, just slowly.

No add-ons, no Python installs, no fonts to install in Windows. The fonts are loaded straight from `fonts/`.

## Step 1: get the folder onto the desktop

Either:

- **With GitHub Desktop or git**: clone `airvine93/DyslexiaApp` and open `tools\blender`, or
- **Without git**: on GitHub open the repository, press **Code > Download ZIP**, unzip it, and open
  `DyslexiaApp-main\tools\blender` (or the branch name, until this is merged).

Put it somewhere short, for example `C:\EasyReader\blender`. Short paths with no odd characters avoid trouble.

## Step 2: try one inside Blender (to see it, no rendering yet)

1. Open Blender. Close the splash screen.
2. At the top, click the **Scripting** tab.
3. In the text editor (middle), click **Open** and choose `make_video.py` from the folder.
4. Near the top of the script, find `SETTINGS` and change `'style'` and `'idea'` if you like. Leave `'render': False`.
5. Click the **Run Script** button (the ▶ play icon above the text) or press **Alt+P** with the mouse over the text.
6. Click the **Layout** tab. Press **Numpad 0** with the mouse over the 3D view to look through the camera, and
   switch the view to **Rendered** (the right-most of the four round buttons at the top right of the 3D view).
7. Press **Space** to play. It will be slow in the viewport; that is normal. Drag the timeline to scrub.

You can now change anything by hand (colours, lights, camera) and render it with **Render > Render Animation**
(**Ctrl+F12**). The video goes to `renders\` next to the script.

If you see "No module named easyreader", the script was not opened from the folder. Use **Open** in step 3
rather than copy-pasting the text.

## Step 3: render a video from a terminal (faster, and Blender's window can stay closed)

1. Open the folder in File Explorer, click the address bar, type `cmd` and press Enter. A Command Prompt opens in the folder.
2. Paste this, changing the Blender path if yours differs (check `C:\Program Files\Blender Foundation\`):

   ```bat
   "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" -b -P make_video.py -- --style kinetic --idea 12
   ```

3. Wait. It prints each frame. The video lands in `renders\`, for example
   `renders\ER-012_wd-qn-orb-ink-mnt-fnt-a1-mor-lx-ft-c4-fst-stl-bl-kin.mp4`, with a `.json` of its settings beside it.

Useful extras (add after `--`):

| Option | What it does |
|---|---|
| `--style paper` | `paper`, `clay`, `glass`, `desk`, `kinetic` or `lantern` |
| `--idea 47` | Which idea, 1 to 100 (the row in `ideas.csv`, same numbers as the lab) |
| `--quality preview` | Half size (540x960) and fewer samples: about 4 times faster, for checking |
| `--still key` | Six PNG stills, one from each act, instead of the video. The quickest way to judge a style |
| `--still 300` | One PNG of frame 300 |
| `--frames 1-120` | Only render the first 120 frames (4 seconds) |
| `--engine cycles` | Use Cycles instead of EEVEE: slower, softer and more realistic light (best for `glass`, `desk`, `clay`) |
| `--out D:\videos` | Put the files somewhere else |
| `--save` | Also save the built scene as a `.blend` you can open and tweak |

**Suggested first run**: six stills of each style for one idea, about 1 to 3 minutes per style:

```bat
for %s in (paper clay glass desk kinetic lantern) do "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" -b -P make_video.py -- --style %s --idea 12 --still key --quality preview
```

Or just double-click **`render_samples.bat`** in the folder (edit its first line if Blender is somewhere else).

## Step 4: render lots at once

`batch.py` renders many videos one after another, skips any that already exist, and keeps a log in
`renders\batch-log.csv`:

```bat
"C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" -b -P batch.py -- --styles all --ideas 12
"C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" -b -P batch.py -- --styles kinetic --ideas 1-100
"C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" -b -P batch.py -- --styles paper,glass --ideas 1-10,47,66 --quality preview
```

You can stop it with **Ctrl+C** and run the same line again later; it carries on where it stopped.

### How long will it take?

Rough guide for one 25 to 45 second video at full size, on a mid-range graphics card (for example an RTX 3060):

| | EEVEE (default) | Cycles |
|---|---|---|
| `kinetic` | 3 to 8 min | 20 to 40 min |
| `paper`, `clay`, `glass`, `lantern` | 8 to 20 min | 1 to 3 hours |
| `desk` | 10 to 25 min | 2 to 4 hours |

All six styles of one idea in EEVEE is roughly an hour or two. All 100 ideas in `kinetic` is an overnight job.
Without a graphics card multiply EEVEE times by about 5. Time the first one and scale from there.

### Render settings used

- 1080 x 1920, 30 fps (24 fps for `clay`), H.264 MP4 with no sound, "High" quality
- EEVEE: 64 samples (8 for `kinetic`). Cycles: 160 samples with denoising, using the graphics card when it finds one
- Colour: "Standard" view transform, so the pastel colours come out exactly as the hex values in the lab

Change these in `easyreader/common.py`, `setup_render()`.

## How the tag works

Each file is named with the lab's tag plus `-bl-` and a style code, so the Blender videos can go into the same
results sheet as the Three.js ones:

`ER-012_wd-qn-orb-ink-mnt-fnt-a1-mor-lx-ft-c4-fst-stl` **`-bl-kin`**

In a Blender video the `scene`, `theme`, `reveal` and `cam` letters of the tag are replaced by the style;
everything else (type, hook, accent, hard, ask, font, feat, cta, pace) still means what it means in the lab.
Style codes: `ppr` paper, `cly` clay, `gls` glass, `dsk` reading nook, `kin` bold type, `ltn` night light.

## What is in the folder

```
make_video.py         one video (or stills) - run this
batch.py              many videos
render_samples.bat    double-click: key stills of every style for idea 12
ideas.csv             the 100 ideas and their tags (copy of the lab's manifest.csv)
fonts/                the six reading fonts, a light serif for the "hard" page, and their licences (all free to use)
easyreader/
  common.py           text layout, timing, materials, render settings (shared)
  story.py            the six acts, the same for every style
  styles/base.py      default look and motion that each style builds on
  styles/paper.py ... one file per style
STYLES.md             research notes, the six styles, ideas for more, and prompts for AI-assisted Blender
```

## Changing things

- **Words**: edit `ideas.csv` (or re-copy the lab's `manifest.csv` after changing `tools/video/src/ideas.js`).
- **A style's colours, lights or motion**: each style file starts with a description, then plain settings:
  `palette` for colours, `build_world()` for background, lights and camera, `reveal()` for the change into the
  reading font, `extras()` for the background motion.
- **A new style**: copy `styles/kinetic.py` to a new name, change `code` and `name`, and add the name to
  `STYLES` in `styles/__init__.py`.
- **Timing**: `Timeline` in `common.py` (seconds per act, scaled by the idea's pace).

## If something goes wrong

| Problem | Fix |
|---|---|
| `'blender' is not recognized` | Use the full path in quotes, as in the examples above |
| `Unknown style` / `Idea N does not exist` | Check the spelling; ideas are 1 to 100 |
| `Missing font file` | The `fonts` folder did not come across. Copy the whole `tools/blender` folder |
| Video is black or text missing | Try `--engine cycles`. If that works, update your graphics driver for EEVEE |
| Very slow | Use `--quality preview` while choosing, or `--engine eevee` (the default) |
| Out of GPU memory in Cycles | Close other apps, or use EEVEE |
| Something else | Run with `--still key` and look at the six PNGs, then send me the last lines of the terminal |
