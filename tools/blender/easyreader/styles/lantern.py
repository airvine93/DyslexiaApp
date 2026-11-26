"""
NIGHT LIGHT - calm, glowing words in the dark.

Look: a deep plum night. Words are made of soft warm light with a gentle glow. Fireflies in pastel and gold
drift slowly. While the page is hard to read, the words flicker and dim like a failing bulb. For the change,
a small lantern of light floats along each line; every word it passes lights up steadily in the reading font.
Slow, quiet and soothing, more like a bedtime story than an ad.

Why: calm, slow "ambient" content is a counter-trend to fast ads and holds attention well with people who
find busy screens tiring, which includes many dyslexic readers. Light-from-darkness is also a simple
metaphor for "this finally makes sense".
"""
import math
from .. import common as C
from .base import Style, TINY, ONE


class Lantern(Style):
    code = 'ltn'
    name = 'Night light'
    view = 'Standard'
    palette = {'bg': '#160F26', 'text': '#FFF4E0', 'muted': '#C9B8D4'}
    appear_kind = 'fade'
    bloom = True
    fade_lesson = True

    def build_world(self, ctx):
        C.world(ctx.bg)
        ctx.camera = C.camera(loc=(0, 0, 23.3), lens=35)
        ctx.page = C.empty('Page')
        # a soft vertical gradient for the night sky
        m = C.bpy.data.materials.new('Sky')
        m.use_nodes = True
        nt = m.node_tree
        nt.nodes.clear()
        out = nt.nodes.new('ShaderNodeOutputMaterial')
        em = nt.nodes.new('ShaderNodeEmission')
        tc = nt.nodes.new('ShaderNodeTexCoord')
        sep = nt.nodes.new('ShaderNodeSeparateXYZ')
        ramp = nt.nodes.new('ShaderNodeValToRGB')
        ramp.color_ramp.elements[0].color = C.hexcol('#0C0818')
        ramp.color_ramp.elements[1].color = C.hexcol('#2A1C44')
        nt.links.new(tc.outputs['Generated'], sep.inputs[0])
        nt.links.new(sep.outputs['Y'], ramp.inputs['Fac'])
        nt.links.new(ramp.outputs['Color'], em.inputs['Color'])
        nt.links.new(em.outputs[0], out.inputs[0])
        C.plane('Sky', 30, 50, m, None, loc=(0, 0, -10))

    def material(self, ctx, role, color):
        return C.emissive('Glow.' + role, color, 1.15 if role in ('easy', 'accent') else 1.0)

    def reveal(self, ctx, old, easy, t0, t1):
        # the lantern: a bright ball with a warm halo, travelling along each line in turn
        core = C.emissive('LanternCore', C.hexcol('#FFF1C9'), 6.0)
        C.bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=16, radius=0.16)
        lamp = C.bpy.context.active_object
        for c in list(lamp.users_collection):
            c.objects.unlink(lamp)
        C.link(lamp, ctx.page)
        lamp.data.materials.append(core)
        C.bpy.ops.object.shade_smooth()
        times = self.sweep_times(easy, t0, t1 - 6, by_line=True)
        size = easy.size
        C.key(lamp, 'scale', 0, TINY, 'CONSTANT')
        C.key(lamp, 'scale', t0 - 8, TINY, 'SINE')
        C.key(lamp, 'scale', t0, ONE)
        n = len(easy.lines)
        span = (t1 - 6 - t0)
        for li, (y, x0, x1) in enumerate(easy.lines):
            fa = t0 + round(span * li / n)
            fb = t0 + round(span * (li + 1) / n) - 1
            C.key(lamp, 'location', fa, (-4.4, y + size * 0.35, 0.4), 'LINEAR')
            C.key(lamp, 'location', fb, (4.4, y + size * 0.35, 0.4), 'LINEAR')
        C.key(lamp, 'location', t1 + 20, (2.0, 9.5, 0.4), 'SINE')
        C.key(lamp, 'scale', t1 + 14, ONE, 'SINE')
        C.key(lamp, 'scale', t1 + 24, TINY, 'CONSTANT')
        for o, w, f in zip(old, easy.words, times):
            self.swap_at(o, w.obj, f, 'pop', 10)

    def ruler_bar(self, ctx):
        return C.emissive('RulerGlow', C.mix(ctx.bg, ctx.accent, 0.45), 1.0), -0.05

    def extras(self, ctx):
        T = ctx.tl
        # the hard page flickers like a failing bulb
        lm = ctx.mats['lesson']
        C.mat_strength(lm, T.hard_in, 1.0, 'LINEAR')
        C.mat_strength(lm, T.reveal_in + 30, 1.0, 'LINEAR')
        for n in lm.node_tree.nodes:
            if n.type == 'EMISSION':
                inp = n.inputs['Strength']
                for fc in C.fcurves_for(lm.node_tree):
                    if fc.data_path == inp.path_from_id('default_value'):
                        mod = fc.modifiers.new('NOISE')
                        mod.strength = 0.9
                        mod.scale = 3
                        mod.use_restricted_range = True
                        mod.frame_start, mod.frame_end = T.hard_in + 20, T.reveal_in + 25
                        mod.blend_in = mod.blend_out = 10
        # fireflies
        r = C.rand(9)
        cols = [ctx.accent, C.hexcol('#FFD98A'), C.hexcol('#FFF4E0')]
        mats = []
        for i, c in enumerate(cols):
            m = C.emissive(f'Firefly{i}', c, 4.0)
            mats.append(m)
            C.mat_strength(m, 1, 4.0, 'LINEAR')
            C.mat_strength(m, T.end, 4.0, 'LINEAR')
            for fc in C.fcurves_for(m.node_tree):
                mod = fc.modifiers.new('NOISE')
                mod.strength = 3.0
                mod.scale = 18 + 7 * i
                mod.phase = i * 31
        def fly(i):
            C.bpy.ops.mesh.primitive_uv_sphere_add(segments=12, ring_count=6, radius=r.uniform(0.035, 0.07))
            o = C.bpy.context.active_object
            for c in list(o.users_collection):
                c.objects.unlink(o)
            C.link(o)
            o.data.materials.append(mats[i % 3])
            return o
        self.drifters(ctx, fly, 45, area=(10, 18), z=(-4, 1.0), drift=(0.2, 0.5), wobble=0.9, spin=False, seed=19)

    def finish(self, ctx):
        self.camera_drift(ctx, 0.1, push=0.05)


STYLE = Lantern()
