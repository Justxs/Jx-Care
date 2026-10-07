import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// jsdom has no scrolling; the router's scroll restoration calls this on every navigation.
window.scrollTo = () => {};

afterEach(() => {
  cleanup();
  localStorage.clear();
});

// jsdom has <dialog> but not its modal methods.
HTMLDialogElement.prototype.showModal ??= function showModal(this: HTMLDialogElement) {
  this.setAttribute('open', '');
};
HTMLDialogElement.prototype.close ??= function close(this: HTMLDialogElement) {
  this.removeAttribute('open');
  this.dispatchEvent(new Event('close'));
};
