import fs from 'fs';
import path from 'path';

import { palette } from './colors';

function parseBlock(css: string, selector: string): Record<string, string> {
  const start = css.indexOf(`${selector} {`);
  const end = css.indexOf('}', start);
  const block = css.slice(start, end);
  const vars: Record<string, string> = {};
  for (const m of block.matchAll(/--([\w-]+):\s*(\d+)\s+(\d+)\s+(\d+);/g)) {
    const hex = [m[2], m[3], m[4]]
      .map((n) => Number(n).toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase();
    vars[m[1]!] = `#${hex}`;
  }
  return vars;
}

describe('colors.ts matches global.css', () => {
  const css = fs.readFileSync(path.join(__dirname, '../../global.css'), 'utf8');
  const light = parseBlock(css, ':root');
  const dark = { ...light, ...parseBlock(css, '.dark:root') };

  it.each(Object.keys(palette.light))('light %s', (key) => {
    expect(light[key]).toBe(palette.light[key as keyof typeof palette.light]);
  });

  it.each(Object.keys(palette.dark))('dark %s', (key) => {
    expect(dark[key]).toBe(palette.dark[key as keyof typeof palette.dark]);
  });

  it('has a value for every css variable', () => {
    expect(Object.keys(light).sort()).toEqual(Object.keys(palette.light).sort());
  });
});
