import { readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

import { getRoutes } from 'expo-router/build/getRoutes';
import { inMemoryContext } from 'expo-router/build/testing-library/context-stubs';

const appDir = join(__dirname, '../../../app');
const stub = () => null;

function routeFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return routeFiles(full);
    return name.endsWith('.tsx') ? [relative(appDir, full).replace(/\.tsx$/, '')] : [];
  });
}

type Node = { route: string; children: Node[]; contextKey: string };

function leafPaths(node: Node, prefix = ''): string[] {
  const segment = node.route
    .split('/')
    .filter((s) => s && !s.startsWith('(') && s !== 'index' && s !== '_layout')
    .join('/');
  const path = [prefix, segment].filter(Boolean).join('/');
  if (node.children.length === 0) return [`/${path}`];
  return node.children.flatMap((c) => leafPaths(c, path));
}

describe('route tree', () => {
  const files = routeFiles(appDir);
  const tree = getRoutes(
    inMemoryContext(Object.fromEntries(files.map((f) => [f, stub]))) as never,
    { platform: 'ios', skipGenerated: true, ignoreEntryPoints: true },
  ) as unknown as Node;

  it('builds without conflicting screens', () => {
    expect(tree).toBeTruthy();
    const paths = leafPaths(tree).filter(
      (p) => !p.startsWith('/_sitemap') && !p.includes('+not-found'),
    );
    expect(new Set(paths).size).toBe(paths.length);
  });

  it('has every route from the navigation map', () => {
    const paths = new Set(leafPaths(tree));
    for (const p of [
      '/',
      '/welcome',
      '/create-pin',
      '/confirm-pin',
      '/recovery',
      '/biometrics',
      '/products',
      '/products/[id]',
      '/products/archive',
      '/routines',
      '/routines/[id]',
      '/routines/hair/[id]',
      '/calendar',
      '/calendar/day/[day]',
      '/calendar/progress',
      '/calendar/week/[area]/[weekStart]',
      '/settings',
      '/settings/ingredients',
      '/settings/conflicts',
      '/settings/avoid',
      '/settings/reminders',
      '/settings/security',
      '/settings/preferences',
      '/settings/backup',
      '/product-form',
      '/player/[routineId]',
      '/player/[routineId]/done',
      '/progress/camera',
      '/progress/review',
      '/progress/compare',
      '/hair/done/[taskId]',
    ]) {
      expect(paths).toContain(p);
    }
  });
});
