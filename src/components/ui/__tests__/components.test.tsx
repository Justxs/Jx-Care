import { createRef } from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { setI18nLanguage } from '@/i18n';

import { AreaTag } from '../area-tag';
import { Badge } from '../badge';
import { Button } from '../button';
import { Card } from '../card';
import { Checkbox } from '../checkbox';
import { Chip, ChipGroup } from '../chip';
import { ConflictTag } from '../conflict-tag';
import { Fab, FAB_LIST_END_SPACE } from '../fab';
import { Icon } from '../icon';
import { ListRow } from '../list-row';
import { PhotoTile } from '../photo-tile';
import { PinPad, type PinPadHandle } from '../pin-pad';
import { categoryGlyph, ProductThumb } from '../product-thumb';
import { Progress } from '../progress';
import { ProgressRing } from '../progress-ring';
import { RadioList } from '../radio-list';
import { Rating } from '../rating';
import { Separator } from '../separator';
import { Skeleton } from '../skeleton';
import { StepDots } from '../step-dots';
import { StreakCard, StreakChip } from '../streak';
import { Switch } from '../switch';
import { Text } from '../text';
import { ToggleGroup } from '../toggle-group';
import { WeekdayDots } from '../weekday-dots';
import { WeekdayPicker } from '../weekday-picker';

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light' },
  NotificationFeedbackType: { Error: 'error' },
}));

beforeEach(async () => {
  await setI18nLanguage('en');
});

describe('Text and Icon', () => {
  it('renders text with the scaling cap', async () => {
    await render(<Text>Hello</Text>);
    expect(screen.getByText('Hello').props.maxFontSizeMultiplier).toBe(1.6);
  });

  it('hides decorative icons and labels meaningful ones', async () => {
    await render(
      <>
        <Icon name="check" />
        <Icon name="lock" accessibilityLabel="Locked" />
      </>,
    );
    expect(screen.getByLabelText('Locked')).toBeTruthy();
  });
});

describe('Button', () => {
  it('is a button that fires onPress', async () => {
    const onPress = jest.fn();
    await render(<Button onPress={onPress}>Save</Button>);
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    expect(onPress).toHaveBeenCalled();
  });

  it('does not fire while disabled or loading, and keeps the label', async () => {
    const onPress = jest.fn();
    await render(
      <>
        <Button disabled onPress={onPress}>
          Off
        </Button>
        <Button loading onPress={onPress}>
          Busy
        </Button>
      </>,
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Off' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Busy' }));
    expect(onPress).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Off' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Busy' })).toBeBusy();
  });
});

describe('Badge, AreaTag and ConflictTag', () => {
  it('always shows a word', async () => {
    await render(
      <>
        <Badge status="expired" />
        <Badge status="avoid" />
        <AreaTag area="both" />
        <ConflictTag />
        <ConflictTag mild />
      </>,
    );
    for (const word of ['Expired', 'Avoid', 'Skin + hair', 'Conflict', 'Mild conflict']) {
      expect(screen.getByText(word)).toBeTruthy();
    }
  });

  it('makes a pressable ConflictTag a button', async () => {
    const onPress = jest.fn();
    await render(<ConflictTag onPress={onPress} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Conflict. Tap for details.' }));
    expect(onPress).toHaveBeenCalled();
  });
});

describe('Checkbox and Switch', () => {
  it('Checkbox reports its state and toggles', async () => {
    const onChange = jest.fn();
    await render(
      <Checkbox checked={false} onCheckedChange={onChange} accessibilityLabel="Cleanser" />,
    );
    const box = screen.getByRole('checkbox', { name: 'Cleanser' });
    expect(box).not.toBeChecked();
    await fireEvent.press(box);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('Switch reports its state and toggles', async () => {
    const onChange = jest.fn();
    await render(<Switch checked onCheckedChange={onChange} accessibilityLabel="Reminders" />);
    const sw = screen.getByRole('switch', { name: 'Reminders' });
    expect(sw).toBeChecked();
    await fireEvent.press(sw);
    expect(onChange).toHaveBeenCalledWith(false);
  });
});

describe('RadioList', () => {
  it('is a radiogroup of radios with the picked one checked', async () => {
    const onChange = jest.fn();
    await render(
      <RadioList
        accessibilityLabel="Language"
        items={[
          { value: 'lt', label: 'Lietuvių' },
          { value: 'en', label: 'English', detail: 'EN' },
        ]}
        value="lt"
        onValueChange={onChange}
      />,
    );
    expect(screen.getByLabelText('Language')).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'Lietuvių' })).toBeChecked();
    await fireEvent.press(screen.getByRole('radio', { name: 'English. EN' }));
    expect(onChange).toHaveBeenCalledWith('en');
  });
});

describe('Chip and ChipGroup', () => {
  it('Chip is a toggle with selected state and a count', async () => {
    const onChange = jest.fn();
    await render(
      <Chip selected count={3} onPressedChange={onChange}>
        Morning
      </Chip>,
    );
    const chip = screen.getByRole('button', { name: 'Morning' });
    expect(chip).toBeSelected();
    expect(screen.getByText('3')).toBeTruthy();
    await fireEvent.press(chip);
    expect(onChange).toHaveBeenCalledWith(false);
  });

  it('ChipGroup adds and removes values', async () => {
    const onChange = jest.fn();
    const items = [
      { value: 'a', label: 'A' },
      { value: 'b', label: 'B' },
    ];
    await render(<ChipGroup items={items} value={['a']} onValueChange={onChange} />);
    await fireEvent.press(screen.getByRole('button', { name: 'B' }));
    expect(onChange).toHaveBeenLastCalledWith(['a', 'b']);
    await fireEvent.press(screen.getByRole('button', { name: 'A' }));
    expect(onChange).toHaveBeenLastCalledWith([]);
  });

  it('single ChipGroup replaces the value', async () => {
    const onChange = jest.fn();
    const items = [
      { value: 'a', label: 'A' },
      { value: 'b', label: 'B' },
    ];
    await render(<ChipGroup single items={items} value={['a']} onValueChange={onChange} />);
    await fireEvent.press(screen.getByRole('button', { name: 'B' }));
    expect(onChange).toHaveBeenLastCalledWith(['b']);
  });
});

describe('ToggleGroup', () => {
  it('marks the selected item and never goes empty', async () => {
    const onChange = jest.fn();
    await render(
      <ToggleGroup
        accessibilityLabel="Area"
        items={[
          { value: 'skin', label: 'Skin' },
          { value: 'hair', label: 'Hair', count: 2 },
        ]}
        value="skin"
        onValueChange={onChange}
      />,
    );
    expect(screen.getByRole('radio', { name: 'Skin' })).toBeSelected();
    await fireEvent.press(screen.getByRole('radio', { name: 'Skin' }));
    expect(onChange).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByRole('radio', { name: 'Hair, 2' }));
    expect(onChange).toHaveBeenCalledWith('hair');
  });
});

describe('Progress and ProgressRing', () => {
  it('Progress is a progressbar with a value', async () => {
    await render(<Progress value={2} max={4} />);
    const bar = screen.getByRole('progressbar', { name: '2 of 4 done' });
    expect(bar.props.accessibilityValue).toEqual({ min: 0, max: 4, now: 2 });
  });

  it('ProgressRing shows value/max', async () => {
    await render(<ProgressRing value={3} max={5} />);
    expect(screen.getByRole('progressbar', { name: '3 of 5 done' })).toBeTruthy();
    expect(screen.getByText('3/5')).toBeTruthy();
  });
});

describe('Card, Separator, Skeleton', () => {
  it('Card draws its title as a header above the body', async () => {
    await render(
      <Card title="Expiring soon">
        <Text>Body</Text>
      </Card>,
    );
    expect(screen.getByRole('header', { name: 'Expiring soon' })).toBeTruthy();
    expect(screen.getByText('Body')).toBeTruthy();
  });

  it('Separator and Skeleton render without accessible content', async () => {
    await render(
      <>
        <Separator inset />
        <Skeleton width={48} height={48} />
      </>,
    );
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });
});

describe('ListRow', () => {
  it('a pressable row is a button with label, detail and value', async () => {
    const onPress = jest.fn();
    await render(<ListRow label="Language" detail="App words" value="English" onPress={onPress} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Language, App words, English' }));
    expect(onPress).toHaveBeenCalled();
  });

  it('a switch row puts the state on the switch', async () => {
    const onChange = jest.fn();
    await render(
      <ListRow label="Weekly photo" trailing="switch" checked onCheckedChange={onChange} />,
    );
    const sw = screen.getByRole('switch', { name: 'Weekly photo' });
    expect(sw).toBeChecked();
    await fireEvent.press(sw);
    expect(onChange).toHaveBeenCalledWith(false);
  });
});

describe('Rating', () => {
  it('speaks the value and picks a star', async () => {
    const onChange = jest.fn();
    await render(<Rating value={3} onValueChange={onChange} />);
    expect(screen.getByLabelText('Rating: 3 of 5 stars')).toBeTruthy();
    expect(screen.getByRole('radio', { name: '3 stars' })).toBeChecked();
    await fireEvent.press(screen.getByRole('radio', { name: '5 stars' }));
    expect(onChange).toHaveBeenCalledWith(5);
  });
});

describe('WeekdayDots and WeekdayPicker', () => {
  it('speaks days in words, Monday first', async () => {
    await render(
      <>
        <WeekdayDots value={[5, 1, 3]} />
        <WeekdayDots value={[1, 2, 3, 4, 5, 6, 7]} />
      </>,
    );
    expect(screen.getByLabelText('Monday, Wednesday, Friday')).toBeTruthy();
    expect(screen.getByLabelText('Every day')).toBeTruthy();
  });

  it('uses Lithuanian letters', async () => {
    await setI18nLanguage('lt');
    await render(<WeekdayDots value={[1]} />);
    expect(screen.getByText('Š')).toBeTruthy();
  });

  it('picker toggles ISO weekdays and keeps them sorted', async () => {
    const onChange = jest.fn();
    await render(<WeekdayPicker value={[3, 1]} onValueChange={onChange} />);
    expect(screen.getByRole('checkbox', { name: 'Monday' })).toBeChecked();
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Sunday' }));
    expect(onChange).toHaveBeenCalledWith([1, 3, 7]);
  });
});

describe('StepDots', () => {
  it('is a progressbar naming the step', async () => {
    await render(<StepDots count={5} index={1} />);
    expect(screen.getByRole('progressbar', { name: 'Step 2 of 5' })).toBeTruthy();
  });
});

describe('StreakChip and StreakCard', () => {
  it('chip shows "12 skin" and is a button when pressable', async () => {
    const onPress = jest.fn();
    await render(<StreakChip area="skin" value={12} onPress={onPress} />);
    expect(screen.getByText('12 skin')).toBeTruthy();
    await fireEvent.press(
      screen.getByRole('button', { name: 'Skin streak: 12 days. Tap to learn how it works.' }),
    );
    expect(onPress).toHaveBeenCalled();
  });

  it('chip without onPress is not a button', async () => {
    await render(<StreakChip area="hair" value={1} />);
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByLabelText('Hair: 1 day in a row')).toBeTruthy();
  });

  it('card shows best, or the restarted line', async () => {
    await render(
      <>
        <StreakCard area="skin" value={12} best={21} />
        <StreakCard area="hair" value={1} best={21} restarted />
      </>,
    );
    expect(screen.getByText('Best 21 days')).toBeTruthy();
    expect(screen.getByText('Started again. Your best is still 21 days.')).toBeTruthy();
  });
});

describe('ProductThumb, PhotoTile, Fab', () => {
  it('maps categories to glyphs', () => {
    expect(categoryGlyph('serum')).toBe('pipette');
    expect(categoryGlyph('hair_oil')).toBe('pipette');
    expect(categoryGlyph('toner')).toBe('droplet');
    expect(categoryGlyph('spf')).toBe('sun');
    expect(categoryGlyph('styling')).toBe('spray-can');
    expect(categoryGlyph('mask')).toBe('flask-round');
  });

  it('ProductThumb renders a glyph without a photo', async () => {
    await render(<ProductThumb category="spf" />);
    expect(screen.queryAllByRole('image')).toHaveLength(0);
  });

  it('PhotoTile add slot is a labelled button; selected tiles say so', async () => {
    await render(
      <>
        <PhotoTile add onPress={() => {}} />
        <PhotoTile date="6 Oct" selected onPress={() => {}} />
      </>,
    );
    expect(screen.getByRole('button', { name: 'Add photo' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '6 Oct' })).toBeSelected();
  });

  it('Fab always shows its label', async () => {
    const onPress = jest.fn();
    await render(<Fab onPress={onPress}>Add product</Fab>);
    expect(screen.getByText('Add product')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Add product' }));
    expect(onPress).toHaveBeenCalled();
    expect(FAB_LIST_END_SPACE).toBe(96);
  });
});

describe('PinPad', () => {
  it('types digits, deletes and speaks the count', async () => {
    const onDigit = jest.fn();
    const onDelete = jest.fn();
    await render(<PinPad filled={2} onDigit={onDigit} onDelete={onDelete} />);
    expect(screen.getByLabelText('2 of 4 digits entered')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: '7' }));
    expect(onDigit).toHaveBeenCalledWith('7');
    await fireEvent.press(screen.getByRole('button', { name: 'Delete last digit' }));
    expect(onDelete).toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Unlock with Face ID or fingerprint' })).toBeNull();
  });

  it('disabled keys show the reason and do nothing; shake is exposed', async () => {
    const onDigit = jest.fn();
    const ref = createRef<PinPadHandle>();
    await render(
      <PinPad
        ref={ref}
        filled={0}
        disabled
        message="Try again in 30 seconds"
        biometric
        onBiometric={() => {}}
        onDigit={onDigit}
        onDelete={() => {}}
      />,
    );
    expect(screen.getByText('Try again in 30 seconds')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: '1' }));
    expect(onDigit).not.toHaveBeenCalled();
    expect(
      screen.getByRole('button', { name: 'Unlock with Face ID or fingerprint' }),
    ).toBeDisabled();
    expect(() => ref.current?.shake()).not.toThrow();
  });
});
