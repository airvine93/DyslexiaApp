/**
 * "Help me choose": a short, tap-only setup that shows the same sentence a few different ways and lets the person
 * pick whichever feels easiest, one question at a time. Nothing to type and no sliders.
 */
import { applyBionic, fontById, fontStack, FONTS, PAGE_THEMES, themeById, type Settings } from '@dr/core';

const SAMPLE = 'Every morning the little boat went out across the bay, and every evening it came home full of fish.';

interface Choice { label: string; change: Partial<Settings> }
interface Step { question: string; choices: (s: Settings) => Choice[] }

const STEPS: Step[] = [
  {
    question: 'Which of these is easiest to read?',
    choices: () => [
      ...FONTS.filter((f) => ['opendyslexic', 'lexend', 'atkinson-hyperlegible-next', 'andika', 'comic-neue'].includes(f.id))
        .map((f) => ({ label: f.name, change: { fontOn: true, font: f.id } })),
      { label: 'An ordinary font', change: { fontOn: false } },
    ],
  },
  {
    question: 'Does making the start of each word bold help?',
    choices: () => [
      { label: 'No bold', change: { bionicOn: false } },
      { label: 'A little', change: { bionicOn: true, bionic: 30 } },
      { label: 'Some', change: { bionicOn: true, bionic: 45 } },
      { label: 'A lot', change: { bionicOn: true, bionic: 60 } },
    ],
  },
  {
    question: 'How much space between letters and lines?',
    choices: () => [
      { label: 'Normal', change: { letterSpacing: 0, lineHeight: 1.5 } },
      { label: 'Wider', change: { letterSpacing: 8, lineHeight: 1.7 } },
      { label: 'Widest', change: { letterSpacing: 18, lineHeight: 2 } },
    ],
  },
  {
    question: 'Which page colour is most comfortable?',
    choices: () => PAGE_THEMES.map((t) => ({ label: t.name, change: { theme: t.id } })),
  },
];

function sample(s: Settings): HTMLElement {
  const p = document.createElement('p');
  p.className = 'setup-sample';
  p.textContent = SAMPLE;
  const font = s.fontOn ? fontById(s.font) : undefined;
  const theme = themeById(s.theme);
  Object.assign(p.style, {
    fontFamily: font ? fontStack(font) : 'system-ui, sans-serif',
    letterSpacing: `${s.letterSpacing / 100}em`,
    wordSpacing: `${0.1 + s.letterSpacing / 50}em`,
    lineHeight: String(s.lineHeight),
    ...(theme ? { background: theme.paper, color: theme.ink } : {}),
  });
  applyBionic(p, s.bionicOn ? s.bionic : 0);
  return p;
}

/** Run the setup in a dialog. `apply` is called with each choice straight away, so the page changes behind it too. */
export function runSetup(get: () => Settings, apply: (change: Partial<Settings>) => void, done: () => void): void {
  const dialog = document.createElement('dialog');
  dialog.className = 'setup';
  dialog.setAttribute('aria-labelledby', 'setup-q');
  document.body.append(dialog);
  let step = 0;

  const close = () => { dialog.close(); dialog.remove(); done(); };
  dialog.addEventListener('cancel', (e) => { e.preventDefault(); close(); });

  const draw = () => {
    dialog.replaceChildren();
    const head = document.createElement('div');
    head.className = 'setup-head';
    const count = document.createElement('span');
    count.className = 'hint';
    count.textContent = step < STEPS.length ? `Question ${step + 1} of ${STEPS.length}` : 'All done';
    const skip = document.createElement('button');
    skip.type = 'button'; skip.textContent = step < STEPS.length ? 'Skip setup' : 'Close';
    skip.addEventListener('click', close);
    head.append(count, skip);
    const q = document.createElement('h2');
    q.id = 'setup-q';
    dialog.append(head, q);

    if (step >= STEPS.length) {
      q.textContent = 'Here is how your reading will look';
      const p = document.createElement('p');
      p.textContent = 'You can change any of this later in Settings, or press Help me choose again.';
      const start = document.createElement('button');
      start.type = 'button'; start.className = 'primary'; start.textContent = 'Start reading';
      start.addEventListener('click', close);
      dialog.append(sample(get()), p, start);
      start.focus();
      return;
    }

    q.textContent = STEPS[step]!.question;
    const grid = document.createElement('div');
    grid.className = 'setup-choices';
    for (const c of STEPS[step]!.choices(get())) {
      const b = document.createElement('button');
      b.type = 'button';
      const label = document.createElement('span');
      label.className = 'setup-label';
      label.textContent = c.label;
      b.append(sample({ ...get(), ...c.change }), label);
      b.addEventListener('click', () => { apply(c.change); step++; draw(); });
      grid.append(b);
    }
    dialog.append(grid);
    if (step > 0) {
      const back = document.createElement('button');
      back.type = 'button'; back.textContent = 'Back';
      back.addEventListener('click', () => { step--; draw(); });
      dialog.append(back);
    }
    (grid.querySelector('button') as HTMLButtonElement | null)?.focus();
  };

  draw();
  dialog.showModal();
}
