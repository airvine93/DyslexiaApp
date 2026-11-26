"""
Shared building blocks for the Easy Reader Blender videos.

Every style uses the same story, taken from ideas.csv (the same 100 ideas and tags as the Three.js video lab):
  1. Hook      the word (or quote, fact, phrase) in the pastel rule: big pastel / small white / big pastel
  2. Lesson    the explanation, set like an ordinary book page
  3. Hard      the page turns hard to read, and a question appears ("Find this difficult to read?")
  4. Reveal    the words change into a dyslexia-friendly reading font
  5. Features  bold word starts, colour overlay and/or reading ruler (from the idea's `feat`)
  6. Close     closing line and an "Easy Reader" pill

A style (see styles/) only decides how things look and move. All text layout, timing and the
features live here, so every style tells exactly the same story and the results can be compared.

Works with Blender 4.2 to 5.x. Written and tested against Blender 5.2 LTS.
"""
import bpy
import csv
import math
import os
import random

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONT_DIR = os.path.join(HERE, 'fonts')
IDEAS_CSV = os.path.join(HERE, 'ideas.csv')

# ---------------------------------------------------------------------------------------------
# Data shared with the Three.js lab (tools/video/src/design.js)
# ---------------------------------------------------------------------------------------------

ACCENTS = {
    'rose': '#F7A8B8', 'peach': '#FBD1A2', 'butter': '#F6EE9B', 'mint': '#A9E5C3',
    'sky': '#A6D8F0', 'periwinkle': '#BFC4F5', 'orchid': '#E3B8EC', 'apricot': '#F8C7A8',
}

FONTS = {
    'opendyslexic': ('OpenDyslexic', 'opendyslexic-Regular.otf', 'opendyslexic-Bold.otf', 0.84),
    'lexend': ('Lexend', 'lexend-Regular.ttf', 'lexend-Bold.ttf', 0.94),
    'atkinson': ('Atkinson Hyperlegible', 'atkinson-Regular.ttf', 'atkinson-Bold.ttf', 1.0),
    'andika': ('Andika', 'andika-Regular.ttf', 'andika-Bold.ttf', 0.96),
    'comicneue': ('Comic Neue', 'comicneue-Regular.ttf', 'comicneue-Bold.ttf', 1.04),
    'readex': ('Readex Pro', 'readex-Regular.ttf', 'readex-Bold.ttf', 0.94),
}
HARD_FONT = 'hard-serif-Light.ttf'
HARD_FONT_ITALIC = 'hard-serif-LightItalic.ttf'
UI_FONT = 'lexend-Regular.ttf'
UI_FONT_BOLD = 'lexend-Bold.ttf'

ASKS = {
    'a1': 'Find this difficult to read?',
    'a2': 'Hard to read?',
    'a3': 'Do the words crowd together?',
    'a4': 'Does reading ever feel like this?',
}
CTAS = {
    'c1': ('Read your way', 'any text, on any screen'),
    'c2': ('Make reading easier', 'fonts, bold starts, colour and a ruler'),
    'c3': ('Same words', 'easier to read'),
    'c4': ('Try it on anything', 'web pages, documents, books'),
}
KICKERS = {
    'word': {'label': 'WORD OF THE DAY', 'question': 'DO YOU KNOW THIS WORD?'},
    'origin': {'label': 'WHERE WORDS COME FROM', 'question': 'EVER WONDERED WHERE THIS COMES FROM?'},
    'quote': {'label': 'WORDS WORTH KEEPING', 'question': 'WHO SAID IT?'},
    'fact': {'label': 'WORD FACT', 'question': 'DID YOU KNOW?'},
    'phrase': {'label': 'WORDS AT PLAY', 'question': 'HAVE YOU HEARD THIS ONE?'},
}
FEATURES = {'font': [], 'bionic': ['bionic'], 'tint': ['tint'], 'ruler': ['ruler'], 'all': ['bionic', 'tint', 'ruler']}
FEATURE_LABELS = {'bionic': 'Bold word starts', 'tint': 'Colour overlay', 'ruler': 'Reading ruler'}
PACE = {'fast': 0.85, 'medium': 1.0, 'slow': 1.2}


def load_ideas(path=IDEAS_CSV):
    with open(path, encoding='utf-8') as f:
        return list(csv.DictReader(f))


def get_idea(n):
    ideas = load_ideas()
    if not 1 <= n <= len(ideas):
        raise SystemExit(f'Idea {n} does not exist. Pick a number from 1 to {len(ideas)}.')
    return ideas[n - 1]


# ---------------------------------------------------------------------------------------------
# Colours, fonts, materials
# ---------------------------------------------------------------------------------------------

def srgb_to_linear(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def hexcol(h, alpha=1.0):
    """'#F7A8B8' -> linear RGBA tuple, which is what Blender colour inputs expect."""
    h = h.lstrip('#')
    return tuple(srgb_to_linear(int(h[i:i + 2], 16) / 255) for i in (0, 2, 4)) + (alpha,)


def mix(a, b, t):
    return tuple(a[i] * (1 - t) + b[i] * t for i in range(4))


_fonts = {}


def font(filename):
    if filename not in _fonts:
        path = os.path.join(FONT_DIR, filename)
        if not os.path.exists(path):
            raise SystemExit(f'Missing font file {path}. Copy the whole tools/blender folder, including fonts/.')
        _fonts[filename] = bpy.data.fonts.load(path, check_existing=True)
    return _fonts[filename]


def set_blend(mat, mode):
    """mode: 'opaque', 'dithered' (fades) or 'blended' (coloured glass and tints)."""
    if hasattr(mat, 'surface_render_method'):  # Blender 4.2+
        mat.surface_render_method = 'BLENDED' if mode == 'blended' else 'DITHERED'
    else:
        mat.blend_method = {'opaque': 'OPAQUE', 'dithered': 'HASHED', 'blended': 'BLEND'}[mode]
    if hasattr(mat, 'use_transparency_overlap'):
        mat.use_transparency_overlap = False


def principled(name, color, rough=0.5, emission=0.0, metallic=0.0, transmission=0.0, ior=1.45,
               coat=0.0, sss=0.0, alpha=1.0):
    """A Principled BSDF material. The returned material has .bsdf pointing at the BSDF node."""
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    b = nt.nodes.get('Principled BSDF')
    def setin(names, v):
        for n in names:
            if n in b.inputs:
                b.inputs[n].default_value = v
                return
    setin(['Base Color'], color)
    setin(['Roughness'], rough)
    setin(['Metallic'], metallic)
    setin(['Transmission Weight', 'Transmission'], transmission)
    setin(['IOR'], ior)
    setin(['Coat Weight', 'Clearcoat'], coat)
    setin(['Subsurface Weight', 'Subsurface'], sss)
    setin(['Alpha'], alpha)
    if emission:
        setin(['Emission Color', 'Emission'], color)
        setin(['Emission Strength'], emission)
    mat.diffuse_color = color
    set_blend(mat, 'dithered')
    return mat


def emissive(name, color, strength=1.0):
    """Flat, unlit colour: exactly the hex colour on screen when the view transform is Standard."""
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    em = nt.nodes.new('ShaderNodeEmission')
    tr = nt.nodes.new('ShaderNodeBsdfTransparent')
    mx = nt.nodes.new('ShaderNodeMixShader')
    em.inputs['Color'].default_value = color
    em.inputs['Strength'].default_value = strength
    mx.inputs[0].default_value = 1.0  # 1 = fully visible, 0 = invisible. Animate this to fade.
    nt.links.new(tr.outputs[0], mx.inputs[1])
    nt.links.new(em.outputs[0], mx.inputs[2])
    nt.links.new(mx.outputs[0], out.inputs[0])
    mat.diffuse_color = color
    set_blend(mat, 'dithered')
    return mat


def tint_material(name, color, glow=0.06):
    """A see-through sheet that multiplies everything behind it by `color`, like a coloured reading overlay."""
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    tr = nt.nodes.new('ShaderNodeBsdfTransparent')
    em = nt.nodes.new('ShaderNodeEmission')
    add = nt.nodes.new('ShaderNodeAddShader')
    tr.inputs['Color'].default_value = color
    em.inputs['Color'].default_value = color
    em.inputs['Strength'].default_value = glow
    nt.links.new(tr.outputs[0], add.inputs[0])
    nt.links.new(em.outputs[0], add.inputs[1])
    nt.links.new(add.outputs[0], out.inputs[0])
    set_blend(mat, 'blended')
    return mat


def mat_fade(mat, frame, value, interp='BEZIER'):
    """Key how visible a material is (0..1). Works for emissive() and principled() materials."""
    nt = mat.node_tree
    for n in nt.nodes:
        if n.type == 'MIX_SHADER':
            key(n.inputs[0], 'default_value', frame, value, interp)
            return
        if n.type == 'BSDF_PRINCIPLED':
            key(n.inputs['Alpha'], 'default_value', frame, value, interp)
            return


def mat_color(mat, frame, color, interp='BEZIER'):
    for n in mat.node_tree.nodes:
        if n.type == 'EMISSION':
            key(n.inputs['Color'], 'default_value', frame, color, interp)
        if n.type == 'BSDF_PRINCIPLED':
            key(n.inputs['Base Color'], 'default_value', frame, color, interp)


def mat_strength(mat, frame, value, interp='BEZIER'):
    for n in mat.node_tree.nodes:
        if n.type == 'EMISSION':
            key(n.inputs['Strength'], 'default_value', frame, value, interp)
        if n.type == 'BSDF_PRINCIPLED':
            key(n.inputs['Emission Strength'], 'default_value', frame, value, interp)


# ---------------------------------------------------------------------------------------------
# Keyframes (works with the new "slotted" actions of Blender 4.4+ and the old ones)
# ---------------------------------------------------------------------------------------------

def fcurves_for(idblock):
    ad = idblock.animation_data
    if not ad or not ad.action:
        return []
    act = ad.action
    if hasattr(act, 'fcurves'):  # Blender 4.3 and older
        return act.fcurves
    from bpy_extras import anim_utils
    cb = anim_utils.animdata_get_channelbag_for_assigned_slot(ad)
    return cb.fcurves if cb else []


def key(target, prop, frame, value, interp='BEZIER', easing='AUTO'):
    """Set `target.prop = value` and keyframe it at `frame`, with a chosen interpolation.

    interp: BEZIER (smooth), LINEAR, CONSTANT (jump), BACK (overshoot), ELASTIC, BOUNCE, SINE, CUBIC, EXPO...
    """
    setattr(target, prop, value)
    frame = round(frame)
    target.keyframe_insert(prop, frame=frame)
    idb = target.id_data
    path = target.path_from_id(prop)
    for fc in fcurves_for(idb):
        if fc.data_path == path:
            for kp in fc.keyframe_points:
                if abs(kp.co.x - frame) < 0.5:
                    kp.interpolation = interp
                    kp.easing = easing


def value_at(target, prop, frame):
    """The animated value of `target.prop` at `frame` (reads the keyframes, not the current value,
    because Blender writes frame-1 values back into objects whenever the scene updates)."""
    cur = getattr(target, prop)
    path = target.path_from_id(prop)
    if isinstance(cur, (int, float, bool)):
        for fc in fcurves_for(target.id_data):
            if fc.data_path == path:
                return fc.evaluate(frame)
        return cur
    vals = list(cur)
    for fc in fcurves_for(target.id_data):
        if fc.data_path == path and fc.array_index < len(vals):
            vals[fc.array_index] = fc.evaluate(frame)
    return tuple(vals)


def keys(target, prop, pairs, interp='BEZIER', easing='AUTO'):
    for f, v in pairs:
        key(target, prop, f, v, interp, easing)


def add_noise(obj, prop, index, strength, scale, f0=None, f1=None, phase=0.0, blend=10):
    """Add a wobble to an animated property, optionally only between frames f0 and f1."""
    path = obj.path_from_id(prop)
    for fc in fcurves_for(obj.id_data):
        if fc.data_path == path and fc.array_index == index:
            m = fc.modifiers.new('NOISE')
            m.strength = strength
            m.scale = scale
            m.phase = phase
            if f0 is not None:
                m.use_restricted_range = True
                m.frame_start, m.frame_end = f0, f1
                m.blend_in = m.blend_out = blend
            return m


def step_all_animation(step=2):
    """Hold every pose for `step` frames, like stop-motion animation 'on twos'."""
    ids = list(bpy.data.objects) + list(bpy.data.materials) + list(bpy.data.cameras) + list(bpy.data.lights)
    for idb in ids:
        targets = [idb]
        if getattr(idb, 'node_tree', None):
            targets.append(idb.node_tree)
        for t in targets:
            for fc in fcurves_for(t):
                m = fc.modifiers.new('STEPPED')
                m.frame_step = step


# ---------------------------------------------------------------------------------------------
# Objects
# ---------------------------------------------------------------------------------------------

_coll = None


def collection():
    global _coll
    if _coll is None:
        _coll = bpy.data.collections.new('EasyReader')
        bpy.context.scene.collection.children.link(_coll)
    return _coll


def link(obj, parent=None):
    collection().objects.link(obj)
    if parent is not None:
        obj.parent = parent
    return obj


def empty(name, parent=None, loc=(0, 0, 0)):
    e = bpy.data.objects.new(name, None)
    e.location = loc
    e.empty_display_size = 0.5
    return link(e, parent)


def text_obj(name, body, fontfile, size, mat, parent=None, bold_file=None, bold_chars=0,
             extrude=0.0, bevel=0.0, bevel_res=2, align='LEFT', spacing=1.0):
    cu = bpy.data.curves.new(name, 'FONT')
    cu.body = body
    cu.font = font(fontfile)
    if bold_file:
        cu.font_bold = font(bold_file)
        for i in range(min(bold_chars, len(body))):
            cu.body_format[i].use_bold = True
    cu.size = size
    cu.align_x = align
    cu.space_character = spacing
    cu.extrude = extrude
    cu.bevel_depth = bevel
    cu.bevel_resolution = bevel_res
    cu.resolution_u = 6
    cu.materials.append(mat)
    ob = bpy.data.objects.new(name, cu)
    return link(ob, parent)


def plane(name, w, h, mat, parent=None, loc=(0, 0, 0), round_corners=0.0, depth=0.0):
    import bmesh
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    vs = [bm.verts.new((x * w / 2, y * h / 2, 0)) for x, y in ((-1, -1), (1, -1), (1, 1), (-1, 1))]
    bm.faces.new(vs)
    bm.to_mesh(me)
    bm.free()
    me.materials.append(mat)
    ob = bpy.data.objects.new(name, me)
    ob.location = loc
    link(ob, parent)
    if round_corners > 0:
        m = ob.modifiers.new('round', 'BEVEL')
        m.affect = 'VERTICES'
        m.width = min(round_corners, w / 2 - 1e-3, h / 2 - 1e-3)
        m.segments = 10
    if depth > 0:
        m = ob.modifiers.new('thick', 'SOLIDIFY')
        m.thickness = depth
        m.offset = -1
    return ob


def ensure_scale_hidden(obj, frame):
    """Invisible (tiny) until `frame`."""
    key(obj, 'scale', 0, (1e-4,) * 3, 'CONSTANT')
    key(obj, 'scale', frame, (1e-4,) * 3, 'CONSTANT')


# ---------------------------------------------------------------------------------------------
# Text layout: one Blender text object per word, placed by our own word wrap.
# This lets styles move every word on its own (waves, flips, drops) and gives exact line positions
# for the reading ruler.
# ---------------------------------------------------------------------------------------------

def bionic_count(word):
    """How many letters to make bold. Same rules as the Easy Reader app (from Emotion Shaper)."""
    letters = [c for c in word if c.isalpha()]
    n = len(letters)
    if n == 0:
        return 0
    if n <= 2:
        k = 1
    else:
        k = min(max(1, round(n * 0.45)), n - 1)
    # count leading punctuation so the bold covers the first k letters
    out, seen = 0, 0
    for c in word:
        out += 1
        if c.isalpha():
            seen += 1
            if seen == k:
                break
    return out


class Word:
    def __init__(self, obj, width, line=0):
        self.obj = obj
        self.width = width
        self.line = line
        self.home = (0, 0, 0)


class Block:
    """A laid-out paragraph. `words` keep their home position; `lines` holds (y, x0, x1) per line."""

    def __init__(self, words, lines, size):
        self.words = words
        self.lines = lines
        self.size = size

    @property
    def height(self):
        return (self.lines[0][0] - self.lines[-1][0]) + self.size if self.lines else 0


def make_words(name, text, fontfile, size, mat, parent, bold_file=None, bionic=False, **props):
    words = []
    for i, w in enumerate(text.split()):
        k = bionic_count(w) if bionic else 0
        ob = text_obj(f'{name}.{i:03d}', w, fontfile, size, mat, parent, bold_file=bold_file, bold_chars=k, **props)
        words.append(ob)
    bpy.context.view_layer.update()
    return [Word(o, o.dimensions.x) for o in words]


def layout(words, size, width, line_height=1.5, word_gap=0.32, align='CENTER', top=0.0, scale=1.0):
    """Word-wrap `words` into lines no wider than `width`. Returns line info; sets each word's .home.

    Positions are in the parent's space. `top` is the y of the first baseline.
    `line_height` and `word_gap` are multiples of the font size (1.5 line height is the dyslexia style guide value).
    """
    gap = word_gap * size * scale
    rows, row, w = [], [], 0
    for wd in words:
        ww = wd.width * scale
        if row and w + gap + ww > width:
            rows.append((row, w))
            row, w = [], 0
        w = w + (gap if row else 0) + ww
        row.append(wd)
    if row:
        rows.append((row, w))
    lines = []
    for li, (row, rw) in enumerate(rows):
        y = top - li * size * scale * line_height
        x = {'CENTER': -rw / 2, 'LEFT': -width / 2, 'RIGHT': width / 2 - rw}[align]
        lines.append((y, x, x + rw))
        for wd in row:
            wd.home = (x, y, 0)
            wd.line = li
            wd.scale = scale
            x += wd.width * scale + gap
    return lines


def block(name, text, fontfile, size, mat, parent, width, line_height=1.5, word_gap=0.32, align='CENTER',
          top=0.0, center_y=None, bold_file=None, bionic=False, place=True, **props):
    ws = make_words(name, text, fontfile, size, mat, parent, bold_file=bold_file, bionic=bionic, **props)
    lines = layout(ws, size, width, line_height, word_gap, align, top)
    b = Block(ws, lines, size)
    if center_y is not None:
        shift = center_y - (lines[0][0] + lines[-1][0]) / 2 - size * 0.35
        for wd in ws:
            wd.home = (wd.home[0], wd.home[1] + shift, 0)
        b.lines = [(y + shift, a, c) for (y, a, c) in lines]
    if place:
        for wd in ws:
            wd.obj.location = wd.home
    return b


def fit_block(name, text, fontfile, size, mat, parent, width, max_lines, center_y, **kw):
    """A block whose font size shrinks until it fits in `max_lines`."""
    while True:
        words = text.split()
        est = sum(len(w) + 1 for w in words) * size * 0.55
        if est / width <= max_lines * 0.9 or size < 0.3:
            b = block(name, text, fontfile, size, mat, parent, width, center_y=center_y, **kw)
            if len(b.lines) <= max_lines or size < 0.3:
                return b
            for wd in b.words:
                bpy.data.objects.remove(wd.obj)
        size *= 0.9


# ---------------------------------------------------------------------------------------------
# Timeline
# ---------------------------------------------------------------------------------------------

class Timeline:
    """Frame numbers for every act. All styles share it, scaled by the idea's pace."""

    def __init__(self, idea, fps=30, pace=None):
        p = PACE.get(pace or idea['pace'], 1.0)
        self.fps = fps
        n = len(idea['lesson'].split())
        s = lambda sec: round(sec * fps)
        t = 0.0
        self.hook_in = s(t)
        t += 3.6 * p
        self.lesson_in = s(t)
        t += 0.8
        t += max(4.0, 1.4 + n * 0.25) * p
        self.hard_in = s(t)
        t += 1.2
        self.ask_in = s(t)
        t += 2.8 * p
        self.reveal_in = s(t)
        t += 2.0
        self.reveal_out = s(t)
        t += max(5.0, 1.6 + n * 0.22) * p
        self.features = []
        for f in FEATURES[idea['feat']]:
            self.features.append((f, s(t), s(t + 3.4 * p)))
            t += 3.4 * p
        self.cta_in = s(t)
        t += 3.6
        self.end = s(t)

    def sec(self, x):
        return round(x * self.fps)


# ---------------------------------------------------------------------------------------------
# Scene and render settings (version safe)
# ---------------------------------------------------------------------------------------------

def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    global _coll, _fonts
    _coll = None
    _fonts = {}
    return bpy.context.scene


def set_engine(scene, engine):
    if engine == 'cycles':
        scene.render.engine = 'CYCLES'
        try:
            prefs = bpy.context.preferences.addons['cycles'].preferences
            for dev in ('OPTIX', 'CUDA', 'HIP', 'METAL', 'ONEAPI'):
                try:
                    prefs.compute_device_type = dev
                    prefs.get_devices()
                    if any(d.type == dev for d in prefs.devices):
                        for d in prefs.devices:
                            d.use = True
                        scene.cycles.device = 'GPU'
                        print(f'[easyreader] Cycles on GPU ({dev})')
                        break
                except Exception:
                    continue
        except Exception:
            pass
        return
    for ident in ('BLENDER_EEVEE', 'BLENDER_EEVEE_NEXT'):
        try:
            scene.render.engine = ident
            return
        except TypeError:
            continue


def setup_render(scene, tl, engine='eevee', quality='final', out_path='//render', view='Standard', samples=None):
    r = scene.render
    r.resolution_x, r.resolution_y = 1080, 1920
    r.resolution_percentage = 50 if quality == 'preview' else 100
    r.fps = tl.fps
    scene.frame_start = 1
    scene.frame_end = tl.end
    set_engine(scene, engine)
    if engine == 'cycles':
        scene.cycles.samples = samples or (32 if quality == 'preview' else 160)
        scene.cycles.use_denoising = True
    else:
        e = scene.eevee
        e.taa_render_samples = samples or (16 if quality == 'preview' else 64)
        if hasattr(e, 'use_shadows'):
            e.use_shadows = True
    try:
        scene.view_settings.view_transform = view
        scene.view_settings.look = 'None'
    except TypeError:
        pass
    im = r.image_settings
    if hasattr(im, 'media_type'):  # Blender 5.0+
        im.media_type = 'VIDEO'
    im.file_format = 'FFMPEG'
    ff = r.ffmpeg
    ff.format = 'MPEG4'
    ff.codec = 'H264'
    ff.constant_rate_factor = 'HIGH'
    ff.ffmpeg_preset = 'GOOD'
    ff.audio_codec = 'NONE'
    r.filepath = out_path
    r.use_file_extension = True


def bloom(scene, strength=0.6, threshold=0.8, size=7):
    """Soft glow around bright things (EEVEE lost its own bloom in 4.2, so use the compositor). Optional."""
    try:
        if hasattr(scene, 'compositing_node_group'):  # Blender 5.0+
            nt = bpy.data.node_groups.new('ER Compositor', 'CompositorNodeTree')
            scene.compositing_node_group = nt
            gin = nt.nodes.new('CompositorNodeRLayers')
            out = nt.nodes.new('NodeGroupOutput')
            nt.interface.new_socket('Image', in_out='OUTPUT', socket_type='NodeSocketColor')
        else:
            scene.use_nodes = True
            nt = scene.node_tree
            nt.nodes.clear()
            gin = nt.nodes.new('CompositorNodeRLayers')
            out = nt.nodes.new('CompositorNodeComposite')
        g = nt.nodes.new('CompositorNodeGlare')
        def set_in_or_attr(name_in, attr, v):
            if name_in in g.inputs:
                inp = g.inputs[name_in]
                if inp.type == 'MENU' or isinstance(v, str):
                    inp.default_value = v
                else:
                    inp.default_value = v
            elif hasattr(g, attr):
                setattr(g, attr, v)
        set_in_or_attr('Type', 'glare_type', 'Bloom' if 'Type' in g.inputs else 'FOG_GLOW')
        set_in_or_attr('Threshold', 'threshold', threshold)
        set_in_or_attr('Strength', 'mix', strength if 'Strength' in g.inputs else (strength - 1))
        set_in_or_attr('Size', 'size', size if 'Size' not in g.inputs else 0.6)
        nt.links.new(gin.outputs['Image'], g.inputs[0] if 'Image' not in g.inputs else g.inputs['Image'])
        nt.links.new(g.outputs[0], out.inputs[0])
        if hasattr(scene.render, 'use_compositing'):
            scene.render.use_compositing = True
    except Exception as ex:  # glow is a nice-to-have; never fail a render over it
        print('[easyreader] bloom skipped:', ex)


def camera(name='Camera', loc=(0, 0, 33.33), rot=(0, 0, 0), lens=50, ortho=None, parent=None):
    """Default camera sees a 9 x 16 area of the z=0 plane (1 unit = 120 pixels)."""
    cd = bpy.data.cameras.new(name)
    cd.sensor_fit = 'VERTICAL'
    cd.sensor_height = 24
    cd.lens = lens
    if ortho:
        cd.type = 'ORTHO'
        cd.ortho_scale = ortho
    cd.clip_end = 500
    ob = bpy.data.objects.new(name, cd)
    ob.location = loc
    ob.rotation_euler = rot
    link(ob, parent)
    bpy.context.scene.camera = ob
    return ob


def light(name, kind, loc, rot=(0, 0, 0), energy=500, color=(1, 1, 1), size=1.0, parent=None, spot=None):
    ld = bpy.data.lights.new(name, kind)
    ld.energy = energy
    ld.color = color[:3]
    if kind == 'AREA':
        ld.size = size
    elif kind in ('POINT', 'SPOT'):
        ld.shadow_soft_size = size
    elif kind == 'SUN':
        ld.angle = size
    if spot and kind == 'SPOT':
        ld.spot_size = spot
        ld.spot_blend = 0.6
    ob = bpy.data.objects.new(name, ld)
    ob.location = loc
    ob.rotation_euler = rot
    return link(ob, parent)


def world(color, strength=1.0):
    w = bpy.data.worlds.new('World')
    w.use_nodes = True
    bg = w.node_tree.nodes.get('Background')
    bg.inputs['Color'].default_value = color
    bg.inputs['Strength'].default_value = strength
    w.color = color[:3]
    bpy.context.scene.world = w
    return w


def track_to(obj, target):
    c = obj.constraints.new('TRACK_TO')
    c.target = target
    c.track_axis = 'TRACK_NEGATIVE_Z'
    c.up_axis = 'UP_Y'
    return c


def rand(seed):
    return random.Random(seed)
