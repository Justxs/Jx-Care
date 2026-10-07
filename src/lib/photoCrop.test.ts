import { portraitPlan, progressPhotoName } from './photoCrop';

describe('portraitPlan', () => {
  it('centre-crops a landscape photo to 3:4 and scales it down', () => {
    expect(portraitPlan(4032, 3024)).toEqual({
      crop: { originX: 882, originY: 0, width: 2268, height: 3024 },
      resize: { width: 1200, height: 1600 },
    });
  });

  it('crops a tall 9:16 portrait to 3:4 from the middle', () => {
    expect(portraitPlan(1080, 1920)).toEqual({
      crop: { originX: 0, originY: 240, width: 1080, height: 1440 },
      resize: null,
    });
  });

  it('only scales a photo that already is 3:4', () => {
    expect(portraitPlan(3024, 4032)).toEqual({
      crop: null,
      resize: { width: 1200, height: 1600 },
    });
  });

  it('leaves a small 3:4 photo alone and never scales up', () => {
    expect(portraitPlan(600, 800)).toEqual({ crop: null, resize: null });
    expect(portraitPlan(601, 800)).toEqual({ crop: null, resize: null });
  });
});

it('names a photo by angle and time taken', () => {
  expect(progressPhotoName('front', 1759730400000)).toBe('front-1759730400000.jpg');
});
