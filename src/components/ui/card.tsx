import type { HTMLAttributes } from 'react';

/** Hierarquia de raios U11 — mapeamento espelha Tailwind (projeto usa CSS vars). */
export type CardVariant = 'kpi' | 'hero' | 'inline' | 'modal' | 'default';

const VARIANT_MODIFIER: Record<CardVariant, string | undefined> = {
  default: undefined,
  kpi: 'card--v-kpi',
  hero: 'card--v-hero',
  inline: 'card--v-inline',
  modal: 'card--v-modal',
};

export type CardProps = HTMLAttributes<HTMLElement> & {
  variant?: CardVariant;
  as?: 'div' | 'section' | 'article';
};

function mergeClasses(...parts: Array<string | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

/** Cartão base `.card` com raio explícito por variante. */
export function Card({
  variant = 'default',
  as: As = 'div',
  className,
  children,
  ...rest
}: CardProps & { children?: React.ReactNode }) {
  const mod = VARIANT_MODIFIER[variant];
  return (
    <As className={mergeClasses('card', mod, className)} {...rest}>
      {children}
    </As>
  );
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={mergeClasses('card__header', className)} {...props} />;
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={mergeClasses('card__title', className)} {...props} />;
}

export function CardSubtitle({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={mergeClasses('card__subtitle', className)} {...props} />;
}

export function CardBody({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={mergeClasses('card__body', className)} {...props} />;
}

export function CardFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={mergeClasses('card__footer', className)} {...props} />;
}
