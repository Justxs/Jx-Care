import { ProductPickerSheet } from '@/features/products/components/ProductPickerSheet';

export type StepProductPickerProps = {
  open: boolean;
  onClose: () => void;
  /** The picked product; the sheet closes itself. */
  onPick: (productId: number) => void;
};

/** "Pick another" in the player: the shared R4 product picker, skin products only. */
export function StepProductPicker({ open, onClose, onPick }: StepProductPickerProps) {
  return (
    <ProductPickerSheet
      open={open}
      onClose={onClose}
      area="skin"
      onPick={([id]) => {
        if (id !== undefined) onPick(id);
      }}
    />
  );
}
