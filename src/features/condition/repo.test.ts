import { createTestDb } from '@/db/test-db';
import { conditionLog } from '@/db/schema';

import {
  conditionMonth,
  conditionSummary,
  getConditionDay,
  saveConditionDay,
  toggleState,
} from './repo';
import { bySeverity, cleanNote, normaliseStates, toggleInDay, CONDITION_NOTE_MAX } from './tags';

const TODAY = '2026-10-07';
const YESTERDAY = '2026-10-06';

type TestDb = ReturnType<typeof createTestDb>;
const rows = (db: TestDb) => db.select().from(conditionLog).all();

describe('tags', () => {
  it('keeps known tags once each, in the standard order', () => {
    expect(normaliseStates('skin', ['itchy', 'calm', 'frizzy', 'calm'])).toEqual(['calm', 'itchy']);
    expect(normaliseStates('hair', ['flaky_scalp', 'shiny', 'oily'])).toEqual([
      'shiny',
      'flaky_scalp',
    ]);
  });

  it('orders skin states by severity and picks the main one', () => {
    expect(bySeverity(['glow', 'oily', 'breakout', 'calm'])).toEqual([
      'breakout',
      'oily',
      'calm',
      'glow',
    ]);
  });

  it('trims the note, cuts it to 280 and turns empty into null', () => {
    expect(cleanNote('  Tight after the toner ')).toBe('Tight after the toner');
    expect(cleanNote('   ')).toBeNull();
    expect(cleanNote(null)).toBeNull();
    expect(cleanNote('x'.repeat(300))).toHaveLength(CONDITION_NOTE_MAX);
  });

  it('toggles a tag in a day and drops an area that ends empty, keeping one with a note', () => {
    const on = toggleInDay({}, 'skin', 'oily');
    expect(on).toEqual({ skin: { states: ['oily'], note: null } });
    expect(toggleInDay(on, 'skin', 'oily')).toEqual({});
    const noted = { skin: { states: ['oily'], note: 'Shiny T-zone' } };
    expect(toggleInDay(noted, 'skin', 'oily')).toEqual({
      skin: { states: [], note: 'Shiny T-zone' },
    });
  });
});

describe('toggleState', () => {
  it('creates the row on the first tag, updates it after and deletes it when empty', () => {
    const db = createTestDb();
    expect(toggleState(db, TODAY, 'skin', 'oily')).toEqual({
      skin: { states: ['oily'], note: null },
    });
    expect(rows(db)).toHaveLength(1);

    toggleState(db, TODAY, 'skin', 'calm');
    expect(rows(db)).toHaveLength(1);
    // Standard order whatever order they were tapped in.
    expect(getConditionDay(db, TODAY).skin?.states).toEqual(['calm', 'oily']);

    toggleState(db, TODAY, 'skin', 'oily');
    toggleState(db, TODAY, 'skin', 'calm');
    expect(rows(db)).toHaveLength(0);
    expect(getConditionDay(db, TODAY)).toEqual({});
  });

  it('keeps a row that still has a note', () => {
    const db = createTestDb();
    saveConditionDay(db, TODAY, { skin: { states: ['dry'], note: 'Cold wind' } });
    toggleState(db, TODAY, 'skin', 'dry');
    expect(getConditionDay(db, TODAY)).toEqual({ skin: { states: [], note: 'Cold wind' } });
  });

  it('keeps one row per day and area', () => {
    const db = createTestDb();
    toggleState(db, TODAY, 'skin', 'glow');
    toggleState(db, TODAY, 'hair', 'frizzy');
    toggleState(db, YESTERDAY, 'skin', 'glow');
    toggleState(db, TODAY, 'skin', 'redness');
    expect(rows(db).map((r) => [r.day, r.area, r.states])).toEqual([
      [TODAY, 'skin', ['glow', 'redness']],
      [TODAY, 'hair', ['frizzy']],
      [YESTERDAY, 'skin', ['glow']],
    ]);
  });

  it('refuses a tag of the other area', () => {
    const db = createTestDb();
    expect(() => toggleState(db, TODAY, 'skin', 'frizzy')).toThrow('Unknown skin tag');
    expect(rows(db)).toHaveLength(0);
  });
});

describe('saveConditionDay', () => {
  it('saves both areas with their notes, and leaves an area out of the input as it is', () => {
    const db = createTestDb();
    saveConditionDay(db, YESTERDAY, {
      skin: { states: ['itchy', 'redness'], note: ' After the new serum ' },
      hair: { states: ['dry_ends'], note: null },
    });
    expect(getConditionDay(db, YESTERDAY)).toEqual({
      skin: { states: ['redness', 'itchy'], note: 'After the new serum' },
      hair: { states: ['dry_ends'], note: null },
    });

    saveConditionDay(db, YESTERDAY, { hair: { states: ['shiny'], note: 'Mask day' } });
    expect(getConditionDay(db, YESTERDAY)).toEqual({
      skin: { states: ['redness', 'itchy'], note: 'After the new serum' },
      hair: { states: ['shiny'], note: 'Mask day' },
    });
    expect(rows(db)).toHaveLength(2);
  });

  it('deletes an area saved empty', () => {
    const db = createTestDb();
    saveConditionDay(db, TODAY, { skin: { states: ['calm'], note: null } });
    expect(saveConditionDay(db, TODAY, { skin: { states: [], note: '  ' } })).toEqual({});
    expect(rows(db)).toHaveLength(0);
  });
});

describe('conditionMonth', () => {
  it('returns the skin states of the given days in severity order', () => {
    const db = createTestDb();
    saveConditionDay(db, '2026-10-05', {
      skin: { states: ['oily', 'breakout'], note: null },
      hair: { states: ['frizzy'], note: null },
    });
    saveConditionDay(db, '2026-10-06', { skin: { states: ['calm'], note: null } });
    // A note only: no state to show.
    saveConditionDay(db, '2026-10-07', { skin: { states: [], note: 'Nothing new' } });
    // Hair only, and a day outside the grid.
    saveConditionDay(db, '2026-10-08', { hair: { states: ['shiny'], note: null } });
    saveConditionDay(db, '2026-12-01', { skin: { states: ['dry'], note: null } });

    const days = ['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08'];
    expect(conditionMonth(db, days)).toEqual({
      '2026-10-05': ['breakout', 'oily'],
      '2026-10-06': ['calm'],
    });
    expect(conditionMonth(db, [])).toEqual({});
  });
});

describe('conditionSummary', () => {
  it('counts the days and tags of each area in the range, most frequent first', () => {
    const db = createTestDb();
    saveConditionDay(db, '2026-10-04', { skin: { states: ['dry'], note: null } });
    saveConditionDay(db, '2026-10-05', {
      skin: { states: ['calm', 'breakout'], note: null },
      hair: { states: ['frizzy'], note: null },
    });
    saveConditionDay(db, '2026-10-06', { skin: { states: ['breakout'], note: null } });
    saveConditionDay(db, '2026-10-07', { skin: { states: ['glow'], note: null } });
    saveConditionDay(db, '2026-10-08', { skin: { states: [], note: 'Note only' } });

    expect(conditionSummary(db, '2026-10-05', '2026-10-08')).toEqual({
      skin: {
        daysLogged: 3,
        tags: [
          { tag: 'breakout', count: 2 },
          { tag: 'calm', count: 1 },
          { tag: 'glow', count: 1 },
        ],
      },
      hair: { daysLogged: 1, tags: [{ tag: 'frizzy', count: 1 }] },
    });
  });
});
