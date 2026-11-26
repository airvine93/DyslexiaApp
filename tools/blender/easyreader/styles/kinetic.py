"""
BOLD TYPE - flat, graphic kinetic typography.

Look: a flat navy screen, crisp words that pop in with a little overshoot, big pastel colour bars that wipe
across between acts, and a camera that 'punches' in and out. No lighting or 3D textures, so it renders
very fast and looks like a polished motion-graphics ad. For the change, a pastel bar wipes along each line;
when it pulls away, the line underneath is in the reading font.

Why: typography as the main visual is the dominant short-form ad style, and on a phone screen with the sound
off the words ARE the video. It is also the fastest style to render, so it is the one to make 100 of.
"""
import math
from .. import common as C
from .base import Style, TINY, ONE


class Kinetic(Style):
    code = 'kin'
    name = 'Bold type'
    view = 'Standard'
    palette = {'bg': '#0E1726', 'text': '#F5EFE6', 'muted': '#C9C1B4'}
    appear_kind = 'pop'
    samples = 8

    def build_world(self, ctx):
        C.world(ctx.bg)
        ctx.camera = C.camera(loc=(0, 0, 30), ortho=16)
        ctx.page = C.empty('Page')
        C.plane('Background', 30, 40, C.emissive('Background', ctx.bg), None, loc=(0, 0, -5))
        self.wipe_mats = [C.emissive(f'Wipe{i}', c) for i, c in enumerate(
            [ctx.accent, C.mix(ctx.accent, ctx.bg, 0.35), C.hexcol('#F5EFE6')])]

    def wipe(self, ctx, frame, direction=1):
        """Three diagonal colour bars sweep across the whole screen."""
        for i, m in enumerate(self.wipe_mats):
            b = C.plane(f'Wipe.{frame}.{i}', 30, 5.5, m, None, loc=(0, 0, 2 + i * 0.01))
            b.rotation_euler.z = math.radians(62 * direction)
            f = frame + i * 2
            start, end = (-26 * direction, -12), (26 * direction, 12)
            C.key(b, 'location', 0, (*start, b.location.z), 'CONSTANT')
            C.key(b, 'location', f, (*start, b.location.z), 'CUBIC', 'EASE_IN_OUT')
            C.key(b, 'location', f + 16, (*end, b.location.z))

    def reveal(self, ctx, old, easy, t0, t1):
        size = easy.size
        lh = abs(easy.lines[1][0] - easy.lines[0][0]) if len(easy.lines) > 1 else size * 1.6
        n = len(easy.lines)
        per = max(6, (t1 - t0 - 14) // max(1, n))
        bar_m = C.emissive('LineWipe', ctx.accent)
        for li, (y, x0, x1) in enumerate(easy.lines):
            x0, x1 = -4.1, 4.1
            w = x1 - x0
            f = t0 + li * per
            cy = y + size * 0.33
            bar = C.plane(f'LineWipe{li}', w, lh * 0.92, bar_m, ctx.page, loc=(x0, cy, 0.1))
            C.key(bar, 'scale', 0, TINY, 'CONSTANT')
            C.key(bar, 'scale', f, (1e-3, 1, 1), 'CUBIC', 'EASE_OUT')
            C.key(bar, 'location', f, (x0, cy, 0.1), 'CUBIC', 'EASE_OUT')
            C.key(bar, 'scale', f + 7, ONE, 'CUBIC', 'EASE_IN')
            C.key(bar, 'location', f + 7, (0, cy, 0.1), 'CUBIC', 'EASE_IN')
            C.key(bar, 'scale', f + 14, (1e-3, 1, 1), 'CONSTANT')
            C.key(bar, 'location', f + 14, (x1, cy, 0.1), 'CONSTANT')
            C.key(bar, 'scale', f + 15, TINY, 'CONSTANT')
            for o, wd in zip(old, easy.words):
                if wd.line == li:
                    self.swap_at(o, wd.obj, f + 7, 'none')

    def extras(self, ctx):
        T = ctx.tl
        self.wipe(ctx, T.lesson_in - 10, 1)
        self.wipe(ctx, T.reveal_in - 14, -1)
        self.wipe(ctx, T.cta_in - 4, 1)
        # slow geometric shapes in the background
        r = C.rand(4)
        ring_m = C.emissive('Ring', C.mix(ctx.bg, ctx.accent, 0.1))
        for i in range(3):
            C.bpy.ops.mesh.primitive_torus_add(major_radius=r.uniform(1.5, 4.5), minor_radius=0.03, major_segments=96)
            o = C.bpy.context.active_object
            for c in list(o.users_collection):
                c.objects.unlink(o)
            C.link(o)
            o.data.materials.append(ring_m)
            o.location = (r.uniform(-6, 6), r.uniform(-9, 9), -3)
            C.keys(o, 'location', [(1, tuple(o.location)), (T.end, (o.location.x + r.uniform(-1, 1), o.location.y + r.uniform(1, 3), -3))], 'LINEAR')
        dot_m = C.emissive('Dot', C.mix(ctx.bg, ctx.accent, 0.22))
        def dot(i):
            C.bpy.ops.mesh.primitive_circle_add(vertices=16, radius=0.07, fill_type='NGON')
            o = C.bpy.context.active_object
            for c in list(o.users_collection):
                c.objects.unlink(o)
            C.link(o)
            o.data.materials.append(dot_m)
            return o
        self.drifters(ctx, dot, 30, area=(10, 17), z=(-2, -1), drift=(0, 0.8), wobble=0.2, spin=False, seed=4)

    def finish(self, ctx):
        cam = ctx.camera.data
        T = ctx.tl
        C.keys(cam, 'ortho_scale', [(1, 13.0), (T.sec(1.2), 16.0)], 'CUBIC', 'EASE_OUT')
        C.keys(cam, 'ortho_scale', [(T.reveal_out, 15.0), (T.reveal_out + 18, 16.0)], 'CUBIC', 'EASE_OUT')
        C.keys(cam, 'ortho_scale', [(T.cta_in + 10, 17.0), (T.cta_in + 40, 15.4)], 'CUBIC', 'EASE_OUT')


STYLE = Kinetic()
