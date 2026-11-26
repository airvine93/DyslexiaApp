"""
The default look and motion. Each style in this folder starts from `Style` and changes only what makes it different.

Coordinates: the camera looks at a 9 x 16 page (x from -4.5 to 4.5, y from -8 to 8). 1 unit = 120 pixels.
All text sits on z = 0 inside `ctx.page`, so a style can tilt or move the whole page (for example onto a book).
"""
import math
from .. import common as C

TINY = (1e-4, 1e-4, 1e-4)
ONE = (1.0, 1.0, 1.0)


class Style:
    code = 'base'           # short code added to the video tag, e.g. ER-012_..._bl-ppr
    name = 'Base'
    fps = 30
    view = 'Standard'       # colour view transform. Standard keeps the pastel hex colours exact; AgX looks more photographic.
    palette = {'bg': '#0E1726', 'text': '#F5EFE6', 'muted': '#C9C1B4'}
    appear_kind = 'rise'    # default entrance for words
    fade_lesson = False
    samples = None          # override render samples
    bloom = False

    # ----------------------------------------------------------------------------- world
    def build_world(self, ctx):
        C.world(ctx.bg)
        ctx.camera = C.camera()
        ctx.page = C.empty('Page')
        bgm = C.emissive('Background', ctx.bg, 1.0)
        C.plane('Background', 12, 20, bgm, None, loc=(0, 0, -2))

    def material(self, ctx, role, color):
        return C.emissive('Text.' + role, color, 1.0)

    def text_props(self, role, size):
        """Extra settings for text objects: extrude, bevel."""
        return {}

    # ----------------------------------------------------------------------------- entrances and exits
    def appear(self, ctx, objs, frame, stagger=2, kind=None):
        kind = kind or self.appear_kind
        for i, o in enumerate(objs):
            f = frame + i * stagger
            home = C.value_at(o, 'location', f + 30)
            if kind == 'fade':
                C.key(o, 'scale', 0, TINY, 'CONSTANT')
                C.key(o, 'scale', f, TINY, 'CONSTANT')
                C.key(o, 'scale', f + 1, ONE, 'CONSTANT')
                C.keys(o, 'location', [(f + 1, (home[0], home[1] - 0.15, home[2])), (f + 14, home)], 'SINE', 'EASE_OUT')
                continue
            C.key(o, 'scale', 0, TINY, 'CONSTANT')
            if kind == 'pop':
                C.key(o, 'scale', f, TINY, 'BACK', 'EASE_OUT')
                C.key(o, 'scale', f + 12, ONE)
            elif kind == 'drop':
                C.key(o, 'scale', f, ONE, 'CONSTANT')
                C.keys(o, 'location', [(0, (home[0], home[1] + 9, home[2])), (f, (home[0], home[1] + 9, home[2]))], 'CONSTANT')
                C.key(o, 'location', f, (home[0], home[1] + 9, home[2]), 'BOUNCE', 'EASE_OUT')
                C.key(o, 'location', f + 22, home)
            elif kind == 'flip':
                C.key(o, 'scale', f, ONE, 'CONSTANT')
                C.keys(o, 'rotation_euler', [(0, (math.radians(-90), 0, 0)), (f, (math.radians(-90), 0, 0))], 'CONSTANT')
                C.key(o, 'rotation_euler', f, (math.radians(-90), 0, 0), 'BACK', 'EASE_OUT')
                C.key(o, 'rotation_euler', f + 14, (0, 0, 0))
            else:  # rise
                C.key(o, 'scale', f, TINY, 'BACK', 'EASE_OUT')
                C.key(o, 'scale', f + 12, ONE)
                C.keys(o, 'location', [(0, (home[0], home[1] - 0.5, home[2])), (f, (home[0], home[1] - 0.5, home[2]))], 'CONSTANT')
                C.key(o, 'location', f, (home[0], home[1] - 0.5, home[2]), 'BACK', 'EASE_OUT')
                C.key(o, 'location', f + 14, home)

    def disappear(self, ctx, objs, frame, kind=None):
        for o in objs:
            C.key(o, 'scale', frame, C.value_at(o, 'scale', frame), 'BACK', 'EASE_IN')
            C.key(o, 'scale', frame + 10, TINY, 'CONSTANT')

    def exit_group(self, ctx, group, frame):
        home = C.value_at(group, 'location', frame)
        sc = C.value_at(group, 'scale', frame)
        C.key(group, 'location', frame, home, 'BACK', 'EASE_IN')
        C.key(group, 'location', frame + 14, (home[0], home[1] - 1.0, home[2]))
        C.key(group, 'scale', frame, sc, 'BACK', 'EASE_IN')
        C.key(group, 'scale', frame + 14, TINY, 'CONSTANT')

    # ----------------------------------------------------------------------------- the change into the reading font
    def reveal(self, ctx, old, easy, t0, t1):
        """Default: every word flips over like a card, line by line, and comes up in the reading font."""
        span = max(1, t1 - t0 - 14)
        n = max(1, len(old) - 1)
        for i, (o, w) in enumerate(zip(old, easy.words)):
            f = t0 + round(span * i / n)
            C.key(o, 'rotation_euler', f, (0, 0, 0), 'SINE', 'EASE_IN')
            C.key(o, 'rotation_euler', f + 6, (math.radians(90), 0, 0))
            C.key(o, 'scale', f + 6, C.value_at(o, 'scale', f), 'CONSTANT')
            C.key(o, 'scale', f + 7, TINY, 'CONSTANT')
            n_ = w.obj
            C.key(n_, 'scale', f + 6, TINY, 'CONSTANT')
            C.key(n_, 'scale', f + 7, ONE, 'CONSTANT')
            C.key(n_, 'rotation_euler', 0, (math.radians(-90), 0, 0), 'CONSTANT')
            C.key(n_, 'rotation_euler', f + 6, (math.radians(-90), 0, 0), 'BACK', 'EASE_OUT')
            C.key(n_, 'rotation_euler', f + 14, (0, 0, 0))

    def swap(self, ctx, old, new, frame):
        """Bold word starts: each word swaps for its bold-start twin with a small pulse, in a wave."""
        for i, (o, n_) in enumerate(zip(old, new)):
            f = frame + i
            C.key(o, 'scale', f, ONE, 'CONSTANT')
            C.key(o, 'scale', f + 1, TINY, 'CONSTANT')
            C.key(n_, 'scale', f, TINY, 'CONSTANT')
            C.key(n_, 'scale', f + 1, (1.12, 1.12, 1.12), 'SINE', 'EASE_OUT')
            C.key(n_, 'scale', f + 9, ONE)

    def swap_at(self, old, new, f, kind='pop', dur=8):
        """Hide one word and show its replacement at frame f."""
        C.key(old, 'scale', f, C.value_at(old, 'scale', f), 'CONSTANT')
        C.key(old, 'scale', f + 1, TINY, 'CONSTANT')
        C.key(new, 'scale', f, TINY, 'CONSTANT')
        if kind == 'pop':
            C.key(new, 'scale', f + 1, (0.6, 0.6, 0.6), 'BACK', 'EASE_OUT')
            C.key(new, 'scale', f + 1 + dur, ONE)
        elif kind == 'grow_y':
            C.key(new, 'scale', f + 1, (1, 0.05, 1), 'BACK', 'EASE_OUT')
            C.key(new, 'scale', f + 1 + dur, ONE)
        else:
            C.key(new, 'scale', f + 1, ONE, 'CONSTANT')

    def sweep_times(self, easy, t0, t1, by_line=False):
        """Frame at which each word changes when something sweeps across the page (left to right,
        or line by line when by_line=True)."""
        out = []
        n_lines = max(1, len(easy.lines))
        for w in easy.words:
            x = (w.home[0] + w.width / 2 + 4.5) / 9.0
            if by_line:
                u = (w.line + min(max(x, 0), 1)) / n_lines
            else:
                u = min(max(x, 0), 1)
            out.append(round(t0 + u * (t1 - t0)))
        return out

    def drifters(self, ctx, make, n, area=(10, 17), z=(-3, -0.5), drift=(0, 0.6), wobble=0.4, spin=True, seed=7):
        """Scatter n small objects made by make(i) and let them drift slowly for the whole video."""
        r = C.rand(seed)
        end = ctx.tl.end
        objs = []
        for i in range(n):
            o = make(i)
            x = r.uniform(-area[0] / 2, area[0] / 2)
            y = r.uniform(-area[1] / 2, area[1] / 2)
            zz = r.uniform(*z)
            dx = drift[0] * r.uniform(0.5, 1.5) * end / ctx.tl.fps / 10
            dy = drift[1] * r.uniform(0.5, 1.5) * end / ctx.tl.fps / 10
            C.key(o, 'location', 1, (x, y, zz), 'LINEAR')
            C.key(o, 'location', end, (x + dx, y + dy, zz), 'LINEAR')
            for k in range(2):
                C.add_noise(o, 'location', k, wobble, r.uniform(40, 90), phase=r.uniform(0, 100))
            if spin:
                rx, ry, rz = (r.uniform(-3, 3) for _ in range(3))
                C.key(o, 'rotation_euler', 1, (r.uniform(0, 6), r.uniform(0, 6), r.uniform(0, 6)), 'LINEAR')
                C.key(o, 'rotation_euler', end, (rx * end / 300, ry * end / 300, rz * end / 300), 'LINEAR')
            objs.append(o)
        return objs

    def camera_drift(self, ctx, amount=0.15, push=0.0):
        cam = ctx.camera
        loc = tuple(cam.location)
        C.key(cam, 'location', 1, loc, 'SINE')
        C.key(cam, 'location', ctx.tl.end, (loc[0], loc[1], loc[2] * (1 - push)), 'SINE')
        if amount:
            C.add_noise(cam, 'location', 0, amount, 120, phase=3)
            C.add_noise(cam, 'location', 1, amount, 140, phase=11)

    # ----------------------------------------------------------------------------- colour overlay
    overlay_z = 0.6         # how far in front of the text the colour overlay slides

    def overlay(self, ctx):
        m = C.tint_material('Overlay', ctx.accent, 0.08)
        return C.plane('Overlay', 9.4, 16.4, m, ctx.page, loc=(12, 0, self.overlay_z), round_corners=0.25)

    def overlay_in(self, ctx, ov, frame):
        z = self.overlay_z
        C.key(ov, 'location', 0, (12, 0, z), 'CONSTANT')
        C.key(ov, 'location', frame, (12, 0, z), 'CUBIC', 'EASE_OUT')
        C.key(ov, 'location', frame + 18, (0, 0, z))

    def overlay_out(self, ctx, ov, frame):
        z = self.overlay_z
        C.key(ov, 'location', frame, (0, 0, z), 'CUBIC', 'EASE_IN')
        C.key(ov, 'location', frame + 16, (-12, 0, z))

    # ----------------------------------------------------------------------------- reading ruler
    def ruler(self, ctx, easy, a, b):
        """A soft highlighted band steps down the lines while the lines around it dim."""
        size = easy.size
        lh = abs(easy.lines[1][0] - easy.lines[0][0]) if len(easy.lines) > 1 else size * 1.6
        bar_m, bar_z = self.ruler_bar(ctx)
        bar = C.plane('RulerBar', 8.4, lh * 0.98, bar_m, ctx.page, loc=(0, 0, bar_z), round_corners=0.2)
        dim_m = C.emissive('RulerDim', (0, 0, 0, 1), 1.0)
        for n in dim_m.node_tree.nodes:
            if n.type == 'MIX_SHADER':
                n.inputs[0].default_value = 0.5  # half-dark veil over the other lines
        top = C.plane('RulerTop', 12, 14, dim_m, ctx.page, loc=(0, 0, 0.3))
        bot = C.plane('RulerBottom', 12, 14, dim_m, ctx.page, loc=(0, 0, 0.3))
        self._ruler_motion(ctx, easy, bar, top, bot, lh, a, b)
        return bar

    def ruler_bar(self, ctx):
        """Material and z for the highlighted band. Default: a pastel band just behind the text."""
        return C.emissive('RulerBar', C.mix(ctx.bg, ctx.accent, 0.5), 1.0), -0.05

    def _ruler_motion(self, ctx, easy, bar, top, bot, lh, a, b):
        size = easy.size
        lines = easy.lines[:5]
        step = max(10, (b - a) // max(1, len(lines)))
        for o in (bar, top, bot):
            C.key(o, 'scale', 0, TINY, 'CONSTANT')
            C.key(o, 'scale', a, TINY, 'CONSTANT')
            C.key(o, 'scale', a + 1, ONE, 'CONSTANT')
            C.key(o, 'scale', b, ONE, 'CONSTANT')
            C.key(o, 'scale', b + 1, TINY, 'CONSTANT')
        for i, (y, x0, x1) in enumerate(lines):
            f = a + i * step
            cy = y + size * 0.33
            for o, oy in ((bar, cy), (top, cy + lh / 2 + 7), (bot, cy - lh / 2 - 7)):
                z = o['z'] if 'z' in o else o.location.z
                o['z'] = z
                C.key(o, 'location', f, (0, oy, z), 'CUBIC', 'EASE_IN_OUT')
                C.key(o, 'location', f + step - 8, (0, oy, z), 'CUBIC', 'EASE_IN_OUT')

    # ----------------------------------------------------------------------------- pill and extras
    def pill(self, ctx, parent, loc):
        e = C.empty('Pill', parent, loc)
        pm = C.emissive('Pill', ctx.accent, 1.0)
        C.plane('PillShape', 4.2, 1.0, pm, e, loc=(0, 0, -0.02), round_corners=0.5)
        tm = C.emissive('PillText', ctx.ink, 1.0)
        t = C.text_obj('PillText', 'Easy Reader', C.UI_FONT_BOLD, 0.5, tm, e, align='CENTER', **self.text_props('pill', 0.5))
        t.location = (0, -0.18, 0.01)
        return e

    def extras(self, ctx):
        """Ambient background motion. Override in a style."""

    def finish(self, ctx):
        """Last touches after everything is animated (camera moves, stepping, glow)."""
STYLE = Style()
