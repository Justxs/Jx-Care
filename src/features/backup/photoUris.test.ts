import { eq } from 'drizzle-orm';

import { product, progressEntry, progressPhoto } from '@/db/schema';
import { createTestDb } from '@/db/test-db';

import { rebasePhotoUri } from './format';
import { rebasePhotoUris } from './repo';

const OLD = 'file:///var/mobile/Containers/Data/Application/AAAA-1111/Documents/';
const NOW = 'file:///var/mobile/Containers/Data/Application/BBBB-2222/Documents/';

describe('rebasePhotoUri', () => {
  it('moves a photo from an old documents folder onto the current one', () => {
    expect(rebasePhotoUri(`${OLD}products/a.jpg`, NOW)).toBe(`${NOW}products/a.jpg`);
    expect(rebasePhotoUri(`${OLD}progress/skin/2026-10-05/front-1.jpg`, NOW)).toBe(
      `${NOW}progress/skin/2026-10-05/front-1.jpg`,
    );
  });

  it('leaves current, foreign and odd uris alone', () => {
    expect(rebasePhotoUri(`${NOW}products/a.jpg`, NOW)).toBe(`${NOW}products/a.jpg`);
    expect(rebasePhotoUri('https://example.com/products/a.jpg', NOW)).toBe(
      'https://example.com/products/a.jpg',
    );
    expect(rebasePhotoUri('file:///tmp/cache/photo.jpg', NOW)).toBe('file:///tmp/cache/photo.jpg');
    expect(rebasePhotoUri(`${OLD}products/../secret`, NOW)).toBe(`${OLD}products/../secret`);
  });
});

describe('rebasePhotoUris', () => {
  it('fixes every product and progress photo after the folder moved, and nothing else', () => {
    const db = createTestDb();
    const p = db
      .insert(product)
      .values({ name: 'Serum', area: 'skin', photoUri: `${OLD}products/a.jpg`, updatedAt: 5 })
      .returning()
      .get();
    db.insert(product).values({ name: 'No photo', area: 'skin' }).run();
    const entry = db
      .insert(progressEntry)
      .values({ area: 'skin', weekStart: '2026-10-05' })
      .returning()
      .get();
    db.insert(progressPhoto)
      .values([
        {
          entryId: entry.id,
          angle: 'front',
          fileUri: `${OLD}progress/skin/2026-10-05/front-1.jpg`,
        },
        { entryId: entry.id, angle: 'left', fileUri: `${NOW}progress/skin/2026-10-05/left-1.jpg` },
      ])
      .run();

    expect(rebasePhotoUris(db, NOW)).toBe(2);
    const saved = db.select().from(product).where(eq(product.id, p.id)).get();
    expect(saved?.photoUri).toBe(`${NOW}products/a.jpg`);
    // Not an edit by the person.
    expect(saved?.updatedAt).toBe(5);
    expect(db.select({ uri: progressPhoto.fileUri }).from(progressPhoto).all()).toEqual([
      { uri: `${NOW}progress/skin/2026-10-05/front-1.jpg` },
      { uri: `${NOW}progress/skin/2026-10-05/left-1.jpg` },
    ]);

    // The next launch has nothing to do.
    expect(rebasePhotoUris(db, NOW)).toBe(0);
  });
});
