import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';

export const TooltipProvider = TooltipPrimitive.Provider;

export const TooltipRoot = TooltipPrimitive.Root;
export const TooltipTrigger = TooltipPrimitive.Trigger;

export function TooltipContent({
  className = '',
  sideOffset = 4,
  ...props
}: ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        sideOffset={sideOffset}
        className={`tooltip-content z-[200] max-w-xs rounded-md border border-[color-mix(in_srgb,var(--text-primary)_12%,transparent)] bg-[var(--bg-elevated)] px-2.5 py-1.5 text-xs leading-snug text-[var(--text-primary)] shadow-lg ${className}`}
        {...props}
      />
    </TooltipPrimitive.Portal>
  );
}

const LOCK_TOOLTIP =
  'Submissão bloqueada — devolução exige ação da controladoria';

type SubmissionLockTooltipProps = {
  children: ReactNode;
};

/** Lock icon trigger with the canonical locked-submission message. */
export function SubmissionLockTooltip({ children }: SubmissionLockTooltipProps) {
  return (
    <TooltipRoot>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent>{LOCK_TOOLTIP}</TooltipContent>
    </TooltipRoot>
  );
}
