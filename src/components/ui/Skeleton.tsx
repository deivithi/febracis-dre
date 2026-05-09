import type { HTMLAttributes } from 'react';
import './Skeleton.css';

export type SkeletonProps = HTMLAttributes<HTMLDivElement>;

/** Minimal skeleton primitive — Febracis tokens, pulse (no Tailwind in repo). */
export function Skeleton({ className = '', style, ...rest }: SkeletonProps) {
  return <div className={`ui-skeleton-block ${className}`.trim()} style={style} {...rest} />;
}
