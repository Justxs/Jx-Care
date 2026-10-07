import { View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, G, Mask, Path, Rect } from 'react-native-svg';

import { useThemeColors } from '@/theme/colors';

// Mask fills are luminance values (white shows, black cuts out), not theme colours.

/** Cucumber-slice seed marks around each eye, from assets/brand/logo.svg. */
const seeds = (cx: number) =>
  [90, 150, 210, 270, 330, 390].map((deg) => {
    const rad = ((deg - 90) * Math.PI) / 180;
    return { x: cx + 11.5 * Math.cos(rad), y: 88 + 11.5 * Math.sin(rad), deg };
  });

export type LogoProps = {
  /** Width in points; the mark keeps its 7:6 ratio. */
  size?: number;
  /** Spoken name; omit when the app name is written next to it. */
  accessibilityLabel?: string;
};

/** The spa-day frog in `brand-pink` (docs/brand.md). Never recoloured to `accent`. */
export function Logo({ size = 64, accessibilityLabel }: LogoProps) {
  const colors = useThemeColors();
  const height = (size * 144) / 168;
  return (
    <View
      accessible={!!accessibilityLabel}
      accessibilityRole={accessibilityLabel ? 'image' : undefined}
      accessibilityLabel={accessibilityLabel}
      importantForAccessibility={accessibilityLabel ? 'yes' : 'no-hide-descendants'}
      accessibilityElementsHidden={!accessibilityLabel}
      style={{ width: size, height }}
    >
      <Svg width={size} height={height} viewBox="16 44 168 144">
        <Defs>
          <Mask id="jxc-head" maskUnits="userSpaceOnUse" x="0" y="0" width="200" height="200">
            <Rect width="200" height="200" fill="white" />
            <Circle cx="62" cy="88" r="35" fill="black" />
            <Circle cx="138" cy="88" r="35" fill="black" />
            <Path
              d="M 68 140 Q 100 164 132 140"
              fill="none"
              stroke="black"
              strokeWidth={6.5}
              strokeLinecap="round"
            />
            <Circle cx="92" cy="120" r="2.6" fill="black" />
            <Circle cx="108" cy="120" r="2.6" fill="black" />
          </Mask>
          <Mask id="jxc-eyes" maskUnits="userSpaceOnUse" x="0" y="0" width="200" height="200">
            <Rect width="200" height="200" fill="white" />
            {[62, 138].map((cx) => (
              <G key={cx}>
                <Circle cx={cx} cy="88" r="25" fill="none" stroke="black" strokeWidth={4} />
                {seeds(cx).map((s) => (
                  <Ellipse
                    key={s.deg}
                    cx={s.x}
                    cy={s.y}
                    rx="2.3"
                    ry="3.8"
                    fill="black"
                    transform={`rotate(${s.deg} ${s.x} ${s.y})`}
                  />
                ))}
              </G>
            ))}
          </Mask>
        </Defs>
        <G fill={colors['brand-pink']}>
          <Path
            mask="url(#jxc-head)"
            d="M 24 132 C 24 100 58 90 100 90 C 142 90 176 100 176 132 C 176 164 144 180 100 180 C 56 180 24 164 24 132 Z"
          />
          <G mask="url(#jxc-eyes)">
            <Circle cx="62" cy="88" r="30" />
            <Circle cx="138" cy="88" r="30" />
          </G>
        </G>
      </Svg>
    </View>
  );
}
