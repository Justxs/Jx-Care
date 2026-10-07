/**
 * Called after a product is saved from the product form. Task 021 shows the reminder ask
 * ("Get a reminder before it expires?") here when `isFirstWithExpiry` is true. Does nothing yet.
 */
export function onProductSaved(
  _product: { id: number; name: string },
  _opts: { isFirstWithExpiry: boolean },
): void {}
