import { ChevronRight } from 'lucide-react';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useIsMobileMax767 } from '../../hooks/useMediaQuery';
import './Breadcrumb.css';

export type BreadcrumbSegment = {
  label: string;
  href?: string;
  badge?: string;
  badgeTone?: 'warning' | 'success' | 'muted';
};

function SegmentBadge({ badge, tone }: { badge: string; tone?: BreadcrumbSegment['badgeTone'] }) {
  const toneClass =
    tone === 'warning'
      ? 'breadcrumb__badge--warning'
      : tone === 'success'
        ? 'breadcrumb__badge--success'
        : tone === 'muted'
          ? 'breadcrumb__badge--muted'
          : '';
  return (
    <span className={`breadcrumb__badge ${toneClass}`.trim()} aria-label={badge}>
      {badge}
    </span>
  );
}

function SegmentBody({ seg }: { seg: BreadcrumbSegment }) {
  return (
    <>
      <span className="breadcrumb__label">{seg.label}</span>
      {seg.badge ? <SegmentBadge badge={seg.badge} tone={seg.badgeTone} /> : null}
    </>
  );
}

function CollapsedMiddleMobile({
  middle,
  fullPathTitle,
}: {
  middle: BreadcrumbSegment[];
  fullPathTitle: string;
}) {
  return (
    <details className="breadcrumb__collapse">
      <summary className="breadcrumb__collapse-summary" title={fullPathTitle}>
        …
      </summary>
      <div className="breadcrumb__collapse-panel" role="menu">
        {middle.map((seg, i) =>
          seg.href ? (
            <Link key={`${seg.href}-${i}`} className="breadcrumb__collapse-link" to={seg.href}>
              <SegmentBody seg={seg} />
            </Link>
          ) : (
            <span key={`mid-${seg.label}-${i}`} className="breadcrumb__collapse-static">
              <SegmentBody seg={seg} />
            </span>
          ),
        )}
      </div>
    </details>
  );
}

export function Breadcrumb({ segments }: { segments: BreadcrumbSegment[] }) {
  const isMobile = useIsMobileMax767();
  const fullPathTitle = useMemo(() => segments.map((s) => s.label).join(' › '), [segments]);

  if (segments.length === 0) {
    return null;
  }

  const showCollapsedMiddle = isMobile && segments.length > 2;
  const first = segments[0];
  const last = segments[segments.length - 1];
  const middle = showCollapsedMiddle ? segments.slice(1, -1) : [];

  const renderPiece = (seg: BreadcrumbSegment, isLast: boolean) => {
    if (isLast || !seg.href) {
      return (
        <span
          className={isLast ? 'breadcrumb__current' : undefined}
          aria-current={isLast ? 'page' : undefined}
        >
          <SegmentBody seg={seg} />
        </span>
      );
    }

    return (
      <Link className="breadcrumb__link" to={seg.href}>
        <SegmentBody seg={seg} />
      </Link>
    );
  };

  return (
    <nav className="breadcrumb app-header__breadcrumb" aria-label="Navegação estrutural" title={fullPathTitle}>
      {showCollapsedMiddle ? (
        <>
          <span className="breadcrumb__segment">{renderPiece(first, false)}</span>
          <ChevronRight size={14} className="app-header__breadcrumb-sep" aria-hidden />
          <CollapsedMiddleMobile middle={middle} fullPathTitle={fullPathTitle} />
          <ChevronRight size={14} className="app-header__breadcrumb-sep" aria-hidden />
          <span className="breadcrumb__segment">{renderPiece(last, true)}</span>
        </>
      ) : (
        segments.map((seg, index) => (
          <span key={`${seg.label}-${index}-${seg.href ?? ''}`} className="breadcrumb__segment">
            {index > 0 ? <ChevronRight size={14} className="app-header__breadcrumb-sep" aria-hidden /> : null}
            {renderPiece(seg, index === segments.length - 1)}
          </span>
        ))
      )}
    </nav>
  );
}
