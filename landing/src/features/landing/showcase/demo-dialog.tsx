import { X } from 'lucide-react';
import { useEffect, useId, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { buttonClasses } from '@/components/button';

import { LiveDemo } from './live-demo';

/**
 * The real app in a phone-sized window over the page, opened by "View demo". Nothing loads until
 * it opens, and closing it (Escape, the close button or a click outside) drops the demo again, so
 * the next visit starts fresh. While it loads, the screen shows a quiet line of text in its place.
 */
export function DemoDialog({ open, onClose }: Readonly<{ open: boolean; onClose: () => void }>) {
  const { t } = useTranslation();
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) element.showModal();
    if (!open && element.open) element.close();
  }, [open]);

  // A click on the backdrop lands on the dialog itself; clicks inside land on its children. Escape
  // already closes it natively.
  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    const onClick = (event: MouseEvent) => {
      if (event.target === element) onClose();
    };
    element.addEventListener('click', onClick);
    return () => element.removeEventListener('click', onClick);
  }, [onClose]);

  return (
    <dialog
      ref={dialog}
      aria-labelledby={titleId}
      onClose={onClose}
      className="m-auto max-h-none max-w-none overflow-visible bg-transparent p-4 text-hero-ink opacity-0 backdrop:bg-black/85 backdrop:backdrop-blur-md backdrop:opacity-0 open:opacity-100 open:backdrop:opacity-100 motion-safe:scale-95 motion-safe:transition-[opacity,scale,display,overlay] motion-safe:duration-300 motion-safe:ease-out motion-safe:transition-discrete motion-safe:open:scale-100 motion-safe:backdrop:transition-[opacity,display,overlay] motion-safe:backdrop:duration-300 motion-safe:backdrop:transition-discrete motion-safe:starting:open:scale-95 motion-safe:starting:open:opacity-0 motion-safe:starting:open:backdrop:opacity-0"
    >
      <div className="flex items-center justify-between gap-4 pb-3 pl-2 text-white">
        <div>
          <h2 id={titleId} className="text-title-s font-semibold">
            {t('demo.title')}
          </h2>
          <p className="text-label text-white/75">{t('demo.note')}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t('demo.close')}
          title={t('demo.close')}
          className={buttonClasses({
            variant: 'ghost',
            size: 'icon',
            className: 'text-white hover:bg-white/15 hover:text-white',
          })}
        >
          <X aria-hidden="true" />
        </button>
      </div>
      <div className="rounded-[46px] bg-linear-to-b from-[#3b3236] via-[#1e191b] to-[#2c2528] p-[7px] shadow-[0_24px_64px_rgb(0_0_0/0.5)] ring-1 ring-white/15">
        <div className="relative h-[min(844px,calc(100dvh-8rem))] w-[min(390px,calc(100vw-3rem))] overflow-hidden rounded-[39px] bg-canvas">
          <p className="absolute inset-0 grid place-items-center text-body text-ink-muted">
            {t('demo.loading')}
          </p>
          {open ? <LiveDemo className="absolute inset-0 size-full" /> : null}
        </div>
      </div>
    </dialog>
  );
}
