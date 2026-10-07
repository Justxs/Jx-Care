import {
  formatCountdown,
  formatDate,
  formatDateField,
  formatDays,
  formatDuration,
  formatMoney,
  formatRelativeExpiry,
  formatTime,
  formatWeekdayDate,
  formatWeekdayList,
  isoWeekdayOf,
} from './format';

const nbsp = (s: string) => s.replace(/ | /g, ' ');
const today = '2026-10-06';

describe('formatDate', () => {
  it('shows EN dates without the year in the current year', () => {
    expect(formatDate('2026-10-15', 'en', today)).toBe('15 Oct');
    expect(formatDate('2026-09-01', 'en', today)).toBe('1 Sep');
  });
  it('adds the year in another year (EN)', () => {
    expect(formatDate('2027-03-01', 'en', today)).toBe('1 Mar 2027');
  });
  it('shows LT dates as YYYY-MM-DD', () => {
    expect(formatDate('2026-10-15', 'lt', today)).toBe('2026-10-15');
  });
  it('reads today as "Today, …"', () => {
    expect(formatDateField(today, 'en', today)).toBe('Today, 6 Oct');
    expect(formatDateField(today, 'lt', today)).toBe('Šiandien, 2026-10-06');
    expect(formatDateField('2026-10-05', 'en', today)).toBe('5 Oct');
  });
});

describe('weekdays', () => {
  it('knows ISO weekdays', () => {
    expect(isoWeekdayOf('2026-10-05')).toBe(1);
    expect(isoWeekdayOf('2026-10-11')).toBe(7);
  });
  it('formats weekday dates', () => {
    expect(formatWeekdayDate('2026-10-06', 'en')).toBe('Tuesday, 6 Oct');
    expect(formatWeekdayDate('2026-10-06', 'lt')).toBe('Antradienis, 2026-10-06');
    expect(formatWeekdayDate('2026-10-09', 'en', today)).toBe('Friday, 9 Oct');
  });
  it('lists short weekdays in order', () => {
    expect(formatWeekdayList([4, 1], 'en')).toBe('Mon, Thu');
    expect(formatWeekdayList([2, 5], 'lt')).toBe('An, Pn');
  });
});

describe('formatTime', () => {
  it('uses 24-hour time in LT and by default', () => {
    expect(formatTime('07:30', 'lt', false)).toBe('07:30');
    expect(formatTime('7:30', 'en')).toBe('07:30');
  });
  it('follows a 12-hour phone in EN', () => {
    expect(formatTime('07:30', 'en', false)).toBe('7:30 AM');
    expect(formatTime('21:05', 'en', false)).toBe('9:05 PM');
    expect(formatTime('00:15', 'en', false)).toBe('12:15 AM');
  });
});

describe('formatMoney', () => {
  it('formats LT and EN locales', () => {
    expect(nbsp(formatMoney(1250, 'EUR', 'lt-LT'))).toBe('12,50 €');
    expect(formatMoney(1250, 'EUR', 'en-GB')).toBe('€12.50');
    expect(formatMoney(21, 'EUR', 'en-GB')).toBe('€0.21');
  });
});

describe('formatDays', () => {
  it('uses Lithuanian plural forms', () => {
    expect(formatDays(1, 'lt')).toBe('1 diena');
    expect(formatDays(2, 'lt')).toBe('2 dienos');
    expect(formatDays(10, 'lt')).toBe('10 dienų');
    expect(formatDays(21, 'lt')).toBe('21 diena');
    expect(formatDays(0, 'lt')).toBe('0 dienų');
  });
  it('uses English plural forms', () => {
    expect(formatDays(1, 'en')).toBe('1 day');
    expect(formatDays(12, 'en')).toBe('12 days');
    expect(formatDays(0, 'en')).toBe('0 days');
  });
});

describe('formatRelativeExpiry', () => {
  it('handles future, zero and negative counts', () => {
    expect(formatRelativeExpiry(12, 'en')).toBe('Expires in 12 days');
    expect(formatRelativeExpiry(1, 'en')).toBe('Expires in 1 day');
    expect(formatRelativeExpiry(0, 'en')).toBe('Expires today');
    expect(formatRelativeExpiry(-3, 'en')).toBe('Expired 3 days ago');
    expect(formatRelativeExpiry(-1, 'en')).toBe('Expired 1 day ago');
    expect(formatRelativeExpiry(2, 'lt')).toBe('Galioja dar 2 dienas');
    expect(formatRelativeExpiry(0, 'lt')).toBe('Galioja iki šiandien');
    expect(formatRelativeExpiry(-10, 'lt')).toBe('Nebegalioja 10 dienų');
  });
});

describe('durations', () => {
  it('formats wait chips under and over a minute', () => {
    expect(formatDuration(30, 'en')).toBe('30 s');
    expect(formatDuration(60, 'en')).toBe('1 min');
    expect(formatDuration(900, 'lt')).toBe('15 min');
  });
  it('formats countdowns', () => {
    expect(formatCountdown(42)).toBe('0:42');
    expect(formatCountdown(60)).toBe('1:00');
    expect(formatCountdown(125.2)).toBe('2:06');
    expect(formatCountdown(-1)).toBe('0:00');
  });
});
