/* global jest */
jest.mock('react-native-worklets', () => require('react-native-worklets/src/mock'));
// The mock module itself gets the missing pieces, because expo-router's testing library mocks
// Reanimated again straight from 'react-native-reanimated/mock'.
jest.mock('react-native-reanimated/mock', () => {
  const mock = jest.requireActual('react-native-reanimated/mock');
  return {
    ...mock,
    createAnimatedComponent: mock.default.createAnimatedComponent,
    useReducedMotion: () => false,
    LayoutAnimationConfig: ({ children }) => children,
  };
});
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));
jest.mock('react-native-keyboard-controller', () =>
  require('react-native-keyboard-controller/jest'),
);
jest.mock('@gorhom/bottom-sheet', () => require('@gorhom/bottom-sheet/mock'));
jest.mock(
  'react-native-safe-area-context',
  () => require('react-native-safe-area-context/jest/mock').default,
);
require('react-native-gesture-handler/jestSetup');
// TanStack Form looks for its devtools on a timer after the first form renders, which keeps Jest
// from exiting. Tests have no devtools, so the event client starts disabled.
jest.mock('@tanstack/devtools-event-client', () => {
  const actual = jest.requireActual('@tanstack/devtools-event-client');
  class EventClient extends actual.EventClient {
    constructor(options) {
      super({ ...options, enabled: false });
    }
  }
  return { ...actual, EventClient };
});

// Host views in Jest never measure, so menus anchored to a trigger (rn-primitives DropdownMenu)
// would never open. Give every view a fixed frame instead.
{
  const nativeMethods = require('@react-native/jest-preset/jest/MockNativeMethods').default;
  nativeMethods.measure = jest.fn((callback) => callback?.(0, 0, 100, 44, 16, 100));
  nativeMethods.measureInWindow = jest.fn((callback) => callback?.(16, 100, 100, 44));
}
