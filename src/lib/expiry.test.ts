import {
  daysLeft,
  effectiveExpiry,
  expiryProgress,
  expiryStatus,
  needsBadge,
  sortBySoonestExpiry,
  warningDay,
} from './expiry';

const today = '2026-10-06';
const p = (o: Partial<Parameters<typeof effectiveExpiry>[0]> = {}) => ({
  expiresAt: null,
  openedAt: null,
  paoMonths: null,
  ...o,
});

describe('effectiveExpiry', () => {
  it('uses the printed date when it is earlier than opened + PAO', () => {
    expect(
      effectiveExpiry(p({ expiresAt: '2026-12-01', openedAt: '2026-10-01', paoMonths: 6 })),
    ).toBe('2026-12-01');
  });
  it('uses opened + PAO when it is earlier than the printed date', () => {
    expect(
      effectiveExpiry(p({ expiresAt: '2028-01-01', openedAt: '2026-10-01', paoMonths: 6 })),
    ).toBe('2027-04-01');
  });
  it('works with only one side', () => {
    expect(effectiveExpiry(p({ expiresAt: '2027-01-01' }))).toBe('2027-01-01');
    expect(effectiveExpiry(p({ openedAt: '2026-01-31', paoMonths: 1 }))).toBe('2026-02-28');
    expect(effectiveExpiry(p({ openedAt: '2026-01-31' }))).toBeNull();
    expect(effectiveExpiry(p())).toBeNull();
  });
});

describe('expiryStatus', () => {
  it('is nodate when opened with no PAO and no printed date', () => {
    expect(expiryStatus(p({ openedAt: '2026-09-01' }), today, 30)).toBe('nodate');
  });
  it('is expiring when unopened with a printed date in the warning window', () => {
    expect(expiryStatus(p({ expiresAt: '2026-10-20' }), today, 30)).toBe('expiring');
  });
  it('is unopened when unopened and far from expiry', () => {
    expect(expiryStatus(p({ expiresAt: '2027-10-20' }), today, 30)).toBe('unopened');
  });
  it('is expiring exactly on the warning boundary and ok one day after', () => {
    expect(expiryStatus(p({ expiresAt: '2026-11-05', openedAt: '2026-09-01' }), today, 30)).toBe(
      'expiring',
    );
    expect(expiryStatus(p({ expiresAt: '2026-11-06', openedAt: '2026-09-01' }), today, 30)).toBe(
      'ok',
    );
  });
  it('is expiring on the day itself and expired the day after', () => {
    expect(expiryStatus(p({ expiresAt: today, openedAt: '2026-09-01' }), today, 30)).toBe(
      'expiring',
    );
    expect(expiryStatus(p({ expiresAt: '2026-10-05', openedAt: '2026-09-01' }), today, 30)).toBe(
      'expired',
    );
  });
});

describe('daysLeft and progress', () => {
  it('counts days left', () => {
    expect(daysLeft(p({ expiresAt: '2026-10-18' }), today)).toBe(12);
    expect(daysLeft(p({ expiresAt: '2026-10-03' }), today)).toBe(-3);
    expect(daysLeft(p(), today)).toBeNull();
  });
  it('computes progress from opened to expiry', () => {
    const prod = p({ openedAt: '2026-10-01', expiresAt: '2026-10-11' });
    expect(expiryProgress(prod, today)).toBeCloseTo(0.5);
    expect(expiryProgress(prod, '2026-12-01')).toBe(1);
    expect(expiryProgress(prod, '2026-09-01')).toBe(0);
    expect(
      expiryProgress(p({ expiresAt: '2026-10-11', purchasedAt: '2026-10-01' }), today),
    ).toBeCloseTo(0.5);
    expect(expiryProgress(p({ expiresAt: '2026-10-11' }), today)).toBeNull();
    expect(expiryProgress(p({ openedAt: '2026-10-11', expiresAt: '2026-10-11' }), today)).toBe(1);
  });
  it('knows the warning day', () => {
    expect(warningDay(p({ expiresAt: '2026-11-05' }), 30)).toBe('2026-10-06');
    expect(warningDay(p(), 30)).toBeNull();
  });
  it('shows badges only when attention is needed', () => {
    expect(needsBadge('ok')).toBe(false);
    expect(needsBadge('nodate')).toBe(true);
  });
});

describe('sortBySoonestExpiry', () => {
  it('puts expired first, then soonest, then no date', () => {
    const list = [
      { name: 'No date', ...p() },
      { name: 'Later', ...p({ expiresAt: '2027-01-01' }) },
      { name: 'Expired long ago', ...p({ expiresAt: '2026-01-01' }) },
      { name: 'Soon', ...p({ expiresAt: '2026-10-10' }) },
      { name: 'Expired', ...p({ expiresAt: '2026-10-01' }) },
      { name: 'A no date', ...p() },
      { name: 'Same B', ...p({ expiresAt: '2026-10-10' }) },
    ];
    expect(sortBySoonestExpiry(list, today).map((x) => x.name)).toEqual([
      'Expired long ago',
      'Expired',
      'Same B',
      'Soon',
      'Later',
      'A no date',
      'No date',
    ]);
  });
});
