import { TooltipRoot, TooltipTrigger, TooltipContent } from '../../components/ui/tooltip';

type ApprovalQueueTruncatedCellProps = {
  text: string;
  className?: string;
};

/** Célula com `truncate`; texto completo no Radix Tooltip (hover/teclado). */
export function ApprovalQueueTruncatedCell({ text, className = '' }: ApprovalQueueTruncatedCellProps) {
  return (
    <TooltipRoot delayDuration={400}>
      <TooltipTrigger asChild>
        <span className={`block min-w-0 max-w-full truncate ${className}`}>{text}</span>
      </TooltipTrigger>
      <TooltipContent side="top" align="start">
        {text}
      </TooltipContent>
    </TooltipRoot>
  );
}
