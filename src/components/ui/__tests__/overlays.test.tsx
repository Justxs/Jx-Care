import { PortalHost } from '@rn-primitives/portal';
import { act, fireEvent, render, renderHook, screen } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';

import { parseDecimal, sampleSchema } from '@/dev/sampleForm';
import { SampleForm } from '@/dev/FormsGallery';
import { setI18nLanguage } from '@/i18n';
import { setupTestApp } from '@/test/render';
import { dismissToast, showToast, uiStore, setScreenReaderOn, watchScreenReader } from '@/state/ui';

import { AlertDialog } from '../alert-dialog';
import { useCloseGuard } from '../close-guard';
import { EmptyState } from '../empty-state';
import { Input } from '../input';
import { ScreenHeader } from '../screen-header';
import { ToastHost } from '../toast-host';

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light' },
  NotificationFeedbackType: { Error: 'error' },
}));

beforeEach(async () => {
  await setI18nLanguage('en');
});

/** Each field's reserved line, and how many texts it holds (never more than one). */
function helperLines() {
  return screen
    .getAllByTestId('field-helper')
    .map(
      (line) =>
        screen
          .queryAllByText(/.+/, { exact: true })
          .filter((t) => line === t.parent || isInside(t, line)).length,
    );
}

function isInside(node: { parent: unknown }, container: unknown): boolean {
  let current = node.parent as { parent: unknown } | null;
  while (current) {
    if (current === container) return true;
    current = current.parent as { parent: unknown } | null;
  }
  return false;
}

describe('sample form', () => {
  it('parses decimals with a comma or a dot', () => {
    expect(parseDecimal('12,99')).toBe(12.99);
    expect(parseDecimal('3.')).toBe(3);
    expect(parseDecimal('')).toBeNull();
    expect(parseDecimal('abc')).toBeNaN();
  });

  it('schema gives i18n keys and parses the price', () => {
    const bad = sampleSchema.safeParse({
      name: ' ',
      price: '-1',
      purchased: null,
      tags: [],
      answer: '',
      notes: '',
    });
    expect(bad.success).toBe(false);
    const messages = bad.error?.issues.map((i) => i.message);
    expect(messages).toEqual(
      expect.arrayContaining([
        'forms.errors.nameRequired',
        'forms.errors.priceMin',
        'forms.errors.pickOne',
      ]),
    );
    const good = sampleSchema.parse({
      name: 'Serum',
      price: '12,50',
      purchased: '2026-10-06',
      tags: ['calm'],
      answer: '',
      notes: '',
    });
    expect(good.price).toBe(12.5);
  });

  it('shows errors in the reserved line without adding or removing anything', async () => {
    const app = setupTestApp();
    const onSaved = jest.fn();
    await app.render(<SampleForm onSaved={onSaved} />);
    expect(screen.getByText('As on the bottle')).toBeTruthy();
    const before = helperLines();
    expect(before).toHaveLength(7);

    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    expect(screen.getByText('Enter a name.')).toBeTruthy();
    expect(screen.getByText('Pick at least one.')).toBeTruthy();
    // The error took the hint's place; the field below did not move down a line.
    expect(screen.queryByText('As on the bottle')).toBeNull();
    const after = helperLines();
    expect(after).toHaveLength(before.length);
    expect(after.every((texts) => texts <= 1)).toBe(true);
    expect(onSaved).not.toHaveBeenCalled();

    await fireEvent.changeText(screen.getByLabelText('Name'), 'Vitamin C serum');
    await fireEvent.changeText(screen.getByLabelText('Price'), 'abc');
    await fireEvent(screen.getByLabelText('Price'), 'blur');
    expect(screen.getByText('Enter the price as a number, e.g. 12.99.')).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText('Price'), '12,99');
    await fireEvent.press(screen.getByRole('button', { name: 'Calm' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    expect(onSaved).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Vitamin C serum', price: 12.99, tags: ['calm'] }),
    );
  });
});

describe('Input', () => {
  it('a secret input hides the text and the eye shows it', async () => {
    await render(<Input label="Answer" value="Rex" onChangeText={() => {}} secret />);
    expect(screen.getByLabelText('Answer')).toHaveProp('secureTextEntry', true);
    await fireEvent.press(screen.getByRole('button', { name: 'Show answer' }));
    expect(screen.getByLabelText('Answer')).toHaveProp('secureTextEntry', false);
    await fireEvent.press(screen.getByRole('button', { name: 'Hide answer' }));
    expect(screen.getByLabelText('Answer')).toHaveProp('secureTextEntry', true);
  });

  it('error replaces the hint', async () => {
    await render(
      <Input label="Months" hint="Use within" error="Enter months as a number, e.g. 12." />,
    );
    expect(screen.getByText('Enter months as a number, e.g. 12.')).toBeTruthy();
    expect(screen.queryByText('Use within')).toBeNull();
  });
});

const resetAction = () => screen.getByRole('button', { name: 'Reset app' });

describe('AlertDialog', () => {
  it('with confirmText keeps the action off until it is typed exactly', async () => {
    const onAction = jest.fn();
    await render(
      <>
        <AlertDialog
          open
          onOpenChange={() => {}}
          title="Reset app?"
          description="This deletes everything."
          actionLabel="Reset app"
          cancelLabel="Cancel"
          destructive
          confirmText="RESET"
          confirmLabel="Type RESET to confirm"
          onAction={onAction}
        />
        <PortalHost />
      </>,
    );
    expect(resetAction()).toBeDisabled();
    await fireEvent.press(resetAction());
    expect(onAction).not.toHaveBeenCalled();

    await fireEvent.changeText(screen.getByLabelText('Type RESET to confirm'), 'RESE');
    expect(resetAction()).toBeDisabled();
    await fireEvent.changeText(screen.getByLabelText('Type RESET to confirm'), 'reset');
    expect(resetAction()).toBeDisabled();
    await fireEvent.changeText(screen.getByLabelText('Type RESET to confirm'), 'RESET');
    expect(resetAction()).not.toBeDisabled();
    await fireEvent.press(resetAction());
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('cancel calls onCancel', async () => {
    const onCancel = jest.fn();
    await render(
      <>
        <AlertDialog
          open
          onOpenChange={() => {}}
          title="Delete?"
          description="Gone for good."
          actionLabel="Delete"
          cancelLabel="Cancel"
          onAction={() => {}}
          onCancel={onCancel}
        />
        <PortalHost />
      </>,
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalled();
  });
});

describe('close guard', () => {
  it('closes at once when nothing changed', async () => {
    const onClose = jest.fn();
    const { result } = await renderHook(() => useCloseGuard({ dirty: false, onClose }));
    await act(async () => result.current.requestClose());
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(result.current.confirmOpen).toBe(false);
  });

  it('asks first when dirty; Keep editing stays, Discard closes', async () => {
    const onClose = jest.fn();
    const { result } = await renderHook(() => useCloseGuard({ dirty: true, onClose }));
    await act(async () => result.current.requestClose());
    expect(onClose).not.toHaveBeenCalled();
    expect(result.current.confirmOpen).toBe(true);
    await act(async () => result.current.keepEditing());
    expect(result.current.confirmOpen).toBe(false);
    expect(onClose).not.toHaveBeenCalled();
    await act(async () => result.current.requestClose());
    await act(async () => result.current.discard());
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(result.current.confirmOpen).toBe(false);
  });
});

describe('toasts', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    for (const t of uiStore.state.toasts) dismissToast(t.id);
    setScreenReaderOn(false);
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('shows one at a time, Undo runs the handler, gone after 8 s', async () => {
    await render(<ToastHost />);
    const onUndo = jest.fn();
    await act(async () => {
      showToast({ message: 'Old toast' });
      showToast({ message: 'Parfum removed', actionLabel: 'Undo', onAction: onUndo });
    });
    expect(screen.queryByText('Old toast')).toBeNull();
    expect(screen.getByText('Parfum removed')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Undo' }));
    expect(onUndo).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Parfum removed')).toBeNull();

    await act(async () => {
      showToast({ message: 'Moved to Archive' });
    });
    await act(async () => {
      jest.advanceTimersByTime(7999);
    });
    expect(screen.getByText('Moved to Archive')).toBeTruthy();
    await act(async () => {
      jest.advanceTimersByTime(1);
    });
    expect(screen.queryByText('Moved to Archive')).toBeNull();
  });

  it('stays until dismissed while a screen reader is on', async () => {
    jest.spyOn(AccessibilityInfo, 'isScreenReaderEnabled').mockResolvedValue(true);
    const stop = watchScreenReader();
    await act(async () => {
      await Promise.resolve();
    });
    expect(uiStore.state.screenReaderOn).toBe(true);

    await render(<ToastHost />);
    await act(async () => {
      showToast({ message: 'Parfum removed', actionLabel: 'Undo', onAction: () => {} });
    });
    await act(async () => {
      jest.advanceTimersByTime(60_000);
    });
    expect(screen.getByText('Parfum removed')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByText('Parfum removed')).toBeNull();
    stop();
  });
});

describe('ScreenHeader and EmptyState', () => {
  it('header has a spoken back button, a heading and a menu', async () => {
    const onBack = jest.fn();
    await render(
      <>
        <ScreenHeader
          title="Product"
          onBack={onBack}
          action={{ menu: [{ label: 'Duplicate', onPress: () => {} }] }}
        />
        <PortalHost />
      </>,
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));
    expect(onBack).toHaveBeenCalled();
    expect(screen.getByRole('header', { name: 'Product' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'More actions' })).toBeTruthy();
  });

  it('close variant reads Close; word actions are buttons', async () => {
    const onSelect = jest.fn();
    await render(
      <ScreenHeader
        title="Photos"
        onBack={() => {}}
        close
        action={{ text: 'Select', onPress: onSelect }}
      />,
    );
    expect(screen.getByRole('button', { name: 'Close' })).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Select' }));
    expect(onSelect).toHaveBeenCalled();
  });

  it('empty state has one primary and one ghost action', async () => {
    const onAdd = jest.fn();
    await render(
      <EmptyState
        icon="package"
        title="No products yet"
        actionLabel="Add product"
        onAction={onAdd}
        secondaryLabel="Restore a backup"
        onSecondary={() => {}}
      >
        Add what is on your shelf.
      </EmptyState>,
    );
    expect(screen.getByRole('header', { name: 'No products yet' })).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Add product' }));
    expect(onAdd).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Restore a backup' })).toBeTruthy();
  });
});
