import type { Meta, StoryObj } from '@storybook/react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { Area } from '@/db/enums';
import { addDays } from '@/lib/appDay';
import { withAppData } from '@/storybook/appData';
import { FIXTURE_TODAY, seedDemo } from '@/storybook/fixtures';
import { samplePhotoUri } from '@/storybook/seeds/products';

import { AreaField, BrandField, ExpiryPreview, MonthsField, PhotoField } from './ProductFields';

const day = (n: number) => addDays(FIXTURE_TODAY, n);

/** The product form's own fields (P3), each live: what you pick shows at once. */
const meta = {
  title: 'Components/Products/ProductFields',
  // Brand suggestions come from the demo products; dates from the fixed story day.
  decorators: [withAppData({ seed: seedDemo })],
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

/** "Used on": Skin / Hair / Both, nothing picked yet. */
export const UsedOn: Story = {
  render: function UsedOnStory() {
    const [area, setArea] = useState<Area | undefined>(undefined);
    return <AreaField value={area} onChange={setArea} />;
  },
};

/** "Used on" after Save without a choice: the error line. */
export const UsedOnMissing: Story = {
  render: function UsedOnMissingStory() {
    const { t } = useTranslation();
    const [area, setArea] = useState<Area | undefined>(undefined);
    return (
      <AreaField
        value={area}
        onChange={setArea}
        error={area ? undefined : t('products.errors.areaRequired')}
      />
    );
  },
};

/** Period after opening on the full form: presets and Custom, 12 months picked. */
export const Months: Story = {
  render: function MonthsStory() {
    const { t } = useTranslation();
    const [months, setMonths] = useState('12');
    return (
      <MonthsField
        label={t('products.form.pao')}
        hint={t('products.form.paoHint')}
        presets={[3, 6, 9, 12, 18, 24, 36]}
        custom
        value={months}
        onChange={setMonths}
      />
    );
  },
};

/** A custom period (15 months): the Custom chip and its months field. */
export const MonthsCustom: Story = {
  render: function MonthsCustomStory() {
    const { t } = useTranslation();
    const [months, setMonths] = useState('15');
    return (
      <MonthsField
        label={t('products.form.pao')}
        hint={t('products.form.paoHint')}
        presets={[3, 6, 9, 12, 18, 24, 36]}
        custom
        value={months}
        onChange={setMonths}
      />
    );
  },
};

/** The live expiry line: no dates, opened with a period, expiring today, and expired. */
export const ExpiryLine: Story = {
  render: () => (
    <View className="gap-3">
      <ExpiryPreview expiresAt={null} openedAt={null} paoMonths="" />
      <ExpiryPreview expiresAt={null} openedAt={day(-30)} paoMonths="6" />
      <ExpiryPreview expiresAt={FIXTURE_TODAY} openedAt={null} paoMonths="" />
      <ExpiryPreview expiresAt={day(-5)} openedAt={day(-150)} paoMonths="" />
    </View>
  ),
};

/** Brand: type "L" or "N" to see earlier brands under the field. */
export const Brand: Story = {
  render: function BrandStory() {
    const [brand, setBrand] = useState('');
    return (
      <View className="min-h-[260px]">
        <BrandField value={brand} onChange={setBrand} onBlur={() => {}} />
      </View>
    );
  },
};

/** Photo, none yet: the empty box. Tapping offers Take photo and Choose from library. */
export const PhotoEmpty: Story = {
  render: function PhotoEmptyStory() {
    const [uri, setUri] = useState<string | null>(null);
    return <PhotoField value={uri} onChange={setUri} onPicked={() => {}} />;
  },
};

/** Photo set: the picture, and the menu adds Remove. */
export const PhotoSet: Story = {
  render: function PhotoSetStory() {
    const [uri, setUri] = useState<string | null>(samplePhotoUri);
    return <PhotoField value={uri} onChange={setUri} onPicked={() => {}} />;
  },
};
