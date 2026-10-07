import * as React from "react";
export type IconName = "alert-triangle"|"archive"|"arrow-left"|"bell"|"calendar"|"camera"|"check"|"chevron-right"|"delete"|"droplets"|"flame"|"globe"|"grip-vertical"|"home"|"list-checks"|"lock"|"moon"|"package"|"plus"|"scan-face"|"search"|"shopping-cart"|"sliders"|"sparkles"|"sun"|"timer"|"images"|"notebook-pen"|"star"|"scissors"|"palette"|"ellipsis"|"x"|"ban"|"trash-2"|"pencil"|"clock"|"columns-2"|"info"|"languages"|"fingerprint"|"download"|"rotate-ccw"|"key-round"|"thumbs-up"|"thumbs-down"|"sun-moon"|"chevron-left"|"chevron-down"|"image-plus"|"coins"|"pipette"|"droplet"|"flask-round"|"spray-can";
export type Area = "skin" | "hair" | "both";
export type ExpiryStatus = "ok" | "expiring" | "expired" | "unopened" | "nodate" | "avoid";
export interface IconProps { name: IconName; size?: 16|18|20|24|number; color?: string; label?: string; strokeWidth?: number }
export interface ButtonProps { variant?: "primary"|"secondary"|"ghost"|"danger"; size?: "md"|"sm"; icon?: IconName; block?: boolean; disabled?: boolean; onPress?: () => void; children: React.ReactNode }
/** `children` overrides the default label ("9 days"); `avoid` adds the ban icon. Min width 44 with tabular numbers. */
export interface BadgeProps { status?: ExpiryStatus; children?: React.ReactNode }
export interface AreaTagProps { area?: Area; children?: React.ReactNode }
export interface CheckboxProps { checked: boolean; onCheckedChange?: (checked: boolean) => void; label?: string; "aria-label"?: string; disabled?: boolean }
export interface SwitchProps { checked: boolean; onCheckedChange?: (checked: boolean) => void; "aria-label"?: string; disabled?: boolean }
export interface ToggleGroupItem { value: string; label: string; icon?: IconName; count?: number }
export interface ToggleGroupProps { items: ToggleGroupItem[]; value: string; onValueChange?: (value: string) => void; size?: "md"|"sm"; "aria-label"?: string }
export interface ProgressProps { value: number; max?: number; "aria-label"?: string }
export interface SeparatorProps { inset?: boolean }
export interface InputProps { label?: string; value?: string; defaultValue?: string; placeholder?: string; hint?: string; error?: string; inputMode?: "text"|"numeric"; validates?: boolean; noHelper?: boolean; secret?: boolean; type?: "text"|"password"; onChange?: (e: unknown) => void }
export interface AlertDialogProps { open?: boolean; title: string; description: string; actionLabel?: string; cancelLabel?: string; destructive?: boolean; onAction?: () => void; onCancel?: () => void }
export interface CardProps { title?: string; flush?: boolean; children: React.ReactNode }
export interface ProductRowProps { name: string; meta: string; expiry?: string; status?: ExpiryStatus; badge?: string; avoid?: boolean; area?: Area; category?: string; src?: string; onPress?: () => void }
export interface RoutineStepProps { index?: number; name: string; note?: string; checked: boolean; onCheckedChange?: (checked: boolean) => void; conflict?: string }
export interface StreakCardProps { area?: Area; value: number; best: number; restarted?: boolean }
export interface PinPadProps { filled: 0|1|2|3|4; biometric?: boolean; onDigit?: (digit: string) => void; onDelete?: () => void }
export interface TabBarProps { active?: "today"|"products"|"routines"|"calendar"|"settings"; onChange?: (tab: string) => void; labels?: Partial<Record<"today"|"products"|"routines"|"calendar"|"settings", string>> }
export interface ScreenHeaderProps { title: string; subtitle?: string; /** @deprecated use subtitle (shown under the title) */ overline?: string; onBack?: () => void; close?: boolean; back?: boolean; backLabel?: string; action?: { icon: IconName; label: string; onPress?: () => void; primary?: boolean; text?: boolean } }
export interface ChipProps { selected?: boolean; onPressedChange?: (selected: boolean) => void; icon?: IconName; count?: number; tone?: "danger"; children: React.ReactNode }
export interface RatingProps { value: number; onValueChange?: (value: number) => void; max?: number; kind?: "stars"|"scale"; label?: string; "aria-label"?: string }
export interface SelectFieldProps { label?: string; value?: string; placeholder?: string; hint?: string; error?: string; noHelper?: boolean; onPress?: () => void }
export interface ListRowProps { label: string; detail?: string; icon?: IconName; area?: Area; value?: string; trailing?: "chevron"|"switch"|"value"|"none"; checked?: boolean; onCheckedChange?: (checked: boolean) => void; tone?: "danger"; onPress?: () => void }
export interface SkeletonProps { width?: number|string; height?: number; radius?: number }
export interface WeekdayPickerProps { value: number[]; onValueChange?: (days: number[]) => void; short?: string[]; labels?: string[]; "aria-label"?: string }
export interface StepDotsProps { count: number; index: number }
export interface PhotoTileProps { src?: string; date?: string; area?: Area; selected?: boolean; add?: boolean; label?: string }
export interface SheetFrameProps { title: string; onCancel?: () => void; cancelLabel?: string; footer?: React.ReactNode; children: React.ReactNode }
export interface ProgressRingProps { value: number; max?: number; size?: number; label?: string; "aria-label"?: string }
export interface ToastProps { icon?: IconName; actionLabel?: string; onAction?: () => void; children: React.ReactNode }
export interface WeekdayDotsProps { value: number[]; short?: string[]; "aria-label"?: string }
export interface StreakChipProps { area?: "skin" | "hair"; value: number; label?: string; onPress?: () => void }
export interface EmptyStateProps { icon?: IconName; title: string; actionLabel?: string; actionIcon?: IconName; onAction?: () => void; secondaryLabel?: string; onSecondary?: () => void; children?: React.ReactNode }
/** Motion scale in ms and cubic-bezier control points; use with Reanimated `withTiming(v, { duration, easing: Easing.bezier(...) })`. */
export declare const motion: { duration: { fast: 150; base: 200; slow: 300; reduced: 100 }; easing: { standard: [number, number, number, number]; enter: [number, number, number, number]; exit: [number, number, number, number] }; spring: { damping: number; stiffness: number; mass: number } };
export declare function Icon(props: IconProps): React.JSX.Element;
export declare function Button(props: ButtonProps): React.JSX.Element;
export declare function Badge(props: BadgeProps): React.JSX.Element;
export declare function AreaTag(props: AreaTagProps): React.JSX.Element;
export declare function Checkbox(props: CheckboxProps): React.JSX.Element;
export declare function Switch(props: SwitchProps): React.JSX.Element;
export declare function ToggleGroup(props: ToggleGroupProps): React.JSX.Element;
export declare function Progress(props: ProgressProps): React.JSX.Element;
export declare function Separator(props: SeparatorProps): React.JSX.Element;
export declare function Input(props: InputProps): React.JSX.Element;
export declare function AlertDialog(props: AlertDialogProps): React.JSX.Element;
export declare function Card(props: CardProps): React.JSX.Element;
export declare function ProductRow(props: ProductRowProps): React.JSX.Element;
export declare function RoutineStep(props: RoutineStepProps): React.JSX.Element;
export declare function StreakCard(props: StreakCardProps): React.JSX.Element;
export declare function PinPad(props: PinPadProps): React.JSX.Element;
export declare function TabBar(props: TabBarProps): React.JSX.Element;
export declare function ScreenHeader(props: ScreenHeaderProps): React.JSX.Element;
export declare function Chip(props: ChipProps): React.JSX.Element;
export declare function Rating(props: RatingProps): React.JSX.Element;
export declare function SelectField(props: SelectFieldProps): React.JSX.Element;
export declare function ListRow(props: ListRowProps): React.JSX.Element;
export declare function Skeleton(props: SkeletonProps): React.JSX.Element;
export declare function WeekdayPicker(props: WeekdayPickerProps): React.JSX.Element;
export declare function StepDots(props: StepDotsProps): React.JSX.Element;
export declare function PhotoTile(props: PhotoTileProps): React.JSX.Element;
export declare function SheetFrame(props: SheetFrameProps): React.JSX.Element;
export declare function ProgressRing(props: ProgressRingProps): React.JSX.Element;
export declare function Toast(props: ToastProps): React.JSX.Element;
export declare function WeekdayDots(props: WeekdayDotsProps): React.JSX.Element;
export declare function StreakChip(props: StreakChipProps): React.JSX.Element;
export declare function EmptyState(props: EmptyStateProps): React.JSX.Element;
export interface ConflictTagProps { mild?: boolean; label?: string; onPress?: () => void; 'aria-label'?: string }
/** The one conflict marker: amber pill with a triangle and the word Conflict (or Mild conflict). Tappable when onPress is set; opens the conflict details. */
export declare function ConflictTag(props: ConflictTagProps): React.JSX.Element;
export declare const ICON_NAMES: IconName[];
export interface FabProps { icon?: string; children: React.ReactNode; onPress?: () => void }
/** The one add action on a list screen: a labelled pill at the bottom right, inside thumb reach. */
export declare function Fab(props: FabProps): React.JSX.Element;
export interface RadioListItem { value: string; label: string; detail?: string; lead?: React.ReactNode }
export interface RadioListProps { items: RadioListItem[]; value: string; onValueChange?: (v: string) => void; 'aria-label'?: string; className?: string }
/** A vertical choice list for 3+ options or long labels; use it instead of ToggleGroup when Lithuanian labels would not fit. */
export declare function RadioList(props: RadioListProps): React.JSX.Element;
