import { createContext, type ReactNode, useContext, useMemo, useState } from 'react';

type SidebarDrawerContextValue = {
  open: boolean;
  setOpen: (next: boolean) => void;
};

const SidebarDrawerContext = createContext<SidebarDrawerContextValue | null>(null);

export function SidebarDrawerProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const value = useMemo(() => ({ open, setOpen }), [open]);

  return <SidebarDrawerContext.Provider value={value}>{children}</SidebarDrawerContext.Provider>;
}

export function useSidebarDrawer(): SidebarDrawerContextValue {
  const ctx = useContext(SidebarDrawerContext);
  if (!ctx) {
    throw new Error('useSidebarDrawer must be used within SidebarDrawerProvider');
  }
  return ctx;
}
