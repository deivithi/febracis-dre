import type { LucideIcon } from 'lucide-react';
import { Eye, ScrollText, ShieldCheck, Store, Users } from 'lucide-react';
import type { GuideRoleKey } from './guide-data';
import { guideRoleProfiles } from './guide-data';
import { RoleCard } from './RoleCard';

const ICONS: Record<GuideRoleKey, LucideIcon> = {
  system_admin: ShieldCheck,
  finance_controller: ScrollText,
  regional_manager: Users,
  franchise_user: Store,
  viewer: Eye,
};

const ICON_CLASS: Record<GuideRoleKey, string> = {
  system_admin: 'text-danger',
  finance_controller: 'text-warning',
  regional_manager: 'role-card__icon--accent-blue',
  franchise_user: 'text-success',
  viewer: 'text-muted',
};

export function AccessMatrix() {
  return (
    <section
      className="card access-matrix"
      aria-labelledby="guide-matrix-heading"
      data-screenshot-id="guide-05"
    >
      <div className="card__header access-matrix__header">
        <div className="access-matrix__titles">
          <p className="access-matrix__eyebrow typo-eyebrow">QUEM PODE FAZER O QUÊ</p>
          <h2 id="guide-matrix-heading" className="access-matrix__heading typo-h2">
            Cinco perfis. Três escopos. Uma matriz auditável.
          </h2>
          <p className="access-matrix__lead typo-body-sm">O papel define a ação. O escopo define o alcance.</p>
        </div>
      </div>
      <div className="card__body card__body--compact">
        <div className="access-matrix__grid">
          {guideRoleProfiles.map((p) => (
            <RoleCard
              key={p.roleKey}
              roleKey={p.roleKey}
              title={p.title}
              icon={ICONS[p.roleKey]}
              iconClassName={ICON_CLASS[p.roleKey]}
              scopePill={p.scopePill}
              primaryAction={p.primaryAction}
              bullets={p.bullets}
              technicalDetails={p.technicalDetails}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
