/**
 * Buy again (spec P1, P2, P5, T1, T2, the Mark finished toast) adds products to the shopping
 * list. `shopping/api.ts` registers the action at module load (imported by `app/_layout.tsx`);
 * before that `useBuyAgain()` returns null and Buy again buttons stay hidden.
 */
export type BuyAgain = (products: { id: number; name: string }[]) => void;

let useImpl: () => BuyAgain | null = () => null;

/** Called once at module load by `shopping/api.ts`; the hook must follow the rules of hooks. */
export function registerBuyAgain(hook: () => BuyAgain | null): void {
  useImpl = hook;
}

export function useBuyAgain(): BuyAgain | null {
  return useImpl();
}
