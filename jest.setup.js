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
