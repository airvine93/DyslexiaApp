"""
PAPER CUT - layered craft paper, like a pop-up book.

Look: letters cut from thick white card float a little above a deep blue card. Wavy cut-paper hills in
pastel and blue tones sit at different depths at the top and bottom, swaying gently, and cast real soft
shadows. Small paper leaves drift down. Every word flips over like a paper tab when it changes into the
reading font. The colour overlay is a sheet of tissue paper slid over the page.

Why: hand-made, tactile textures and cut-paper collage are among the most-cited motion trends for 2025-26,
and paper ties straight back to books and reading.
"""
import math
from .. import common as C
from .base import Style, TINY, ONE


def paper_material(name, color, rough=0.85):
    mat = C.principled(name, color, rough=rough, sss=0.05)
    nt = mat.node_tree
    b = nt.nodes.get('Principled BSDF')
    tex = nt.nodes.new('ShaderNodeTexNoise')
    tex.inputs['Scale'].default_value = 90.0
    tex.inputs['Detail'].default_value = 8.0
    bump = nt.nodes.new('ShaderNodeBump')
    bump.inputs['Strength'].default_value = 0.08
    nt.links.new(tex.outputs['Fac'], bump.inputs['Height'])
    nt.links.new(bump.outputs['Normal'], b.inputs['Normal'])
    return mat


def wavy_band(name, mat, y_base, height, amp, waves, phase, z, flip=False, depth=0.03, width=13.0, seg=80):
    """A strip of cut paper whose free edge is a soft wave. flip=True hangs it from the top."""
    import bmesh
    me = C.bpy.data.meshes.new(name)
    bm = bmesh.new()
    top, bot = [], []
    for i in range(seg + 1):
        x = -width / 2 + width * i / seg
        edge = amp * math.sin(waves * x + phase) + amp * 0.4 * math.sin(2.3 * waves * x + phase * 1.7)
        if flip:
            top.append(bm.verts.new((x, y_base + height, 0)))
            bot.append(bm.verts.new((x, y_base + edge, 0)))
        else:
            top.append(bm.verts.new((x, y_base + height + edge, 0)))
            bot.append(bm.verts.new((x, y_base, 0)))
    for i in range(seg):
        bm.faces.new((bot[i], bot[i + 1], top[i + 1], top[i]))
    bm.to_mesh(me)
    bm.free()
    me.materials.append(mat)
    ob = C.bpy.data.objects.new(name, me)
    ob.location.z = z
    C.link(ob)
    m = ob.modifiers.new('card', 'SOLIDIFY')
    m.thickness = depth
    return ob


class Paper(Style):
    code = 'ppr'
    name = 'Paper cut'
    view = 'Standard'
    palette = {'bg': '#24324F', 'text': '#FBF7F0', 'muted': '#C3CADB'}
    appear_kind = 'flip'

    def build_world(self, ctx):
        C.world(C.hexcol('#2B3A5C'), 0.35)
        ctx.camera = C.camera(loc=(0, 0, 23.3), lens=35)
        ctx.page = C.empty('Page')
        # base card
        C.plane('BaseCard', 16, 24, paper_material('BaseCard', ctx.bg), None, loc=(0, 0, -0.12))
        # soft key light from the top left, so letters cast shadows on the card
        sun = C.light('Sun', 'SUN', (0, 0, 10), rot=(math.radians(28), math.radians(-22), 0), energy=3.2,
                      color=C.hexcol('#FFF3E2'), size=math.radians(14))
        C.light('Fill', 'AREA', (0, -6, 14), rot=(math.radians(-20), 0, 0), energy=600, size=12,
                color=C.hexcol('#DDE6FF'))
        # layered paper hills: darker and further back, lighter and nearer
        tones = [C.mix(ctx.bg, ctx.accent, t) for t in (0.18, 0.35, 0.55, 0.8)]
        self.bands = []
        for i, col in enumerate(tones):
            m = paper_material(f'Hill{i}', col)
            z = -0.11 + i * 0.022
            self.bands.append(wavy_band(f'HillLow{i}', m, -8.6, 1.4 + 0.5 * (3 - i), 0.35, 0.7 + 0.15 * i, i * 1.3, z))
            self.bands.append(wavy_band(f'HillTop{i}', m, 8.6 - (1.0 + 0.35 * (3 - i)), 1.0 + 0.35 * (3 - i), 0.3,
                                        0.6 + 0.2 * i, 2 + i, z, flip=True))

    def material(self, ctx, role, color):
        return paper_material('Card.' + role, color, 0.8)

    def text_props(self, role, size):
        return {'extrude': 0.012 + size * 0.02}

    def reveal(self, ctx, old, easy, t0, t1):
        times = self.sweep_times(easy, t0, t1 - 12, by_line=True)
        for o, w, f in zip(old, easy.words, times):
            n_ = w.obj
            C.key(o, 'rotation_euler', f, (0, 0, 0), 'SINE', 'EASE_IN')
            C.key(o, 'rotation_euler', f + 6, (0, math.radians(90), 0))
            C.key(o, 'scale', f + 6, C.value_at(o, 'scale', f), 'CONSTANT')
            C.key(o, 'scale', f + 7, TINY, 'CONSTANT')
            C.key(n_, 'scale', f + 6, TINY, 'CONSTANT')
            C.key(n_, 'scale', f + 7, ONE, 'CONSTANT')
            C.key(n_, 'rotation_euler', 0, (0, math.radians(-90), 0), 'CONSTANT')
            C.key(n_, 'rotation_euler', f + 6, (0, math.radians(-90), 0), 'BACK', 'EASE_OUT')
            C.key(n_, 'rotation_euler', f + 16, (0, 0, 0))

    def overlay(self, ctx):
        m = C.tint_material('Tissue', ctx.accent, 0.1)
        o = C.plane('Tissue', 9.6, 16.6, m, ctx.page, loc=(12, 0, 0.6), round_corners=0.08)
        o.rotation_euler.z = math.radians(1.5)
        return o

    def pill(self, ctx, parent, loc):
        e = C.empty('Pill', parent, loc)
        C.plane('PillCard', 4.2, 1.0, paper_material('PillCard', ctx.accent), e, loc=(0, 0, -0.04),
                round_corners=0.5, depth=0.04)
        t = C.text_obj('PillText', 'Easy Reader', C.UI_FONT_BOLD, 0.5, paper_material('PillText', ctx.ink), e,
                       align='CENTER', extrude=0.015)
        t.location = (0, -0.18, 0.03)
        return e

    def extras(self, ctx):
        # hills sway a little, each on its own rhythm
        for i, b in enumerate(self.bands):
            C.key(b, 'location', 1, tuple(b.location), 'LINEAR')
            C.add_noise(b, 'location', 0, 0.12, 90 + i * 7, phase=i * 13)
            C.add_noise(b, 'location', 1, 0.05, 70 + i * 5, phase=i * 5)
        # small paper leaves drifting down behind the text
        cols = [ctx.accent, C.hexcol('#FBF7F0'), C.mix(ctx.accent, ctx.bg, 0.3)]
        mats = [paper_material(f'Leaf{i}', c) for i, c in enumerate(cols)]
        def leaf(i):
            o = C.plane(f'Leaf{i}', 0.32, 0.18, mats[i % 3], None, round_corners=0.09)
            return o
        self.drifters(ctx, leaf, 22, area=(10, 18), z=(-0.1, -0.03), drift=(0.1, -1.2), wobble=0.5, seed=21)

    def finish(self, ctx):
        self.camera_drift(ctx, 0.12, push=0.04)


STYLE = Paper()
