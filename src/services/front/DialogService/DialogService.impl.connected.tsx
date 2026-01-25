import { createRequestResponseMessaging, delay } from '@passionware/platform-js';
import { Fragment, ReactNode, useEffect, useRef, useState } from 'react';
import { v4 } from 'uuid';
import { MountElementHandler } from './DialogService';
import { createDialogService } from './DialogService.imlp';

type RenderedElement = {
  node: ReactNode;
  id: string;
};




export interface MountElementMessage<T> {
  request: {
    handler: MountElementHandler<T>;
  };
  response: void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mountElementEvent = createRequestResponseMessaging<MountElementMessage<any>>();


/**
 * Global gateway for mounting dialogs independently of their triggers.
 *
 * Primary use case: When a dialog's trigger (e.g., button in a dropdown or route) gets unmounted
 * while the dialog is closing, the dialog's fade-out animation would be abruptly cut off.
 * By mounting the dialog content here (at the app root), the exit animation completes gracefully
 * even after the trigger is gone.
 *
 * Features:
 * - Captures focused element at mount time and restores focus on close
 * - Manages open/close state independently of trigger lifecycle
 * - Cleans up after exit animation completes
 */

export function DialogServiceHandler() {
  const [elements, setElements] = useState<RenderedElement[]>([]);

  useEffect(() => {
    const unsubscribe = mountElementEvent.subscribeToRequest(
      payload => {
        const id = v4();
        // Capture the currently focused element before mounting the dialog
        const previouslyFocusedElement =
          document.activeElement as HTMLElement | null;

        const renderedElement = (
          <ElementRenderer
            key={id}
            previouslyFocusedElement={previouslyFocusedElement}
            renderChildren={api => {
              const handleOpenChange = async (open: boolean) => {
                api.onOpenChange(open);
                if (!open) {
                  payload.sendResponse(undefined);
                  await delay(1000);
                  setElements(prev => prev.filter(e => e.id !== id));
                }
              };

              return payload.request.handler({
                ...api,
                onOpenChange: handleOpenChange,
                close: () => handleOpenChange(false)
              });
            }}
          />
        );
        setElements(prev => [...prev, { node: renderedElement, id }]);
      }
    );
    return () => unsubscribe();
  }, []);

  return elements.map(e => <Fragment key={e.id}>{e.node}</Fragment>);
}

function ElementRenderer({
  renderChildren,
  previouslyFocusedElement
}: {
  renderChildren: (api: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
  }) => ReactNode;
  previouslyFocusedElement: HTMLElement | null;
}) {
  const [open, setOpen] = useState(true);
  const hasRestoredFocus = useRef(false);

  useEffect(() => {
    // Restore focus when dialog closes
    if (!open && !hasRestoredFocus.current) {
      hasRestoredFocus.current = true;
      // Use requestAnimationFrame to ensure DOM is ready after dialog unmounts
      requestAnimationFrame(() => {
        if (
          previouslyFocusedElement &&
          document.body.contains(previouslyFocusedElement)
        ) {
          previouslyFocusedElement.focus();
        }
      });
    }
  }, [open, previouslyFocusedElement]);

  return renderChildren({ open, onOpenChange: setOpen });
}

export const myDialogService = createDialogService(mountElementEvent);