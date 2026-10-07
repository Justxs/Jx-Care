// The side-effect imports app/_layout.tsx makes, for stories rendered outside the app (Jest).
// Register the routines and hair sources of product detail's "Used in" list.
import '@/features/hair/repo';
import '@/features/routines/repo';
// Registers Buy again (Products list, detail, archive, Today) with the shopping list.
import '@/features/shopping/api';
// Registers the routine player's conflict tags and lines.
import '@/features/conflicts/hooks';
