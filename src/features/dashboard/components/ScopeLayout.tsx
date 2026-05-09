import type { ReactNode } from 'react';

type Props = {
  primary: ReactNode;
  sidebar: ReactNode;
  /** Classe extra no contentor da grelha (ex.: tour ids). */
  className?: string;
};

/**
 * Layout 12 col consistente: 8+4 em desktop, coluna única em mobile.
 */
export function ScopeLayout({ primary, sidebar, className = '' }: Props) {
  return (
    <div className={`scope-layout ${className}`.trim()}>
      <div className="scope-layout__primary">{primary}</div>
      <aside className="scope-layout__sidebar">{sidebar}</aside>
    </div>
  );
}
