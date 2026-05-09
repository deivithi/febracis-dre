/**
 * U19 — Subproduto sidebar (wordmark tipográfico).
 * STOP-AND-CALL: wordmark provisório até aprovação formal de marca.
 */

const LOGO_ALT =
  'Febracis Escola de Negócios — inteligência emocional, liderança e gestão';

export function SidebarBrand() {
  const logoSrc = `${import.meta.env.BASE_URL}images/logo-febracis.png`;
  const tooltip = `Portal gerencial DRE Febracis · v${__APP_VERSION__}`;

  return (
    <div className="sidebar-brand">
      <div className="sidebar__logo-mark">
        <img src={logoSrc} alt={LOGO_ALT} className="sidebar__logo-image" />
      </div>

      <div className="sidebar-brand__wordmark-slot">
        <span className="sidebar__wordmark sidebar__wordmark--full" title={tooltip}>
          febracis·dre
        </span>
        <span className="sidebar__wordmark sidebar__wordmark--abbr" title={tooltip}>
          fbcs·dre
        </span>
      </div>

      <p className="sidebar__brand-tagline">Inteligência Emocional · Liderança · Gestão</p>
    </div>
  );
}
