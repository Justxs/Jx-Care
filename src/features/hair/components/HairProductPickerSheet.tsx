import { ProductPickerSheet } from '@/features/products/components/ProductPickerSheet';

export type HairProductPickerSheetProps = {
  open: boolean;
  onClose: () => void;
  /** Product ids picked so far. */
  selected: readonly number[];
  /** The new selection, in the order picked. */
  onPick: (ids: number[]) => void;
};

/**
 * Several Hair or Both products for a wash: the shared R4 picker in `multiple` mode (search,
 * Recent, every product by name, expired ones under "Can't be picked", Add new product).
 */
export function HairProductPickerSheet({
  open,
  onClose,
  selected,
  onPick,
}: HairProductPickerSheetProps) {
  return (
    <ProductPickerSheet
      open={open}
      onClose={onClose}
      area="hair"
      multiple
      selected={selected}
      onPick={onPick}
    />
  );
}
