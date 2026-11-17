// The see-through, click-through window that tints the whole screen on desktop. The app tells it what colour to be.
import { listen } from '@tauri-apps/api/event';

const t = document.getElementById('t')!;
const apply = (p: { colour: string; alpha: number }) => {
  const hex = p.colour.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
  t.style.background = `rgba(${r}, ${g}, ${b}, ${p.alpha})`;
};
void listen<{ colour: string; alpha: number }>('tint', (e) => apply(e.payload));
const initial = new URLSearchParams(location.search);
if (initial.get('c')) apply({ colour: `#${initial.get('c')}`, alpha: Number(initial.get('a') ?? 0.3) });
