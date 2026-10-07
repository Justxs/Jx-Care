import { cssInterop } from 'nativewind';
import Animated from 'react-native-reanimated';

/**
 * On the web, Reanimated's Animated.View drops `className`, so sliding indicators, the Fab corner
 * and fading rows lose their layout. Mapping it to `style` (NativeWind's web interop) keeps the
 * classes. The phone app never loads this file.
 */
cssInterop(Animated.View, { className: 'style' });
