"""
Easy Reader - make one video in Blender.

TWO WAYS TO RUN IT (full steps in README.md):

  A) Look at it first, inside Blender:
     Open Blender > Scripting tab > Open > make_video.py > change SETTINGS below > press Run Script (the play button).
     The scene is built. Press Space in the viewport to play it, or Render > Render Animation to make the video.

  B) Render straight to a video, from a terminal (Command Prompt on Windows):
     blender -b -P make_video.py -- --style paper --idea 12
     Other options: --engine cycles   --quality preview   --out D:/videos   --still 300   --save

Nothing here needs the internet. Fonts and ideas are in this folder.
"""
import os
import sys
import json

# ---------------------------------------------------------------------------------------------
# SETTINGS - change these when running from the Scripting tab. The command line overrides them.
# ---------------------------------------------------------------------------------------------
SETTINGS = {
    'style': 'paper',     # paper, clay, glass, desk, kinetic, lantern
    'idea': 12,           # 1 to 100, the row in ideas.csv (12 = komorebi)
    'engine': 'eevee',    # eevee (fast) or cycles (slower, more realistic light)
    'quality': 'final',   # final (1080x1920) or preview (540x960, fewer samples)
    'out': '',            # folder for the video. Empty = a "renders" folder next to this script
    'render': False,      # True = render the video as soon as it is built (Scripting tab only)
    'still': None,        # a frame number to render as one PNG instead of the video, or 'key' for 6 key moments
    'save': False,        # also save the built scene as a .blend file next to the video
    'frames': '',         # only render part of the video, e.g. '1-120' for the first 4 seconds (a quick test)
}
# ---------------------------------------------------------------------------------------------

HERE = os.path.dirname(os.path.abspath(__file__)) if '__file__' in globals() else os.getcwd()
if not os.path.exists(os.path.join(HERE, 'easyreader')):
    # Run from Blender's text editor: __file__ is the text block, so use its file path instead
    import bpy
    for t in bpy.data.texts:
        if t.filepath and t.filepath.endswith('make_video.py'):
            HERE = os.path.dirname(bpy.path.abspath(t.filepath))
if HERE not in sys.path:
    sys.path.insert(0, HERE)

import bpy  # noqa: E402
import importlib  # noqa: E402
import easyreader  # noqa: E402
from easyreader import common, story, styles  # noqa: E402

# Pick up edits when you press Run Script again in Blender
for _m in (common, story):
    importlib.reload(_m)
importlib.reload(importlib.import_module('easyreader.styles.base'))
importlib.reload(styles)


def parse_args(settings):
    s = dict(settings)
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    i = 0
    while i < len(argv):
        a = argv[i].lstrip('-').replace('-', '_')
        if a in ('save', 'render'):
            s[a] = True
            i += 1
            continue
        if a not in s:
            raise SystemExit(f'Unknown option --{a}. Options: ' + ', '.join('--' + k for k in s))
        v = argv[i + 1]
        s[a] = int(v) if a == 'idea' or (a == 'still' and v.isdigit()) else v
        i += 2
    s['background'] = bpy.app.background
    return s


def make(s):
    style = styles.get(s['style'])
    idea = common.get_idea(int(s['idea']))
    scene = common.reset_scene()
    tl = common.Timeline(idea, fps=style.fps)
    ctx = story.build(idea, style, tl, seed=1000 + int(s['idea']))
    tag = f"{idea['tag']}-bl-{style.code}"
    out_dir = s['out'] or os.path.join(HERE, 'renders')
    os.makedirs(out_dir, exist_ok=True)
    out = os.path.join(out_dir, tag)
    common.setup_render(scene, tl, s['engine'], s['quality'], out, view=style.view, samples=style.samples)
    if style.bloom:
        common.bloom(scene)
    scene.frame_set(1)
    info = {
        'tag': tag, 'id': idea['id'], 'style': style.name, 'style_code': style.code, 'engine': s['engine'],
        'blender': bpy.app.version_string, 'seconds': round(tl.end / tl.fps, 1), 'fps': tl.fps,
        'headline': idea['headline'], 'font': idea['font'], 'feat': idea['feat'], 'accent': idea['accent'],
        'ask': idea['ask'], 'cta': idea['cta'], 'hard': idea['hard'], 'pace': idea['pace'],
    }
    scene['easyreader'] = json.dumps(info)
    print(f"[easyreader] built {tag}: {style.name}, {info['seconds']} s, {tl.end} frames")
    return scene, tl, out, info


def key_frames(tl):
    """One frame from each act: hook, lesson, hard + question, reading font, last feature, close."""
    fs = [tl.lesson_in - 8, tl.hard_in - 10, tl.reveal_in - 6, tl.reveal_out + 30]
    fs.append(tl.features[-1][2] - 12 if tl.features else tl.cta_in - 12)
    fs.append(tl.end - 10)
    return fs


def main():
    s = parse_args(SETTINGS)
    scene, tl, out, info = make(s)
    if s['frames']:
        a, b = (int(x) for x in s['frames'].split('-'))
        scene.frame_start, scene.frame_end = a, min(b, scene.frame_end)
    if s['save']:
        bpy.ops.wm.save_as_mainfile(filepath=out + '.blend')
    if s['still'] is not None:
        im = scene.render.image_settings
        if hasattr(im, 'media_type'):
            im.media_type = 'IMAGE'
        im.file_format = 'PNG'
        frames = key_frames(tl) if s['still'] == 'key' else [int(s['still'])]
        for f in frames:
            scene.frame_set(f)
            scene.render.filepath = f"{out}_f{f:04d}.png"
            bpy.ops.render.render(write_still=True)
            print('[easyreader] wrote', scene.render.filepath)
        return
    if s['background'] or s['render']:
        with open(out + '.json', 'w', encoding='utf-8') as f:
            json.dump(info, f, indent=2)
        bpy.ops.render.render(animation=True)
        # Blender adds the frame range to video names (tag0001-0900.mp4). Tidy it to tag.mp4.
        folder, base = os.path.split(out)
        for fn in os.listdir(folder):
            if fn.startswith(base) and fn.endswith('.mp4') and fn != base + '.mp4':
                os.replace(os.path.join(folder, fn), out + '.mp4')
        print('[easyreader] wrote', out + '.mp4')


if __name__ == '__main__':
    main()
