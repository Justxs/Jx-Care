import type { Meta, StoryObj } from '@storybook/react-native';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { withAppData } from '@/storybook/appData';

import {
  ABExplainSheet,
  ConflictExplainSheet,
  ExplainSheet,
  MildConflictExplainSheet,
  StreakExplainSheet,
  type ConflictExplain,
  type ExplainSheetProps,
} from './ExplainSheet';

type OpenProps = { open: boolean; onClose: () => void };

/** Opens the sheet at start; Close or a drag closes it and the button opens it again. */
function Opener({
  onClose,
  children,
}: {
  onClose: () => void;
  children: (props: OpenProps) => ReactNode;
}) {
  const [open, setOpen] = useState(true);
  return (
    <>
      <Button variant="secondary" onPress={() => setOpen(true)}>
        Open sheet
      </Button>
      {children({
        open,
        onClose: () => {
          setOpen(false);
          onClose();
        },
      })}
    </>
  );
}

const vitaminCConflict: ConflictExplain = {
  first: { product: 'Vitamin C serum', routine: 'Morning' },
  second: { product: 'Glycolic acid toner', routine: 'Evening B' },
  weekdays: [2, 4, 6],
  note: 'Both are acids; on one day they can sting and redden the skin.',
  mild: false,
};

const meta = {
  title: 'Components/Shared/ExplainSheet',
  component: ExplainSheet,
  // Weekdays are formatted with the settings (read from a story database).
  decorators: [withAppData()],
  args: {
    open: true,
    title: 'What the dots mean',
    lines: [
      { icon: 'check', text: 'A full dot: every routine that day was done.' },
      { icon: 'calendar', text: 'A ring: some of them were done.' },
      { icon: 'clock', text: 'Today stays open until the day ends.' },
    ],
    // Callbacks come from the `action` argTypes (Actions panel); a value here would replace them.
    ...({} as Pick<ExplainSheetProps, 'onClose'>),
  },
  argTypes: {
    title: { control: 'text' },
    lines: { control: 'object' },
    footer: { control: false },
    onClose: { action: 'closed' },
  },
  render: (args) => (
    <Opener onClose={args.onClose}>{(open) => <ExplainSheet {...args} {...open} />}</Opener>
  ),
} satisfies Meta<typeof ExplainSheet>;

export default meta;

type Story = StoryObj<typeof meta>;

/** The base sheet: a title and lines, each led by a bare ink-muted icon; closes with Close. */
export const Generic: Story = {};

/** A footer under the lines. */
export const WithFooter: Story = {
  render: (args) => (
    <Opener onClose={args.onClose}>
      {(open) => (
        <ExplainSheet
          {...args}
          {...open}
          footer={<Button variant="secondary">Edit routine</Button>}
        />
      )}
    </Opener>
  ),
};

/** Skin streak with the person's numbers (StreakChip). */
export const Streak: Story = {
  render: (args) => (
    <Opener onClose={args.onClose}>
      {(open) => <StreakExplainSheet {...open} skin={{ current: 5, best: 21 }} />}
    </Opener>
  ),
};

/** Skin streak before it is known: the numbers line is left out. */
export const StreakUnknown: Story = {
  render: (args) => (
    <Opener onClose={args.onClose}>{(open) => <StreakExplainSheet {...open} skin={null} />}</Opener>
  ),
};

/** "About A and B" for an evening with two options. */
export const AB: Story = {
  render: function AB(args) {
    const { t } = useTranslation();
    return (
      <Opener onClose={args.onClose}>
        {(open) => (
          <ABExplainSheet
            {...open}
            timeOfDay={t('common.evening')}
            names={['Evening A', 'Evening B']}
            weekday={3}
          />
        )}
      </Opener>
    );
  },
};

/** "Why this warning": the pair, the days, the rule's note and both actions. */
export const Conflict: Story = {
  render: (args) => (
    <Opener onClose={args.onClose}>
      {(open) => (
        <ConflictExplainSheet
          {...open}
          conflict={vitaminCConflict}
          onEditRoutine={() => {}}
          onSeeRule={() => {}}
        />
      )}
    </Opener>
  ),
};

/** A mild conflict with no note and no actions. */
export const ConflictMildNoActions: Story = {
  render: (args) => (
    <Opener onClose={args.onClose}>
      {(open) => (
        <ConflictExplainSheet
          {...open}
          conflict={{ ...vitaminCConflict, note: null, mild: true, weekdays: [1] }}
        />
      )}
    </Opener>
  ),
};

/** Mild conflict with the every-few-days step. */
export const MildConflict: Story = {
  render: (args) => (
    <Opener onClose={args.onClose}>
      {(open) => (
        <MildConflictExplainSheet {...open} step={{ product: 'Retinol serum', everyNDays: 3 }} />
      )}
    </Opener>
  ),
};

/** Mild conflict when the step is not known: the generic line. */
export const MildConflictGeneric: Story = {
  render: (args) => (
    <Opener onClose={args.onClose}>{(open) => <MildConflictExplainSheet {...open} />}</Opener>
  ),
};

/** Long Lithuanian lines wrap beside their icons. */
export const LongLithuanian: Story = {
  args: {
    title: 'Ką reiškia taškai kalendoriuje',
    lines: [
      {
        icon: 'check',
        text: 'Pilnas taškas: tą dieną atlikote visas suplanuotas odos ir plaukų priežiūros rutinas.',
      },
      {
        icon: 'calendar',
        text: 'Žiedas: atlikote tik dalį rutinų. Dienos be suplanuotų rutinų praleidžiamos.',
      },
    ],
  },
};
