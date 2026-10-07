import { useEffect } from 'react';

/** Sets the tab title for the page that is on screen; it follows language changes. */
export function useDocumentTitle(title: string) {
  useEffect(() => {
    document.title = title;
  }, [title]);
}
