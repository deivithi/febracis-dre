import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { type ReactNode } from 'react';
import './sheet.css';

export const Sheet = DialogPrimitive.Root;
export const SheetTrigger = DialogPrimitive.Trigger;

type SheetContentProps = {
  children: ReactNode;
  className?: string;
  side?: 'left' | 'right';
  title: string;
  description?: string;
};

export function SheetContent({ children, className = '', side = 'left', title, description }: SheetContentProps) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="febracis-sheet__overlay" />
      <DialogPrimitive.Content className={`febracis-sheet__content febracis-sheet__content--${side} ${className}`.trim()}>
        <DialogPrimitive.Title className="sr-only">{title}</DialogPrimitive.Title>
        {description ? (
          <DialogPrimitive.Description className="sr-only">{description}</DialogPrimitive.Description>
        ) : null}

        <div className="febracis-sheet__body">{children}</div>

        <DialogPrimitive.Close type="button" className="febracis-sheet__close" aria-label="Fechar menu">
          <X size={20} aria-hidden />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
