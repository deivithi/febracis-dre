import type { ReactNode } from 'react';

type Stripe = 'odd' | 'even';

export interface GuideSectionStripProps {
  stripe: Stripe;
  children: ReactNode;
}

/**
 * Faixa vertical (ritmo G10): padding generoso + fundo ímpar/par sobre tokens `--bg-base` / mistura com `--bg-surface`.
 */
export function GuideSectionStrip({ stripe, children }: GuideSectionStripProps) {
  return <div className={`guide-section-strip guide-section-strip--${stripe}`}>{children}</div>;
}
