"""
CLAY - chunky plasticine letters, animated like stop-motion.

Look: thick, soft, rounded letters with a slightly lumpy, finger-pressed surface, on a slate-blue clay board.
Small clay pebbles sit around the edges and roll about. Everything moves "on twos" (each pose held for two
frames at 24 fps) with a tiny constant wobble, which is what makes stop-motion feel hand-made. Words squash
flat and pop back up in the reading font.

Why: stop-motion-inspired CGI (clay surfaces, puppet-like timing, miniature sets) is one of the strongest
craft trends of 2025-26, and it reads as friendly and unthreatening, which suits a learning-difficulty audience.
"""
import math
from .. import common as C
from .base import Style, TINY, ONE


def clay_material(name, color, bump=0.25, rough=0.62, coat=0.05):
    mat = C.principled(name, color, rough=rough, sss=0.12, coat=coat)
    nt = mat.node_tree
    b = nt.nodes.get('Principled BSDF')
    tex = nt.nodes.new('ShaderNodeTexNoise')
    tex.inputs['Scale'].default_value = 6.0
    tex.inputs['Detail'].default_value = 3.0
    fine = nt.nodes.new('ShaderNodeTexNoise')
    fine.inputs['Scale'].default_value = 60.0
    mixn = nt.nodes.new('ShaderNodeMath')
    mixn.operation = 'MULTIPLY_ADD'
    mixn.inputs[1].default_value = 0.25
    nt.links.new(fine.outputs['Fac'], mixn.inputs[0])
    nt.links.new(tex.outputs['Fac'], mixn.inputs[2])
    bmp = nt.nodes.new('ShaderNodeBump')
    bmp.inputs['Strength'].default_value = bump
    nt.links.new(mixn.outputs[0], bmp.inputs['Height'])
    nt.links.new(bmp.outputs['Normal'], b.inputs['Normal'])
    return mat


class Clay(Style):
    code = 'cly'
    name = 'Clay'
    fps = 24
    view = 'Standard'
    palette = {'bg': '#3E4C72', 'text': '#FFF3E3', 'muted': '#CBD3EA'}
    appear_kind = 'drop'

    def build_world(self, ctx):
        C.world(C.hexcol('#33405F'), 0.4)
        ctx.camera = C.camera(loc=(0, -1.5, 23.2), rot=(math.radians(3.5), 0, 0), lens=35)
        ctx.page = C.empty('Page')
        C.plane('Board', 18, 26, clay_material('Board', ctx.bg, 0.35, rough=0.9, coat=0.0), None, loc=(0, 0, -0.3))
        C.light('Key', 'AREA', (-6, 6, 12), rot=(math.radians(-30), math.radians(-25), 0), energy=2600, size=7,
                color=C.hexcol('#FFF1DE'))
        C.light('Fill', 'AREA', (7, -4, 10), rot=(math.radians(20), math.radians(30), 0), energy=700, size=9,
                color=C.hexcol('#DCE6FF'))
        C.light('Rim', 'AREA', (0, 10, 3), rot=(math.radians(-75), 0, 0), energy=500, size=6)

    def material(self, ctx, role, color):
        return clay_material('Clay.' + role, color)

    def text_props(self, role, size):
        if role == 'lesson':  # keep the 'ordinary book' text thin so it can still turn hard to read
            return {'extrude': size * 0.06, 'bevel': size * 0.006, 'bevel_res': 1}
        return {'extrude': size * 0.09, 'bevel': size * 0.018, 'bevel_res': 3}

    def reveal(self, ctx, old, easy, t0, t1):
        times = self.sweep_times(easy, t0, t1 - 10, by_line=True)
        for o, w, f in zip(old, easy.words, times):
            sc = C.value_at(o, 'scale', f)
            C.key(o, 'scale', f, sc, 'SINE', 'EASE_IN')
            C.key(o, 'scale', f + 4, (sc[0] * 1.35, sc[1] * 0.12, sc[2] * 0.4), 'CONSTANT')
            C.key(o, 'scale', f + 5, TINY, 'CONSTANT')
            n_ = w.obj
            C.key(n_, 'scale', f + 4, TINY, 'CONSTANT')
            C.key(n_, 'scale', f + 5, (1.3, 0.2, 0.5), 'BACK', 'EASE_OUT')
            C.key(n_, 'scale', f + 14, ONE)

    def overlay(self, ctx):
        # a sheet of coloured jelly
        m = C.tint_material('Jelly', ctx.accent, 0.12)
        return C.plane('Jelly', 9.6, 16.6, m, ctx.page, loc=(12, 0, 0.6), round_corners=0.6)

    def pill(self, ctx, parent, loc):
        e = C.empty('Pill', parent, loc)
        p = C.plane('PillClay', 4.2, 1.0, clay_material('PillClay', ctx.accent), e, loc=(0, 0, -0.12),
                    round_corners=0.5, depth=0.18)
        bev = p.modifiers.new('soft', 'BEVEL')
        bev.width = 0.06
        bev.segments = 4
        t = C.text_obj('PillText', 'Easy Reader', C.UI_FONT_BOLD, 0.5, clay_material('PillText', ctx.ink), e,
                       align='CENTER', extrude=0.06, bevel=0.02, bevel_res=2)
        t.location = (0, -0.18, 0.08)
        return e

    def extras(self, ctx):
        r = C.rand(5)
        cols = [ctx.accent, C.hexcol('#F7A8B8'), C.hexcol('#F6EE9B'), C.hexcol('#A6D8F0'), C.hexcol('#FFF3E3')]
        # pebbles around the edges (kept clear of the text area)
        for i in range(26):
            C.bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=12, radius=1)
            o = C.bpy.context.active_object
            C.bpy.context.scene.collection.objects.unlink(o) if o.name in C.bpy.context.scene.collection.objects else None
            C.collection().objects.link(o) if o.name not in C.collection().objects else None
            o.data.materials.append(clay_material(f'Pebble{i}', cols[i % len(cols)]))
            C.bpy.ops.object.shade_smooth()
            side = r.choice([-1, 1])
            if r.random() < 0.5:
                x, y = side * r.uniform(3.9, 5.2), r.uniform(-8.5, 8.5)
            else:
                x, y = r.uniform(-5, 5), side * r.uniform(7.4, 8.8)
            s = r.uniform(0.16, 0.42)
            o.scale = (s * r.uniform(0.9, 1.3), s, s * 0.7)
            o.location = (x, y, -0.3 + s * 0.6)
            o.rotation_euler.z = r.uniform(0, 6)
            # roll a little now and then
            C.key(o, 'location', 1, tuple(o.location), 'LINEAR')
            C.add_noise(o, 'location', 0, 0.25, r.uniform(30, 60), phase=i * 9)
            C.add_noise(o, 'location', 1, 0.2, r.uniform(30, 60), phase=i * 4)
        # every word gets a little 'boil', the hand-made wobble of stop-motion
        for o in C.collection().objects:
            if o.type == 'FONT':
                C.key(o, 'rotation_euler', 1, C.value_at(o, 'rotation_euler', 1), 'CONSTANT')
                C.add_noise(o, 'rotation_euler', 2, 0.012, 2, phase=r.uniform(0, 99))

    def finish(self, ctx):
        self.camera_drift(ctx, 0.05, push=0.03)
        C.step_all_animation(2)


STYLE = Clay()
