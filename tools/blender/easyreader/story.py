"""
The story every style tells. Builds all text and animation for one idea, and asks the style
(see styles/base.py) how each thing should look and move.
"""
import math
from . import common as C


class Ctx:
    """Everything a style needs while building one video."""

    def __init__(self, idea, style, tl, seed):
        self.idea = idea
        self.style = style
        self.tl = tl
        self.rng = C.rand(seed)
        self.accent_hex = C.ACCENTS[idea['accent']]
        self.accent = C.hexcol(self.accent_hex)
        self.bg = C.hexcol(style.palette['bg'])
        self.text = C.hexcol(style.palette['text'])
        self.muted = C.hexcol(style.palette['muted'])
        self.ink = C.hexcol('#1E2430')
        self.page = None      # empty that holds all text. Styles create it in build_world().
        self.camera = None
        self.groups = {}      # name -> empty
        self.blocks = {}      # name -> Block
        self.mats = {}        # role -> material
        self.overlay = None


def mat(ctx, role, color):
    if role not in ctx.mats:
        ctx.mats[role] = ctx.style.material(ctx, role, color)
    return ctx.mats[role]


def ui_line(ctx, name, body, size, role, color, parent, y, fontfile=C.UI_FONT, spacing=1.0):
    """One centred line of interface text (kicker, labels, question)."""
    m = mat(ctx, role, color)
    ob = C.text_obj(name, body, fontfile, size, m, parent, align='CENTER', spacing=spacing,
                    **ctx.style.text_props(role, size))
    ob.location = (0, y, 0)
    return ob


def build(idea, style, tl, seed=1):
    ctx = Ctx(idea, style, tl, seed)
    style.build_world(ctx)
    P = ctx.page
    st = style
    T = tl
    font_name, reg, bold, fscale = C.FONTS[idea['font']]

    # ---------------------------------------------------------------- 1. hook
    hook = C.empty('Hook', P)
    ctx.groups['hook'] = hook
    kick_text = C.KICKERS[idea['type']][idea['hook']]
    kick = ui_line(ctx, 'Kicker', kick_text, 0.3, 'kicker', ctx.muted, hook, 0, spacing=1.15)
    parts = []
    head_e = C.empty('Headline', hook)
    long_head = len(idea['headline']) > 24
    head = C.fit_block('Head', idea['headline'], C.UI_FONT_BOLD, 0.78 if long_head else 1.4,
                       mat(ctx, 'accent', ctx.accent), head_e, 7.6, 4, 0.0, line_height=1.2, word_gap=0.3,
                       **st.text_props('accent', 1.0))
    parts.append((head_e, head))
    if idea['connecting']:
        con_e = C.empty('Connecting', hook)
        con = C.fit_block('Conn', idea['connecting'], C.UI_FONT, 0.5, mat(ctx, 'text', ctx.text), con_e, 7.4, 2, 0.0,
                          line_height=1.3, **st.text_props('text', 0.5))
        parts.append((con_e, con))
    if idea['landing']:
        land_e = C.empty('Landing', hook)
        land = C.fit_block('Land', idea['landing'], C.UI_FONT_BOLD, 0.95, mat(ctx, 'accent', ctx.accent), land_e, 7.6, 3, 0.0,
                           line_height=1.2, **st.text_props('accent', 1.0))
        parts.append((land_e, land))
    # stack the parts from the top, centred on y = 0.6
    gap = 0.55
    heights = [b.height for _, b in parts]
    total = sum(heights) + gap * (len(parts) - 1) + 0.9
    y = 0.6 + total / 2
    kick.location.y = y - 0.3
    y -= 0.9
    for (e, b), h in zip(parts, heights):
        e.location.y = y - h / 2  # blocks are built centred on 0
        y -= h + gap

    t = T.hook_in + 3
    st.appear(ctx, [kick], t, 0, 'fade')
    t += 6
    for e, b in parts:
        st.appear(ctx, [w.obj for w in b.words], t, 3)
        t += 6 + 3 * len(b.words)
    # shrink to a title above the lesson
    f0, f1 = T.lesson_in - 4, T.lesson_in + T.sec(0.7)
    C.keys(hook, 'location', [(f0, (0, 0, 0)), (f1, (0, 6.45 - 0.6 * 0.5, 0))])
    C.keys(hook, 'scale', [(f0, (1, 1, 1)), (f1, (0.5, 0.5, 0.5))])
    st.disappear(ctx, [kick], f0, 'fade')

    # ---------------------------------------------------------------- 2. lesson (an ordinary book page)
    lesson = C.empty('Lesson', P)
    ctx.groups['lesson'] = lesson
    serif = C.block('Serif', idea['lesson'], C.HARD_FONT, 0.62, mat(ctx, 'lesson', ctx.text), lesson, 7.4,
                    line_height=1.45, word_gap=0.3, align='LEFT', center_y=-0.2, **st.text_props('lesson', 0.62))
    ctx.blocks['serif'] = serif
    st.appear(ctx, [w.obj for w in serif.words], T.lesson_in + T.sec(0.5), 1, 'fade' if st.fade_lesson else None)

    # ---------------------------------------------------------------- 3. hard to read
    hard = idea['hard']
    hard_words = [C.Word(w.obj, w.width) for w in serif.words]
    if hard == 'cramped':
        lines = C.layout(hard_words, 0.62, 7.0, line_height=1.0, word_gap=0.16, align='LEFT', scale=0.72)
    elif hard == 'crowd':
        lines = C.layout(hard_words, 0.62, 7.6, line_height=1.05, word_gap=0.02, align='LEFT', scale=0.92)
    elif hard == 'glare':
        lines = C.layout(hard_words, 0.62, 7.0, line_height=1.25, word_gap=0.22, align='LEFT', scale=0.82)
    else:  # faint, swim: same layout as the page
        lines = C.layout(hard_words, 0.62, 7.4, line_height=1.45, word_gap=0.3, align='LEFT', scale=1.0)
    shift = -0.2 - (lines[0][0] + lines[-1][0]) / 2 - 0.62 * 0.35 * hard_words[0].scale
    h0, h1 = T.hard_in, T.hard_in + T.sec(1.1)
    for i, (sw, hw) in enumerate(zip(serif.words, hard_words)):
        o = sw.obj
        d = hw.line * 2
        target = (hw.home[0], hw.home[1] + shift, 0)
        C.keys(o, 'location', [(h0 + d, sw.home), (h1 + d, target)])
        C.keys(o, 'scale', [(h0 + d, (1, 1, 1)), (h1 + d, (hw.scale,) * 3)])
        sw.hard = target
        if hard == 'swim':
            C.keys(o, 'rotation_euler', [(h0, (0, 0, 0)), (T.reveal_in + 1, (0, 0, 0))])
            C.add_noise(o, 'location', 0, 0.09, 9 + i % 5, h0, T.reveal_in, phase=i * 7.3)
            C.add_noise(o, 'location', 1, 0.07, 11 + i % 3, h0, T.reveal_in, phase=i * 3.1)
            C.add_noise(o, 'rotation_euler', 2, 0.06, 14, h0, T.reveal_in, phase=i * 1.7)
    lm = ctx.mats['lesson']
    if hard == 'faint':
        C.mat_color(lm, h0, ctx.text)
        C.mat_color(lm, h1, C.mix(ctx.text, ctx.bg, 0.78))
    if hard == 'glare':
        gm = C.emissive('Glare', C.hexcol('#FFFFFF'), 1.0)
        C.set_blend(gm, 'dithered')
        g = C.plane('Glare', 11, 19, gm, P, loc=(0, 0, -0.4))
        C.mat_fade(gm, 0, 0.0, 'CONSTANT')
        C.mat_fade(gm, h0, 0.0)
        C.mat_fade(gm, h1, 0.7)
        C.mat_fade(gm, T.reveal_in, 0.7)
        C.mat_fade(gm, T.reveal_out, 0.0)
        C.mat_color(lm, h0, ctx.text)
        C.mat_color(lm, h1, C.hexcol('#A8A8A8'))
    ask = ui_line(ctx, 'Ask', C.ASKS[idea['ask']], 0.5, 'ask', ctx.accent, P, -5.9, fontfile=C.UI_FONT_BOLD)
    st.appear(ctx, [ask], T.ask_in, 0)
    st.disappear(ctx, [ask], T.reveal_in)

    # ---------------------------------------------------------------- 4. reveal into the reading font
    easy_size = 0.6 * fscale
    easy = C.block('Easy', idea['lesson'], reg, easy_size, mat(ctx, 'easy', ctx.text), lesson, 7.6,
                   line_height=1.6, word_gap=0.42, align='LEFT', center_y=-0.2, place=True,
                   **st.text_props('easy', easy_size))
    for _ in range(3):  # very long lessons: tighten a little so the page still fits under the title
        if easy.height <= 7.6:
            break
        for w in easy.words:
            C.bpy.data.objects.remove(w.obj)
        easy_size *= 0.92
        easy = C.block('Easy', idea['lesson'], reg, easy_size, ctx.mats['easy'], lesson, 7.6,
                       line_height=1.55, word_gap=0.4, align='LEFT', center_y=-0.2, **st.text_props('easy', easy_size))
    ctx.blocks['easy'] = easy
    for w in easy.words:
        C.ensure_scale_hidden(w.obj, T.reveal_in)
    old = [w.obj for w in serif.words]
    st.reveal(ctx, old, easy, T.reveal_in, T.reveal_out)
    label = ui_line(ctx, 'FontName', font_name, 0.36, 'kicker', ctx.muted, P, 4.55, spacing=1.1)
    st.appear(ctx, [label], T.reveal_out, 0, 'fade')
    feats = T.features
    st.disappear(ctx, [label], feats[0][1] - 3 if feats else T.cta_in - 6, 'fade')

    # ---------------------------------------------------------------- 5. features
    shown_words = easy.words
    for n, (f, a, b) in enumerate(feats):
        lab = ui_line(ctx, 'Label.' + f, C.FEATURE_LABELS[f], 0.42, 'label', ctx.accent, P, 4.55, fontfile=C.UI_FONT_BOLD)
        st.appear(ctx, [lab], a, 0)
        st.disappear(ctx, [lab], b - 4)
        if f == 'bionic':
            bi = C.make_words('Bionic', idea['lesson'], reg, easy_size, mat(ctx, 'easy', ctx.text), lesson,
                              bold_file=bold, bionic=True, **st.text_props('easy', easy_size))
            for bw, ew in zip(bi, easy.words):
                bw.home, bw.line = ew.home, ew.line
                bw.obj.location = ew.home
                C.ensure_scale_hidden(bw.obj, a)
            st.swap(ctx, [w.obj for w in easy.words], [w.obj for w in bi], a + 8)
            shown_words = bi
        elif f == 'tint':
            ov = st.overlay(ctx)
            st.overlay_in(ctx, ov, a + 4)
            ctx.overlay = ov
        elif f == 'ruler':
            st.ruler(ctx, easy, a + 4, b - 2)
    ctx.shown_words = shown_words

    # ---------------------------------------------------------------- 6. close
    c0 = T.cta_in
    st.exit_group(ctx, hook, c0)
    st.exit_group(ctx, lesson, c0)
    if ctx.overlay is not None:
        st.overlay_out(ctx, ctx.overlay, c0 + 6)
    cta = C.empty('CTA', P)
    big, small = C.CTAS[idea['cta']]
    cb = C.fit_block('CtaBig', big, C.UI_FONT_BOLD, 1.0, mat(ctx, 'accent', ctx.accent), cta, 7.6, 2, 1.6,
                     line_height=1.2, **st.text_props('accent', 1.0))
    cs = C.fit_block('CtaSmall', small, C.UI_FONT, 0.46, mat(ctx, 'text', ctx.text), cta, 7.4, 2, 0.15,
                     line_height=1.3, **st.text_props('text', 0.46))
    pill = st.pill(ctx, cta, (0, -1.7, 0))
    st.appear(ctx, [w.obj for w in cb.words], c0 + T.sec(0.5), 3)
    st.appear(ctx, [w.obj for w in cs.words], c0 + T.sec(1.0), 2)
    st.appear(ctx, [pill], c0 + T.sec(1.5), 0, 'pop')

    st.extras(ctx)
    st.finish(ctx)
    return ctx
