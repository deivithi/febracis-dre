import type { ReactNode } from 'react';

type Props = {
  ranking: ReactNode;
  sidebarStatus: ReactNode;
  sidebarTop: ReactNode;
  sidebarQueue: ReactNode;
  className?: string;
};

/** Cockpit holding: ranking à esquerda, três cartões densos à direita (layout bento). */
export function HoldingBento({ ranking, sidebarStatus, sidebarTop, sidebarQueue, className = '' }: Props) {
  return (
    <div className={`holding-bento ${className}`.trim()}>
      <div className="holding-bento__ranking">{ranking}</div>
      <div className="holding-bento__sb-status">{sidebarStatus}</div>
      <div className="holding-bento__sb-top">{sidebarTop}</div>
      <div className="holding-bento__sb-queue">{sidebarQueue}</div>
    </div>
  );
}
