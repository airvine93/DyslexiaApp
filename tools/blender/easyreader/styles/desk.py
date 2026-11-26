"""
READING NOOK - a real page on a real desk.

Look: a cream sheet of paper on a warm wooden desk, lit by a desk lamp from the top left, with a mug and a
pencil at the edges, slightly out of focus. Dust floats in the lamp light. The words are printed in ink on
the page. For the change, each line of ink sinks into the paper and the reading font grows back out of it.
The colour overlay is a real tinted plastic reading overlay laid on the page, and the reading ruler is a
plastic reading strip that slides down the lines - the physical tools many dyslexic readers already use.

Why: miniature, tactile "real-world" scenes are a strong 2025-26 trend, and showing the familiar paper
overlay and ruler, then the app doing the same on screen, is the clearest story for this audience.
"""
import math
from .. import common as C
from .base import Style, TINY, ONE


def wood_material():
    mat = C.principled('Wood', C.hexcol('#8A5A3B'), rough=0.45, coat=0.15)
    nt = mat.node_tree
    b = nt.nodes.get('Principled BSDF')
    wave = nt.nodes.new('ShaderNodeTexWave')
    wave.inputs['Scale'].default_value = 0.6
    wave.inputs['Distortion'].default_value = 6.0
    wave.inputs['Detail'].default_value = 3.0
    ramp = nt.nodes.new('ShaderNodeValToRGB')
    ramp.color_ramp.elements[0].color = C.hexcol('#6E432A')
    ramp.color_ramp.elements[1].color = C.hexcol('#A9734B')
    nt.links.new(wave.outputs['Fac'], ramp.inputs['Fac'])
    nt.links.new(ramp.outputs['Color'], b.inputs['Base Color'])
    return mat


def paper_material(color):
    mat = C.principled('Paper', color, rough=0.92, sss=0.02)
    nt = mat.node_tree
    b = nt.nodes.get('Principled BSDF')
    tex = nt.nodes.new('ShaderNodeTexNoise')
    tex.inputs['Scale'].default_value = 120.0
    bump = nt.nodes.new('ShaderNodeBump')
    bump.inputs['Strength'].default_value = 0.05
    nt.links.new(tex.outputs['Fac'], bump.inputs['Height'])
    nt.links.new(bump.outputs['Normal'], b.inputs['Normal'])
    return mat


def add_prim(op, **kw):
    getattr(C.bpy.ops.mesh, op)(**kw)
    o = C.bpy.context.active_object
    for c in list(o.users_collection):
        c.objects.unlink(o)
    C.link(o)
    return o


class Desk(Style):
    code = 'dsk'
    name = 'Reading nook'
    view = 'Standard'
    palette = {'bg': '#F4EEE1', 'text': '#1F2430', 'muted': '#6B6458'}
    appear_kind = 'fade'
    overlay_z = 0.04

    def build_world(self, ctx):
        C.world(C.hexcol('#2A2622'), 0.5)
        look = C.empty('LookAt', None, (0, 0.3, 0))
        ctx.camera = C.camera(loc=(0, -5.0, 30.4), lens=40)
        C.track_to(ctx.camera, look)
        cam = ctx.camera.data
        cam.dof.use_dof = True
        cam.dof.focus_object = look
        cam.dof.aperture_fstop = 2.8
        ctx.page = C.empty('Page')
        ctx.page.rotation_euler.z = math.radians(-1.2)
        C.plane('Desk', 40, 40, wood_material(), None, loc=(0, 0, -0.06))
        C.plane('Sheet', 8.6, 15.2, paper_material(ctx.bg), ctx.page, loc=(0, -0.2, -0.01))
        under = C.plane('SheetUnder', 8.6, 15.2, paper_material(C.hexcol('#E9E1CF')), None, loc=(0.35, -0.5, -0.03))
        under.rotation_euler.z = math.radians(3.5)
        # lamp, window and a little bounce
        C.light('Lamp', 'SPOT', (-7, 9, 13), rot=(math.radians(-38), math.radians(-25), math.radians(-20)), energy=3200,
                color=C.hexcol('#FFD9A8'), size=1.5, spot=math.radians(70))
        C.light('Window', 'AREA', (9, -6, 10), rot=(math.radians(30), math.radians(40), 0), energy=800, size=10,
                color=C.hexcol('#E4ECFF'))
        C.light('Bounce', 'AREA', (0, 0, 20), energy=1500, size=20, color=C.hexcol('#FFF1DC'))
        self.props(ctx)

    def props(self, ctx):
        # mug, top right
        mug = add_prim('primitive_cylinder_add', vertices=48, radius=1.5, depth=3.0)
        mug.location = (5.6, 7.4, 1.45)
        mug.data.materials.append(C.principled('Mug', ctx.accent, rough=0.25, coat=0.5))
        sol = mug.modifiers.new('wall', 'SOLIDIFY')
        sol.thickness = 0.15
        C.bpy.ops.object.shade_smooth()
        tea = add_prim('primitive_cylinder_add', vertices=48, radius=1.38, depth=0.05)
        tea.location = (5.6, 7.4, 2.5)
        tea.data.materials.append(C.principled('Tea', C.hexcol('#6B3A1E'), rough=0.1))
        # pencil, bottom left
        pen = add_prim('primitive_cylinder_add', vertices=6, radius=0.18, depth=6.0)
        pen.rotation_euler = (math.radians(90), 0, math.radians(62))
        pen.location = (-4.8, -8.0, 0.13)
        pen.data.materials.append(C.principled('Pencil', C.hexcol('#F2C14E'), rough=0.4))
        tip = add_prim('primitive_cone_add', vertices=12, radius1=0.18, depth=0.6)
        tip.rotation_euler = (math.radians(90), 0, math.radians(62))
        tip.location = (-4.8 + 3.3 * math.cos(math.radians(62 + 90)), -8.0 + 3.3 * math.sin(math.radians(62 + 90)), 0.13)
        tip.data.materials.append(C.principled('Wood tip', C.hexcol('#E8C9A0'), rough=0.6))

    def material(self, ctx, role, color):
        if role in ('accent', 'ask', 'label'):
            color = C.mix(color, ctx.ink, 0.55)  # pastel on cream is too faint: use a deeper ink of the accent
        return C.principled('Ink.' + role, color, rough=0.55)

    def reveal(self, ctx, old, easy, t0, t1):
        times = self.sweep_times(easy, t0, t1 - 10, by_line=True)
        for o, w, f in zip(old, easy.words, times):
            sc = C.value_at(o, 'scale', f)
            C.key(o, 'scale', f, sc, 'SINE', 'EASE_IN')
            C.key(o, 'scale', f + 5, (sc[0], 0.02, sc[2]), 'CONSTANT')
            C.key(o, 'scale', f + 6, TINY, 'CONSTANT')
            n_ = w.obj
            C.key(n_, 'scale', f + 5, TINY, 'CONSTANT')
            C.key(n_, 'scale', f + 6, (1, 0.02, 1), 'CUBIC', 'EASE_OUT')
            C.key(n_, 'scale', f + 14, ONE)

    def overlay(self, ctx):
        # a plastic reading overlay: tinted, slightly glossy, rounded corners
        m = C.tint_material('Overlay', C.mix(ctx.accent, (1, 1, 1, 1), 0.1), 0.02)
        o = C.plane('Overlay', 8.2, 14.2, m, ctx.page, loc=(12, 0, self.overlay_z), round_corners=0.35)
        return o

    def ruler_bar(self, ctx):
        return C.tint_material('RulerStrip', ctx.accent, 0.0), 0.05

    def pill(self, ctx, parent, loc):
        e = C.empty('Pill', parent, loc)
        C.plane('Stamp', 4.2, 1.0, C.principled('Stamp', C.mix(ctx.accent, ctx.ink, 0.2), rough=0.6), e,
                loc=(0, 0, 0.001), round_corners=0.5)
        t = C.text_obj('PillText', 'Easy Reader', C.UI_FONT_BOLD, 0.5, C.principled('StampInk', ctx.ink, rough=0.6), e,
                       align='CENTER')
        t.location = (0, -0.18, 0.004)
        return e

    def extras(self, ctx):
        # dust in the lamp light
        m = C.emissive('Dust', C.hexcol('#FFE9C8'), 0.9)
        def mote(i):
            o = add_prim('primitive_ico_sphere_add', subdivisions=1, radius=0.018)
            o.data.materials.append(m)
            return o
        self.drifters(ctx, mote, 28, area=(9, 15), z=(1.0, 9.0), drift=(0.2, 0.3), wobble=0.6, spin=False, seed=31)

    def finish(self, ctx):
        cam = ctx.camera
        C.key(cam, 'location', 1, (0, -5.0, 30.4), 'SINE')
        C.key(cam, 'location', ctx.tl.end, (0.3, -4.4, 28.9), 'SINE')


STYLE = Desk()
