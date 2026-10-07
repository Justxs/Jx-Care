import { ImageManipulator } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import { PHOTO_SIZE, pickProductPhoto } from './photo';

jest.mock('expo-image-picker', () => ({ launchImageLibraryAsync: jest.fn() }));

const mockResize = jest.fn();
jest.mock('expo-image-manipulator', () => {
  const image = {
    resize: (size: object) => {
      mockResize(size);
      return image;
    },
    renderAsync: () =>
      Promise.resolve({ saveAsync: () => Promise.resolve({ uri: 'file:///cache/out.jpg' }) }),
  };
  return { ImageManipulator: { manipulate: jest.fn(() => image) }, SaveFormat: { JPEG: 'jpeg' } };
});

jest.mock('expo-file-system', () => {
  class Directory {
    exists = true;
    create() {}
  }
  class File {
    uri = 'file:///documents/products/new.jpg';
    move() {}
  }
  return { Directory, File, Paths: { document: {} } };
});

function picks(width: number, height: number) {
  jest.mocked(ImagePicker.launchImageLibraryAsync).mockResolvedValue({
    canceled: false,
    assets: [{ uri: 'file:///picked.jpg', width, height }],
  } as unknown as ImagePicker.ImagePickerResult);
}

beforeEach(() => mockResize.mockClear());

describe('pickProductPhoto', () => {
  it('shrinks a large photo to PHOTO_SIZE on its longest side', async () => {
    picks(3000, 4000);
    expect(await pickProductPhoto('library')).toMatchObject({ status: 'picked' });
    expect(mockResize).toHaveBeenCalledWith({ height: PHOTO_SIZE });
    expect(ImageManipulator.manipulate).toHaveBeenCalledWith('file:///picked.jpg');
  });

  it('keeps a small photo at its own size', async () => {
    picks(800, 800);
    expect(await pickProductPhoto('library')).toMatchObject({ status: 'picked' });
    expect(mockResize).not.toHaveBeenCalled();
  });
});
