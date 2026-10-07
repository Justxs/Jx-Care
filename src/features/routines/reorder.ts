/**
 * Drag-to-reorder maths for the step list (R2). Rows can differ in height (Lithuanian names wrap),
 * so every function takes the measured row heights in list order. The worklet ones run on the UI
 * thread while a finger moves.
 */

/** The list with the item at `from` moved to `to`. */
export function moveItem<T>(items: readonly T[], from: number, to: number): T[] {
  const next = [...items];
  if (from < 0 || from >= next.length || to < 0 || to >= next.length || from === to) return next;
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item as T);
  return next;
}

/**
 * Where the row dragged from `from` by `dy` points would land: one slot for every other row whose
 * middle its centre has passed.
 */
export function dragTarget(heights: readonly number[], from: number, dy: number): number {
  'worklet';
  let top = 0;
  for (let k = 0; k < from; k++) top += heights[k] ?? 0;
  const centre = top + dy + (heights[from] ?? 0) / 2;
  let y = 0;
  let slot = 0;
  for (let k = 0; k < heights.length; k++) {
    const h = heights[k] ?? 0;
    if (k !== from && y + h / 2 < centre) slot++;
    y += h;
  }
  return slot;
}

/** How far the dragged row moves from its own place to settle into slot `to`. */
export function dropOffset(heights: readonly number[], from: number, to: number): number {
  'worklet';
  let offset = 0;
  if (to > from) for (let k = from + 1; k <= to; k++) offset += heights[k] ?? 0;
  else for (let k = to; k < from; k++) offset -= heights[k] ?? 0;
  return offset;
}

/** How far row `index` slides aside while the row from `from` hovers over slot `to`. */
export function rowShift(index: number, from: number, to: number, draggedHeight: number): number {
  'worklet';
  if (from < 0 || index === from) return 0;
  if (from < index && index <= to) return -draggedHeight;
  if (to <= index && index < from) return draggedHeight;
  return 0;
}
