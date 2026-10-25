// Renders 1200x630 social preview cards at build time (satori → SVG → PNG).
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';

const require = createRequire(import.meta.url);
const font = (pkg: string, file: string) => readFileSync(require.resolve(`${pkg}/files/${file}`));
const fonts = [
  { name: 'Inter', data: font('@fontsource/inter', 'inter-latin-600-normal.woff'), weight: 600 as const, style: 'normal' as const },
  { name: 'Plex', data: font('@fontsource/ibm-plex-mono', 'ibm-plex-mono-latin-400-normal.woff'), weight: 400 as const, style: 'normal' as const },
  { name: 'Plex', data: font('@fontsource/ibm-plex-mono', 'ibm-plex-mono-latin-500-normal.woff'), weight: 500 as const, style: 'normal' as const },
];

type Node = { type: string; props: Record<string, unknown> };
const h = (type: string, style: Record<string, unknown>, children?: unknown): Node => ({ type, props: { style, children } });

export interface Card {
  kicker: string; // e.g. "writing" or "work"
  title: string;
  footer: string;
}

export async function renderCard({ kicker, title, footer }: Card): Promise<Buffer> {
  const size = title.length > 70 ? 52 : title.length > 40 ? 60 : 68;
  const tree = h(
    'div',
    {
      width: 1200, height: 630, display: 'flex', flexDirection: 'column', boxSizing: 'border-box', background: '#0f0f11',
      borderLeft: '8px solid #7cb4f5', padding: '72px 80px', color: '#d7d7db',
    },
    [
      h('div', { display: 'flex', fontFamily: 'Plex', fontSize: 28, color: '#85858d' }, [
        h('span', {}, '~/'),
        h('span', { color: '#7cb4f5', fontWeight: 500 }, 'rahul'),
        h('span', { marginLeft: 16 }, `$ cat ${kicker}`),
      ]),
      h('div', { display: 'flex', width: 1032, fontFamily: 'Inter', fontWeight: 600, fontSize: size, lineHeight: 1.15, color: '#f3f3f5', marginTop: 48, letterSpacing: -1 }, title),
      h('div', { display: 'flex', width: 1032, marginTop: 'auto', justifyContent: 'space-between', fontFamily: 'Plex', fontSize: 24 }, [
        h('span', { color: '#f0a868' }, footer),
        h('span', { color: '#85858d' }, 'raaulc.com'),
      ]),
    ],
  );
  const svg = await satori(tree as never, { width: 1200, height: 630, fonts });
  return new Resvg(svg).render().asPng();
}
