# Styles for the Easy Reader Blender videos

Research notes (November 2026), the six styles built in this folder, more style ideas to try next, and how
to use AI with Blender to make new ones.

## What the research says

### Styles that are working in short-form video now

Motion-design trend round-ups for 2025-26 agree on a handful of looks:

- **Hand-made and tactile**: visible texture and small imperfections; paper, card, fabric, clay. A reaction
  against glossy, obviously AI-generated imagery. ([GarageFarm](https://garagefarm.net/blog/animation-trends-to-watch))
- **Stop-motion-inspired 3D**: clay-like surfaces, puppet-like movement held for two frames, miniature sets. ([GarageFarm](https://garagefarm.net/blog/animation-trends-to-watch))
- **Cut-out craft and mixed-media collage**: scanned paper, card and torn edges. ([Graphic Design Junction](https://graphicdesignjunction.com/2026/01/video-and-motion-creative-trends-2026/))
- **Typography as the main visual (kinetic type)**: on a muted phone the words are the video. ([Graphic Design Junction](https://graphicdesignjunction.com/2026/01/video-and-motion-creative-trends-2026/), [Bottle Rocket](https://bottlerocketmedia.net/animation-and-motion-graphics-trends/))
- **Liquid glass and glossy, refractive surfaces**, plus "oddly satisfying" motion and real-time rendering. ([GarageFarm](https://garagefarm.net/blog/animation-trends-to-watch))
- **Vertical-first, short loops and calm "ambient" pieces** alongside fast ads. ([Graphic Design Junction](https://graphicdesignjunction.com/2026/01/video-and-motion-creative-trends-2026/))

### What people are doing with AI and Blender

- **Blender MCP** (community, about 36k GitHub stars) lets Claude or another AI drive a running Blender: a small
  add-on opens a local connection and the AI sends Python that builds and changes the scene, takes looks at the
  viewport, and pulls free models from Poly Haven or AI model generators. ([GitHub](https://github.com/ahujasid/mcp-for-blender))
- **Anthropic's official Blender connector** for Claude launched on 28 April 2026 as part of "Claude for Creative
  Work". ([9to5Mac](https://9to5mac.com/2026/04/28/anthropic-releases-9-new-claude-connectors-for-creative-tools-including-blender-and-adobe/), [Claude tutorial](https://claude.com/resources/tutorials/using-the-blender-connector-in-claude))
- **What it is good at**: laying out scenes, materials and lighting, repetitive edits, writing scripts and
  tools, and fixing broken scenes. **Where it falls short**: organic characters, clean topology and texturing,
  and long sessions on complex scenes. The common pattern is AI-generated "hero" models plus AI-written scripts
  to assemble and animate them. ([3D AI Studio](https://www.3daistudio.com/3d-generator-ai-comparison-alternatives-guide/blender-mcp), [Bunpav](https://bunpav.com/blog/claude-blender-mcp-agentic-scene-generation))
- A widely shared July 2026 example had Claude build, render and relight a horror-corridor scene over several
  passes; its author said it was not made by Claude alone, and the human art direction mattered. ([Bunpav](https://bunpav.com/blog/claude-blender-mcp-agentic-scene-generation))
- **Caution**: these connections run whatever Python the AI writes on your machine, so only use them on a computer
  and files you are happy for it to change, and keep the connection local. ([GitHub](https://github.com/ahujasid/mcp-for-blender))

**What that means for these videos**: an AI driving Blender live is great for *finding* a look, but each run is a
bit different. For 100 comparable ad variants you want the opposite: the same script gives the same video every
time, and only the tagged settings change. So the styles here are fixed scripts, and the AI connector is the tool
for sketching new styles, which then get written down as a new style file (prompts below).

### Dyslexia-friendly design, which the videos act out

Dyslexia style guides (for example the British Dyslexia Association's) ask for plain sans-serif fonts, larger
text, 1.5 line spacing, left-aligned text, cream or pastel backgrounds instead of bright white, and no italics or
dense blocks. ([BDA style guide via Ako Aotearoa](https://ako.ac.nz/assets/Knowledge-centre/ALNACC-Resources/Dyslexia-resources/230907-Dyslexia-Friendly-Style-Guide.pdf), [Dyslexia Scotland](https://dyslexiascotland.org.uk/dyslexia-friendly-typed-formats))
The "hard to read" act breaks those rules on purpose (thin serif, tight lines, glare, low contrast) and the
change puts every one of them back. The easy page uses 1.6 line spacing, wide word gaps and left alignment.

## The six styles

All six share the same text, timing and features; only the look and motion differ. Each links back to a theme of the app.

### 1. Paper cut (`paper`)

Letters cut from thick white card float just above a deep blue card. Wavy cut-paper hills in the idea's pastel sit
at different depths at the top and bottom, swaying a little and casting soft shadows. Small paper leaves drift down.
Each word flips over like a paper tab, line by line, into the reading font. The overlay is a sheet of tissue paper.
**Theme**: books and pages; the "hand-made" trend. **Best for**: word and origin ideas.

### 2. Clay (`clay`)

Chunky plasticine letters with a finger-pressed surface on a slate-blue clay board, coloured clay pebbles around
the edges. Everything moves "on twos" at 24 fps with a slight wobble, like real stop-motion. Words squash flat and
pop up again in the reading font. **Theme**: friendly, playful, unintimidating; good for parents and children.
**Best for**: phrases and fun facts.

### 3. Coloured glass (`glass`)

Crisp white words on near-black with soft pools of pastel light far behind and small tinted glass tiles turning in
the dark. A tall bar of pastel glass glides across the page; each word it passes comes out in the reading font. The
overlay is a full sheet of tinted glass. **Theme**: the colour overlay feature, made physical. **Best for**: showing
the tint feature; looks best with `--engine cycles`.

### 4. Reading nook (`desk`)

A cream sheet of paper on a wooden desk, a desk lamp from the top left, a mug and pencil at the edges and dust in
the light. The words are ink on the page. Each line of ink sinks into the paper and grows back in the reading font.
The overlay is a real plastic reading overlay laid on the page and the ruler is a plastic reading strip, the tools
many dyslexic readers already own. **Theme**: "the overlay and ruler you know, now on every screen". **Best for**
the `tint`, `ruler` and `all` ideas, and for parents and teachers.

### 5. Bold type (`kinetic`)

Flat navy screen, words that pop in with overshoot, diagonal pastel colour wipes between acts, a camera that punches
in and out, and faint rings and dots drifting behind. A pastel bar wipes along each line; when it pulls away the line
is in the reading font. **Theme**: the words themselves. **Best for**: quotes and paid ads; it is also by far the
quickest to render, so it is the one to make all 100 of first.

### 6. Night light (`lantern`)

Deep plum night, words of soft warm light with a slight glow, fireflies drifting. While the page is hard to read, it
flickers like a failing bulb. Then a small lantern floats along each line and every word it passes lights up steadily
in the reading font. Slow and calm. **Theme**: light from darkness, "it finally makes sense". **Best for**: the
calmer, longer ideas (quotes, beautiful words) and bedtime-reading audiences.

## How to compare them

The tag of every Blender video ends in `-bl-<style>`, so in the results sheet you can group by style exactly like
the lab groups by `scene` or `theme`. A sensible first test:

1. Render idea 12 (komorebi) in all six styles with `--still key --quality preview` and pick the 3 you like.
2. Render 10 ideas in each of those 3 styles (30 videos), run them as ads, and compare by style.
3. Render all 100 in the winning style.

## More styles to try next

Not built yet, but each would be one new file in `easyreader/styles/`:

- **Chalkboard (Grease Pencil)**: hand-drawn chalk lines on a green board; the hard text is scrawled, the easy text is
  "rewritten" neatly. Uses Blender's Grease Pencil, the hybrid 2D/3D look from the trend reports.
- **Ink in water**: the hard text dissolves like ink in a glass of water and the reading font settles out of it
  (Blender fluid simulation; slow to bake, striking result).
- **Letter garden**: Geometry Nodes grows the easy words out of the ground like plants while the hard words wilt.
  "Oddly satisfying" growth motion.
- **Library at dusk**: a camera fly-through of tall shelves that stops on one open book (needs a few library models,
  e.g. from Poly Haven).
- **Retro film**: Super-8 grain, gate weave and light leaks over a warm reading scene, for an older audience.
- **Pop-up book**: the paper style extended so each act folds up out of a book spread.

## Prompts for making a new style with AI in Blender

With Claude's Blender connector (or Blender MCP) running, open this folder's `make_video.py`, run it once so the
scene exists, then ask for changes. These prompts are written to keep the result usable as a style file:

> I am making 9:16 videos for a dyslexia reading app called Easy Reader. Run `make_video.py` from
> `C:\EasyReader\blender` with style `kinetic` and idea 12 so the scene is built. Do not change the text objects,
> their timing or the Timeline. Only change the background, lights, camera and materials so the video looks like
> **[describe the look]**. Keep text readable: high contrast, nothing busy behind the lesson text. Render frames
> 100, 400 and 600 as PNG so I can see them.

> That works. Now write it up as a new style file `easyreader/styles/<name>.py` that subclasses `Style` from
> `styles/base.py`, following the pattern of `paper.py`: a docstring describing the look, `palette`,
> `build_world()`, `material()`, `reveal()` and `extras()`. Add it to `STYLES` in `styles/__init__.py` and render
> `--still key --quality preview` for idea 12 to check it.

> Make a variation of the `desk` style where it is night: the only light is the desk lamp, the window is dark blue,
> and the dust is more visible. Keep everything else the same.

Looks to describe in **[describe the look]**: "felt and fabric, like a children's quiet book"; "a watercolour wash
that blooms behind each line"; "letters made of folded origami paper"; "neon signs in the rain, but calm";
"a sunlit library with dust in the air"; "embroidered letters stitched onto linen".
