"""
COLOURED GLASS - the app's colour overlay, made real.

Look: crisp white words on near-black, with soft out-of-focus pools of pastel light far behind. Small tiles
of tinted glass drift and turn slowly in the background. For the change into the reading font, a tall bar
of pastel glass glides across the page and every word it passes comes out the other side in the reading
font. The colour overlay is a full sheet of tinted glass that slides over the page and stays.

Why: "liquid glass" and glossy, refractive surfaces are a big 2025-26 interface and motion trend, and here it
literally shows what a coloured overlay does. Looks best in Cycles; EEVEE is fine for drafts.
"""
import math
from .. import common as C
from .base import Style, TINY, ONE


def glass_material(name, color, rough=0.03, clear=0.85):
    """Tinted glass that looks the same in EEVEE and Cycles: a coloured see-through layer plus
    a glossy reflection that gets stronger at grazing angles (like real glass)."""
    mat = C.bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    tr = nt.nodes.new('ShaderNodeBsdfTransparent')
    tr.inputs['Color'].default_value = C.mix((1, 1, 1, 1), color, clear)
    gl = nt.nodes.new('ShaderNodeBsdfGlossy') if 'ShaderNodeBsdfGlossy' in dir(C.bpy.types) else nt.nodes.new('ShaderNodeBsdfAnisotropic')
    gl.inputs['Roughness'].default_value = rough
    fr = nt.nodes.new('ShaderNodeFresnel')
    fr.inputs['IOR'].default_value = 1.5
    mx = nt.nodes.new('ShaderNodeMixShader')
    em = nt.nodes.new('ShaderNodeEmission')
    em.inputs['Color'].default_value = color
    em.inputs['Strength'].default_value = 0.05
    add = nt.nodes.new('ShaderNodeAddShader')
    nt.links.new(fr.outputs[0], mx.inputs[0])
    nt.links.new(tr.outputs[0], mx.inputs[1])
    nt.links.new(gl.outputs[0], mx.inputs[2])
    nt.links.new(mx.outputs[0], add.inputs[0])
    nt.links.new(em.outputs[0], add.inputs[1])
    nt.links.new(add.outputs[0], out.inputs[0])
    C.set_blend(mat, 'blended')
    return mat


def soft_light(name, color, strength):
    """A glowing ball whose edge fades out, so it reads as an out-of-focus pool of light."""
    mat = C.bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    lw = nt.nodes.new('ShaderNodeLayerWeight')
    lw.inputs['Blend'].default_value = 0.5
    inv = nt.nodes.new('ShaderNodeMath')
    inv.operation = 'SUBTRACT'
    inv.inputs[0].default_value = 1.0
    pw = nt.nodes.new('ShaderNodeMath')
    pw.operation = 'POWER'
    pw.inputs[1].default_value = 3.0
    em = nt.nodes.new('ShaderNodeEmission')
    em.inputs['Color'].default_value = color
    em.inputs['Strength'].default_value = strength
    tr = nt.nodes.new('ShaderNodeBsdfTransparent')
    mx = nt.nodes.new('ShaderNodeMixShader')
    nt.links.new(lw.outputs['Facing'], inv.inputs[1])
    nt.links.new(inv.outputs[0], pw.inputs[0])
    nt.links.new(pw.outputs[0], mx.inputs[0])
    nt.links.new(tr.outputs[0], mx.inputs[1])
    nt.links.new(em.outputs[0], mx.inputs[2])
    nt.links.new(mx.outputs[0], out.inputs[0])
    C.set_blend(mat, 'blended')
    return mat


def slab(name, w, h, d, mat, parent=None, loc=(0, 0, 0), bevel=0.06):
    C.bpy.ops.mesh.primitive_cube_add(size=1)
    o = C.bpy.context.active_object
    for c in list(o.users_collection):
        c.objects.unlink(o)
    C.link(o, parent)
    o.name = name
    o.scale = (w, h, d)
    C.bpy.ops.object.select_all(action='DESELECT')
    o.select_set(True)
    C.bpy.context.view_layer.objects.active = o
    C.bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    o.location = loc
    m = o.modifiers.new('bevel', 'BEVEL')
    m.width = bevel
    m.segments = 4
    o.data.materials.append(mat)
    for p in o.data.polygons:
        p.use_smooth = True
    return o


class Glass(Style):
    code = 'gls'
    name = 'Coloured glass'
    view = 'Standard'
    palette = {'bg': '#0F1014', 'text': '#FFFFFF', 'muted': '#B9B9C2'}
    appear_kind = 'rise'
    bloom = True

    def build_world(self, ctx):
        C.world(C.hexcol('#08090C'), 1.0)
        sc = C.bpy.context.scene
        for attr in ('use_raytracing',):
            if hasattr(sc.eevee, attr):
                setattr(sc.eevee, attr, True)
        ctx.camera = C.camera(loc=(0, 0, 23.3), lens=35)
        ctx.page = C.empty('Page')
        C.plane('Back', 40, 60, C.emissive('Back', ctx.bg, 1.0), None, loc=(0, 0, -18))
        # soft pools of coloured light far behind
        r = C.rand(3)
        cols = [ctx.accent, C.hexcol('#BFC4F5'), C.hexcol('#F8C7A8'), C.hexcol('#A9E5C3')]
        self.pools = []
        for i in range(7):
            m = soft_light(f'Pool{i}', cols[i % 4], 0.22)
            C.bpy.ops.mesh.primitive_uv_sphere_add(segments=64, ring_count=32, radius=r.uniform(2.0, 4.0))
            o = C.bpy.context.active_object
            C.bpy.ops.object.shade_smooth()
            for c in list(o.users_collection):
                c.objects.unlink(o)
            C.link(o)
            o.data.materials.append(m)
            o.location = (r.uniform(-7, 7), r.uniform(-11, 11), -12)
            self.pools.append(o)
        # strip lights for the glass to catch
        C.light('StripL', 'AREA', (-9, 0, 6), rot=(0, math.radians(-60), 0), energy=900, size=1.0)
        C.light('StripR', 'AREA', (9, 3, 6), rot=(0, math.radians(60), 0), energy=600, size=1.0)
        C.light('Top', 'AREA', (0, 6, 14), rot=(math.radians(-25), 0, 0), energy=900, size=8)
        cam = ctx.camera.data
        cam.dof.use_dof = True
        cam.dof.focus_distance = 23.3
        cam.dof.aperture_fstop = 2.0

    def material(self, ctx, role, color):
        return C.emissive('Light.' + role, color, 1.0)

    def text_props(self, role, size):
        return {}

    def reveal(self, ctx, old, easy, t0, t1):
        bar = slab('GlassBar', 2.4, 17.5, 0.5, glass_material('GlassBar', ctx.accent, 0.02), ctx.page, bevel=0.12)
        C.key(bar, 'location', 0, (-9, 0, 0.8), 'CONSTANT')
        C.key(bar, 'location', t0 - 6, (-9, 0, 0.8), 'SINE', 'EASE_IN_OUT')
        C.key(bar, 'location', t1, (9, 0, 0.8))
        C.key(bar, 'rotation_euler', t0 - 6, (0, 0, math.radians(-4)), 'SINE')
        C.key(bar, 'rotation_euler', t1, (0, 0, math.radians(4)))
        for o, w in zip(old, easy.words):
            # the frame at which the bar's middle reaches this word's middle
            xm = w.home[0] + w.width / 2
            u = (xm + 9) / 18
            f = round(t0 - 6 + u * (t1 - t0 + 6))
            self.swap_at(o, w.obj, f, 'pop', 6)

    def overlay(self, ctx):
        return slab('GlassSheet', 9.8, 17.0, 0.18, glass_material('GlassSheet', C.mix(ctx.accent, (1, 1, 1, 1), 0.25), 0.04),
                    ctx.page, loc=(12, 0, 0.6), bevel=0.08)

    def pill(self, ctx, parent, loc):
        e = C.empty('Pill', parent, loc)
        slab('PillGlass', 4.2, 1.0, 0.25, glass_material('PillGlass', ctx.accent, 0.08), e, loc=(0, 0, -0.1), bevel=0.12)
        C.plane('PillGlow', 4.0, 0.85, C.emissive('PillGlow', ctx.accent, 1.0), e, loc=(0, 0, -0.3), round_corners=0.42)
        t = C.text_obj('PillText', 'Easy Reader', C.UI_FONT_BOLD, 0.5, C.emissive('PillText', ctx.ink, 1.0), e, align='CENTER')
        t.location = (0, -0.18, 0.2)
        return e

    def extras(self, ctx):
        r = C.rand(11)
        cols = [ctx.accent, C.hexcol('#BFC4F5'), C.hexcol('#F7A8B8'), C.hexcol('#A6D8F0')]
        mats = [glass_material(f'Tile{i}', c, 0.05) for i, c in enumerate(cols)]
        def tile(i):
            s = r.uniform(0.5, 1.1)
            return slab(f'Tile{i}', s, s * r.uniform(0.6, 1.4), 0.12, mats[i % 4], None, bevel=0.05)
        self.drifters(ctx, tile, 14, area=(11, 19), z=(-5, -2.5), drift=(0, 0.5), wobble=0.4, seed=12)
        for i, o in enumerate(self.pools):
            C.key(o, 'location', 1, tuple(o.location), 'LINEAR')
            C.add_noise(o, 'location', 0, 1.5, 150, phase=i * 17)
            C.add_noise(o, 'location', 1, 1.5, 170, phase=i * 7)

    def finish(self, ctx):
        self.camera_drift(ctx, 0.08, push=0.03)


STYLE = Glass()
