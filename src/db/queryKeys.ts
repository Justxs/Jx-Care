/**
 * Query keys for every area, so invalidation is consistent. Invalidating a prefix (for example
 * `qk.products.all`) refreshes every query below it.
 */

export type ProductListFilters = Record<string, unknown>;

export const qk = {
  settings: ['settings'] as const,
  // Task 012
  products: {
    all: ['products'] as const,
    list: (f: ProductListFilters) => ['products', 'list', f] as const,
    detail: (id: number) => ['products', 'detail', id] as const,
    archive: (sort: string) => ['products', 'archive', sort] as const,
    counts: ['products', 'counts'] as const,
    brands: ['products', 'brands'] as const,
  },
  // Task 029
  ingredients: {
    all: ['ingredients'] as const,
    list: ['ingredients', 'list'] as const,
    groups: ['ingredients', 'groups'] as const,
  },
  conflicts: {
    all: ['conflicts'] as const,
    rules: ['conflicts', 'rules'] as const,
    input: ['conflicts', 'input'] as const,
  },
  avoid: { all: ['avoid'] as const },
  // Task 022
  routines: {
    all: ['routines'] as const,
    list: ['routines', 'list'] as const,
    detail: (id: number) => ['routines', 'detail', id] as const,
    player: (id: number, day: string) => ['routines', 'player', id, day] as const,
  },
  // Task 025
  today: {
    all: ['today'] as const,
    day: (day: string) => ['today', day] as const,
  },
  // Task 028
  calendar: {
    all: ['calendar'] as const,
    month: (view: string, month: string) => ['calendar', view, month] as const,
    day: (day: string) => ['calendar', 'day', day] as const,
    streaks: ['calendar', 'streaks'] as const,
  },
  // Task 031
  hair: {
    all: ['hair'] as const,
    tasks: ['hair', 'tasks'] as const,
    detail: (id: number) => ['hair', 'detail', id] as const,
  },
  // Task 034
  shopping: {
    all: ['shopping'] as const,
    list: ['shopping', 'list'] as const,
    suggestions: ['shopping', 'suggestions'] as const,
  },
  // Task 035
  progress: {
    all: ['progress'] as const,
    list: (area: string) => ['progress', 'list', area] as const,
  },
  // Task 038
  condition: {
    all: ['condition'] as const,
    day: (day: string) => ['condition', 'day', day] as const,
  },
  // Task 039
  notes: {
    all: ['notes'] as const,
    product: (id: number) => ['notes', 'product', id] as const,
    day: (day: string) => ['notes', 'day', day] as const,
  },
  // Task 020
  notifications: { permission: ['notifications', 'permission'] as const },
  // Task 040
  backup: { all: ['backup'] as const },
} as const;
