import { costPerDayCents } from './cost';

describe('costPerDayCents', () => {
  it('spreads the price over the days in use', () => {
    expect(costPerDayCents(2990, '2026-05-17', '2026-10-06')).toEqual({ cents: 21, days: 142 });
  });
  it('counts at least one day', () => {
    expect(costPerDayCents(500, '2026-10-06', '2026-10-06')).toEqual({ cents: 500, days: 1 });
  });
  it('returns null when something is missing or wrong', () => {
    expect(costPerDayCents(null, '2026-10-01', '2026-10-06')).toBeNull();
    expect(costPerDayCents(100, null, '2026-10-06')).toBeNull();
    expect(costPerDayCents(100, '2026-10-01', null)).toBeNull();
    expect(costPerDayCents(100, '2026-10-07', '2026-10-06')).toBeNull();
  });
});
