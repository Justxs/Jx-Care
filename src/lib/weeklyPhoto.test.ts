import {
  isPhotoAngle,
  isPhotoRowDay,
  nextPhotoDay,
  photoDayOfWeek,
  photoDays,
  sessionAngles,
} from './weeklyPhoto';

// 2026-10-05 is a Monday.
describe('photoDayOfWeek', () => {
  it('finds the chosen weekday in the week of any day', () => {
    expect(photoDayOfWeek('2026-10-05', 7)).toBe('2026-10-11');
    expect(photoDayOfWeek('2026-10-11', 7)).toBe('2026-10-11');
    expect(photoDayOfWeek('2026-10-09', 3)).toBe('2026-10-07');
    expect(photoDayOfWeek('2026-10-07', 1)).toBe('2026-10-05');
  });
});

describe('isPhotoRowDay', () => {
  it('shows from the weekday to the end of the week', () => {
    // Wednesday photo day.
    expect(isPhotoRowDay('2026-10-05', 3)).toBe(false);
    expect(isPhotoRowDay('2026-10-06', 3)).toBe(false);
    expect(isPhotoRowDay('2026-10-07', 3)).toBe(true);
    expect(isPhotoRowDay('2026-10-11', 3)).toBe(true);
    // The next Monday starts a new week.
    expect(isPhotoRowDay('2026-10-12', 3)).toBe(false);
  });

  it('shows only on Sunday with the default weekday', () => {
    expect(isPhotoRowDay('2026-10-10', 7)).toBe(false);
    expect(isPhotoRowDay('2026-10-11', 7)).toBe(true);
  });
});

describe('photoDays', () => {
  it('lists this week and the next ones', () => {
    expect(photoDays('2026-10-07', 7, 3)).toEqual(['2026-10-11', '2026-10-18', '2026-10-25']);
    expect(photoDays('2026-10-07', 1, 2)).toEqual(['2026-10-05', '2026-10-12']);
    expect(photoDays('2026-10-07', 1, 0)).toEqual([]);
  });
});

describe('sessionAngles', () => {
  it('always starts skin with Front, then the tracked sides in order', () => {
    expect(sessionAngles('skin', { skinAngles: ['front'], hairAngles: [] })).toEqual(['front']);
    expect(sessionAngles('skin', { skinAngles: ['right', 'left'], hairAngles: [] })).toEqual([
      'front',
      'left',
      'right',
    ]);
  });

  it('takes the hair angles in order, Front when none is on', () => {
    expect(sessionAngles('hair', { skinAngles: [], hairAngles: ['top', 'front', 'back'] })).toEqual(
      ['front', 'back', 'top'],
    );
    expect(sessionAngles('hair', { skinAngles: [], hairAngles: ['top'] })).toEqual(['top']);
    expect(sessionAngles('hair', { skinAngles: [], hairAngles: [] })).toEqual(['front']);
  });
});

describe('nextPhotoDay', () => {
  it("is this week's photo day until it comes", () => {
    expect(nextPhotoDay('2026-10-07', 7, false)).toBe('2026-10-11');
  });

  it('is today once the photo day has come and the photo is still due', () => {
    expect(nextPhotoDay('2026-10-11', 7, false)).toBe('2026-10-11');
    // Wednesday photo day, still not taken on Friday.
    expect(nextPhotoDay('2026-10-09', 3, false)).toBe('2026-10-09');
  });

  it('moves to next week once this week is taken or skipped', () => {
    expect(nextPhotoDay('2026-10-07', 7, true)).toBe('2026-10-18');
    expect(nextPhotoDay('2026-10-05', 1, true)).toBe('2026-10-12');
  });
});

describe('isPhotoAngle', () => {
  it('accepts only known angles', () => {
    expect(isPhotoAngle('left')).toBe(true);
    expect(isPhotoAngle('side')).toBe(false);
    expect(isPhotoAngle(undefined)).toBe(false);
  });
});
