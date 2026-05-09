import { NavLink } from 'react-router-dom';

import { GUIDE_NAV_ITEMS, GUIDE_HUB_PATH } from './guideNav';

/**
 * Navegação secundária entre subpáginas do Guia (substitui TOC por âncoras na página única).
 */
export function GuideSubNav() {
  return (
    <nav className="guide-subnav" aria-label="Secções do guia">
      <ul className="guide-subnav__list">
        {GUIDE_NAV_ITEMS.map((item) => {
          const isHub = item.path === GUIDE_HUB_PATH;

          return (
            <li key={item.path} className="guide-subnav__item">
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  ['guide-subnav__link', 'typo-body-sm', isActive ? 'guide-subnav__link--active' : '']
                    .filter(Boolean)
                    .join(' ')
                }
                end={isHub}
              >
                {item.label}
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
