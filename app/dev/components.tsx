import { Redirect } from 'expo-router';

import { ComponentGallery } from '@/dev/ComponentGallery';

export default function ComponentGalleryRoute() {
  if (!__DEV__) return <Redirect href="/" />;
  return <ComponentGallery />;
}
