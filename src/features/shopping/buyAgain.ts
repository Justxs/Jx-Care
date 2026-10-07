/**
 * Buy again (spec P1, P2, P5) adds products to the shopping list. The shopping list arrives in
 * task 034, which registers its hook here; until then `useBuyAgain()` returns null and every
 * Buy again button stays hidden.
 */
export type BuyAgain = (products: { id: number; name: string }[]) => void;

let useImpl: () => BuyAgain | null = () => null;

/** Called once at module load by task 034; the hook must follow the rules of hooks. */
export function registerBuyAgain(hook: () => BuyAgain | null): void {
  useImpl = hook;
}

export function useBuyAgain(): BuyAgain | null {
  return useImpl();
}
