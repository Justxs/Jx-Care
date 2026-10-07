import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';

import { showExpiringProducts } from '@/features/products/listState';
import { ProductsScreen } from '@/features/products/screens/ProductsScreen';

/** `?filter=expiring` (the weekly digest notification) opens the list filtered, once. */
export default function ProductsRoute() {
  const { filter } = useLocalSearchParams<{ filter?: string }>();
  useEffect(() => {
    if (filter !== 'expiring') return;
    showExpiringProducts();
    router.setParams({ filter: undefined });
  }, [filter]);
  return <ProductsScreen />;
}
