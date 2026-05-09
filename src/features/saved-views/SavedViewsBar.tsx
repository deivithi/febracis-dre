import { Link2, MoreHorizontal, Pin, Star, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { SavedViewFiltersV1 } from './savedViewFilters';
import { parseSavedFilters, stableFiltersFingerprint } from './savedViewFilters';
import type { SavedViewPage, SavedViewRow } from './savedView.types';
import { pageToHref } from './savedViewRoutes';
import { applyFiltersToSearchParams, buildShareSearchParams } from './savedViewUrl';
import './SavedViewsBar.css';

type SavedViewsBarProps = {
  page: SavedViewPage;
  views: SavedViewRow[];
  activeViewId: string | null;
  currentFilters: SavedViewFiltersV1;
  shareBasePath: string;
  onApplyView: (row: SavedViewRow) => void;
  onClearDefault: () => void;
  onOpenSaveDialog: () => void;
  onRename: (row: SavedViewRow, newName: string) => void;
  onTogglePin: (row: SavedViewRow, pinned: boolean) => void;
  onDelete: (row: SavedViewRow) => void;
  suggestionBanner?: { show: boolean; onOpenDialog: () => void; onDismiss: () => void } | null;
};

function filtersEqual(row: SavedViewRow, current: SavedViewFiltersV1): boolean {
  const parsed = parseSavedFilters(row.page as SavedViewPage, row.filters);
  return stableFiltersFingerprint(parsed) === stableFiltersFingerprint(current);
}

export function SavedViewsBar({
  page,
  views,
  activeViewId,
  currentFilters,
  shareBasePath,
  onApplyView,
  onClearDefault,
  onOpenSaveDialog,
  onRename,
  onTogglePin,
  onDelete,
  suggestionBanner,
}: SavedViewsBarProps) {
  const [menuId, setMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) {
        setMenuId(null);
      }
    };
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, []);

  const copyShareLink = async () => {
    const qs = buildShareSearchParams(page, currentFilters).toString();
    const path = shareBasePath.startsWith('/') ? shareBasePath : `/${shareBasePath}`;
    const base = import.meta.env.BASE_URL.replace(/\/$/, '');
    const url = `${window.location.origin}${base}${path}${qs ? `?${qs}` : ''}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt('Copiar ligação:', url);
    }
  };

  const defaultSelected =
    !activeViewId && views.every((v) => !filtersEqual(v, currentFilters));

  return (
    <div className="saved-views-bar">
      {suggestionBanner?.show ? (
        <div className="saved-views-bar__suggest inline-message" role="status">
          <span>Usou estes filtros várias vezes nesta página. </span>
          <button type="button" className="btn btn--link" onClick={suggestionBanner.onOpenDialog}>
            Guardar como vista?
          </button>
          <button type="button" className="saved-views-bar__dismiss" onClick={suggestionBanner.onDismiss}>
            Dispensar
          </button>
        </div>
      ) : null}

      <div className="saved-views-bar__row">
        <span className="saved-views-bar__label">Vistas</span>
        <div className="saved-views-bar__chips" role="list">
          <button
            type="button"
            role="listitem"
            className={`saved-views-chip ${defaultSelected ? 'saved-views-chip--active' : ''}`}
            onClick={onClearDefault}
          >
            Padrão
          </button>
          {views.map((row) => {
            const active = activeViewId === row.id || (!activeViewId && filtersEqual(row, currentFilters));
            return (
              <div key={row.id} className="saved-views-chip-wrap">
                <button
                  type="button"
                  role="listitem"
                  className={`saved-views-chip ${active ? 'saved-views-chip--active' : ''}`}
                  onClick={() => onApplyView(row)}
                >
                  {row.is_pinned ? <Star size={14} className="saved-views-chip__star" aria-hidden /> : null}
                  {row.name}
                </button>
                <div className="saved-views-chip__menu" ref={menuId === row.id ? menuRef : undefined}>
                  <button
                    type="button"
                    className="saved-views-chip__kebab"
                    aria-label={`Menu de ${row.name}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuId((id) => (id === row.id ? null : row.id));
                    }}
                  >
                    <MoreHorizontal size={16} aria-hidden />
                  </button>
                  {menuId === row.id ? (
                    <ul className="saved-views-dropdown" role="menu">
                      <li>
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setMenuId(null);
                            const next = window.prompt('Novo nome da vista', row.name);
                            if (next && next.trim()) {
                              onRename(row, next.trim());
                            }
                          }}
                        >
                          Renomear
                        </button>
                      </li>
                      <li>
                        <button type="button" role="menuitem" onClick={() => onTogglePin(row, !row.is_pinned)}>
                          {row.is_pinned ? 'Desfixar' : 'Fixar'}
                          <Pin size={14} aria-hidden />
                        </button>
                      </li>
                      <li>
                        <button
                          type="button"
                          role="menuitem"
                          className="saved-views-dropdown__danger"
                          onClick={() => {
                            setMenuId(null);
                            if (
                              window.confirm(
                                `Excluir a vista “${row.name}”? Esta ação não pode ser anulada.`,
                              )
                            ) {
                              onDelete(row);
                            }
                          }}
                        >
                          Excluir
                          <Trash2 size={14} aria-hidden />
                        </button>
                      </li>
                    </ul>
                  ) : null}
                </div>
              </div>
            );
          })}
          <button type="button" className="saved-views-chip saved-views-chip--add" onClick={onOpenSaveDialog}>
            + Salvar atual
          </button>
        </div>

        <div className="saved-views-bar__actions">
          <button type="button" className="btn btn--secondary btn--small" onClick={() => void copyShareLink()}>
            <Link2 size={16} aria-hidden />
            Copiar ligação
          </button>
        </div>
      </div>
    </div>
  );
}

/** Navegação lateral: vista fixada. Contagem **—** (sem N+1). */
export function buildPinnedViewLocation(row: SavedViewRow): { pathname: string; search: string } {
  const p = row.page as SavedViewPage;
  const pathname = pageToHref(p);
  const parsed = parseSavedFilters(p, row.filters);
  const params = applyFiltersToSearchParams(p, new URLSearchParams(), parsed, { viewId: row.id });
  return { pathname, search: `?${params.toString()}` };
}
