import {
  Archive,
  ArrowLeft,
  Ban,
  Bell,
  Calendar,
  CalendarCheck,
  Camera,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  CircleQuestionMark,
  Clock,
  Coins,
  Columns2,
  Copy,
  Delete,
  Download,
  Droplet,
  Droplets,
  Ellipsis,
  Eye,
  EyeOff,
  FingerprintPattern,
  FlaskRound,
  Funnel,
  Globe,
  GripVertical,
  House,
  ImagePlus,
  Images,
  Info,
  KeyRound,
  Languages,
  LayoutGrid,
  Link,
  List,
  ListChecks,
  Lock,
  Moon,
  NotebookPen,
  Package,
  PackageOpen,
  Palette,
  Pencil,
  Pipette,
  Plus,
  RotateCcw,
  ScanFace,
  Scissors,
  Search,
  Settings,
  Share2,
  Shield,
  ShoppingBag,
  ShoppingCart,
  SlidersHorizontal,
  SprayCan,
  Star,
  Sun,
  SunMoon,
  SwitchCamera,
  ThumbsDown,
  ThumbsUp,
  Timer,
  Trash,
  TriangleAlert,
  Upload,
  X,
  type LucideIcon,
} from 'lucide-react-native';

import { useThemeColors, type ColorToken } from '@/theme/colors';

/** Icons in use, by their Lucide kebab-case name. Never a flame or sparkles. */
export const icons = {
  'alert-triangle': TriangleAlert,
  archive: Archive,
  'arrow-left': ArrowLeft,
  ban: Ban,
  bell: Bell,
  calendar: Calendar,
  'calendar-check': CalendarCheck,
  camera: Camera,
  check: Check,
  'check-check': CheckCheck,
  'chevron-down': ChevronDown,
  'chevron-left': ChevronLeft,
  'chevron-right': ChevronRight,
  'circle-check': CircleCheck,
  'circle-help': CircleQuestionMark,
  clock: Clock,
  coins: Coins,
  'columns-2': Columns2,
  copy: Copy,
  delete: Delete,
  download: Download,
  droplet: Droplet,
  droplets: Droplets,
  ellipsis: Ellipsis,
  eye: Eye,
  'eye-off': EyeOff,
  fingerprint: FingerprintPattern,
  'flask-round': FlaskRound,
  filter: Funnel,
  globe: Globe,
  'grip-vertical': GripVertical,
  home: House,
  'image-plus': ImagePlus,
  images: Images,
  info: Info,
  'key-round': KeyRound,
  languages: Languages,
  'layout-grid': LayoutGrid,
  link: Link,
  list: List,
  'list-checks': ListChecks,
  lock: Lock,
  moon: Moon,
  'notebook-pen': NotebookPen,
  package: Package,
  'package-open': PackageOpen,
  palette: Palette,
  pencil: Pencil,
  pipette: Pipette,
  plus: Plus,
  'rotate-ccw': RotateCcw,
  'scan-face': ScanFace,
  scissors: Scissors,
  search: Search,
  settings: Settings,
  'share-2': Share2,
  shield: Shield,
  'shopping-bag': ShoppingBag,
  'shopping-cart': ShoppingCart,
  sliders: SlidersHorizontal,
  'spray-can': SprayCan,
  star: Star,
  sun: Sun,
  'sun-moon': SunMoon,
  'switch-camera': SwitchCamera,
  'thumbs-down': ThumbsDown,
  'thumbs-up': ThumbsUp,
  timer: Timer,
  'trash-2': Trash,
  upload: Upload,
  x: X,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof icons;

export type IconProps = {
  name: IconName;
  size?: 16 | 18 | 20 | 24 | number;
  /** A colour token; defaults to `ink`. */
  tone?: ColorToken;
  /** A raw colour, for the always-dark camera. Prefer `tone`. */
  color?: string;
  /** Only when the icon carries meaning on its own. */
  accessibilityLabel?: string;
  strokeWidth?: number;
  fill?: string;
  /** Fill the shape with its stroke colour (a picked star). */
  filled?: boolean;
};

/** A Lucide icon by name, stroke 2 with round caps, in a theme colour. */
export function Icon({
  name,
  size = 20,
  tone = 'ink',
  color,
  accessibilityLabel,
  strokeWidth = 2,
  fill,
  filled,
}: IconProps) {
  const colors = useThemeColors();
  const Glyph = icons[name];
  const stroke = color ?? colors[tone];
  return (
    <Glyph
      size={size}
      color={stroke}
      strokeWidth={strokeWidth}
      fill={fill ?? (filled ? stroke : 'none')}
      accessible={!!accessibilityLabel}
      aria-hidden={!accessibilityLabel}
      accessibilityLabel={accessibilityLabel}
      accessibilityElementsHidden={!accessibilityLabel}
      importantForAccessibility={accessibilityLabel ? 'yes' : 'no-hide-descendants'}
    />
  );
}
