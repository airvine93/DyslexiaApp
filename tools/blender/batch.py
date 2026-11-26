"""
Easy Reader - render many videos in one go.

Run from a terminal (Command Prompt on Windows), from this folder:

  blender -b -P batch.py -- --styles all --ideas 12
  blender -b -P batch.py -- --styles kinetic --ideas 1-100
  blender -b -P batch.py -- --styles paper,clay --ideas 1-10,47,66 --quality preview

Each video is rendered by its own fresh Blender, so one failure does not stop the rest, and videos that
already exist are skipped (delete one to render it again). A log of what happened goes in renders/batch-log.csv.
"""
import os
import subprocess
import sys
import time
import csv

import bpy

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from easyreader import common  # noqa: E402
from easyreader.styles import STYLES  # noqa: E402


def parse_list(text, allowed=None):
    out = []
    for part in text.split(','):
        part = part.strip()
        if not part:
            continue
        if allowed is not None:
            out.extend(allowed if part == 'all' else [part])
        elif '-' in part:
            a, b = part.split('-')
            out.extend(range(int(a), int(b) + 1))
        elif part == 'all':
            out.extend(range(1, len(common.load_ideas()) + 1))
        else:
            out.append(int(part))
    return out


def main():
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    opts = {'styles': 'all', 'ideas': '12', 'engine': 'eevee', 'quality': 'final', 'out': os.path.join(HERE, 'renders')}
    for i in range(0, len(argv) - 1, 2):
        k = argv[i].lstrip('-')
        if k not in opts:
            raise SystemExit(f'Unknown option --{k}. Options: ' + ', '.join('--' + o for o in opts))
        opts[k] = argv[i + 1]
    styles = parse_list(opts['styles'], STYLES)
    ideas = parse_list(opts['ideas'])
    rows = common.load_ideas()
    os.makedirs(opts['out'], exist_ok=True)
    log_path = os.path.join(opts['out'], 'batch-log.csv')
    new_log = not os.path.exists(log_path)
    jobs = [(s, n) for n in ideas for s in styles]
    print(f'[batch] {len(jobs)} videos: styles {", ".join(styles)}; ideas {opts["ideas"]}')
    with open(log_path, 'a', newline='', encoding='utf-8') as lf:
        log = csv.writer(lf)
        if new_log:
            log.writerow(['when', 'style', 'idea', 'file', 'result', 'minutes'])
        for k, (style, n) in enumerate(jobs, 1):
            mod = __import__(f'easyreader.styles.{style}', fromlist=['STYLE'])
            tag = f"{rows[n - 1]['tag']}-bl-{mod.STYLE.code}"
            target = os.path.join(opts['out'], tag + '.mp4')
            if os.path.exists(target):
                print(f'[batch] {k}/{len(jobs)} skip, already done: {tag}')
                continue
            print(f'[batch] {k}/{len(jobs)} rendering {tag}')
            t = time.time()
            cmd = [bpy.app.binary_path, '-b', '--factory-startup', '-P', os.path.join(HERE, 'make_video.py'), '--',
                   '--style', style, '--idea', str(n), '--engine', opts['engine'], '--quality', opts['quality'],
                   '--out', opts['out']]
            res = subprocess.run(cmd)
            ok = res.returncode == 0 and os.path.exists(target)
            mins = round((time.time() - t) / 60, 1)
            log.writerow([time.strftime('%Y-%m-%d %H:%M'), style, n, os.path.basename(target), 'ok' if ok else 'FAILED', mins])
            lf.flush()
            print(f'[batch] {"done" if ok else "FAILED"} in {mins} min: {tag}')


main()
