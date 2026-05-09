import * as Toast from '@radix-ui/react-toast';
import { useCallback, useEffect, useState } from 'react';
import { APP_TOAST_EVENT, type AppToastDetail } from '../../lib/appToast';
import './toast.css';

/**
 * Um único `Toast.Root` controlado + viewport; eventos globais para mutações (submit/aprovar).
 */
export function AppToastsProvider({ children }: { children: React.ReactNode }) {
  return (
    <Toast.Provider duration={4000} swipeDirection="right" label="Notificações do portal">
      {children}
      <AppToastBridge />
    </Toast.Provider>
  );
}

function AppToastBridge() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [variant, setVariant] = useState<'default' | 'success' | 'warning'>('default');
  const [toastKey, setToastKey] = useState(0);

  const show = useCallback((detail: AppToastDetail & { variant?: 'default' | 'success' | 'warning' }) => {
    setTitle(detail.title);
    setVariant(detail.variant ?? 'default');
    setToastKey((k) => k + 1);
    setOpen(true);
  }, []);

  useEffect(() => {
    const handler = (event: Event) => {
      const ce = event as CustomEvent<AppToastDetail & { variant?: 'default' | 'success' | 'warning' }>;
      if (ce.detail?.title) {
        show(ce.detail);
      }
    };
    window.addEventListener(APP_TOAST_EVENT, handler);
    return () => window.removeEventListener(APP_TOAST_EVENT, handler);
  }, [show]);

  return (
    <>
      <Toast.Root
        key={toastKey}
        open={open}
        onOpenChange={setOpen}
        type="foreground"
        className={`toast-root${
          variant === 'success' ? ' toast-root--success' : variant === 'warning' ? ' toast-root--warning' : ''
        }`}
      >
        <Toast.Title className="toast-title">{title}</Toast.Title>
      </Toast.Root>
      <Toast.Viewport className="toast-viewport" />
    </>
  );
}
