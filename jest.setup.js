/* global jest */
jest.mock('react-native-worklets', () => require('react-native-worklets/src/mock'));
jest.mock('react-native-reanimated', () => {
  const mock = require('react-native-reanimated/mock');
  return {
    ...mock,
    createAnimatedComponent: mock.default.createAnimatedComponent,
    useReducedMotion: () => false,
  };
});
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
