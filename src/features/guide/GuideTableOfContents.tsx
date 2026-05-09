import { BookOpen, Search } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { RefObject } from 'react';
import { Sheet, SheetContent } from '../../components/ui/sheet';
import { useIsNarrowMax1023 } from '../../hooks/useMediaQuery';
import { isTypingTarget } from '../../hooks/useGlobalShortcuts';
import type { GuideSectionId } from './guideSections';
import { GUIDE_SECTIONS } from './guideSections';

function normalizeText(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase();
}

/** includes normalizado + fuzzy mínimo (caracteres de q em ordem em label) */
function labelMatchesFilter(query: string, label: string): boolean {
  const q = normalizeText(query.trim());
  const l = normalizeText(label);
  if (!q) return true;
  if (l.includes(q)) return true;
  let i = 0;
  for (const ch of q) {
    const j = l.indexOf(ch, i);
    if (j === -1) return false;
    i = j + 1;
  }
  return true;
}

export type GuideTableOfContentsProps = {
  activeSectionId: GuideSectionId | null;
  /** Foco do atalho ⌘/Ctrl+K (só na rota guia). */
  searchInputRef?: RefObject<HTMLInputElement | null>;
  /** Raiz do guia — atalho só quando o foco está dentro. */
  containShortcutRoot?: HTMLElement | null;
};

export function GuideTableOfContents({
  activeSectionId,
  searchInputRef: searchInputRefProp,
  containShortcutRoot,
}: GuideTableOfContentsProps) {
  const narrow = useIsNarrowMax1023();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [filter, setFilter] = useState('');

  const filteredSections = useMemo(
    () => GUIDE_SECTIONS.filter((s) => labelMatchesFilter(filter, s.label)),
    [filter],
  );

  useEffect(() => {
    if (!narrow) {
      setDrawerOpen(false);
    }
  }, [narrow]);

  /** ⌘/Ctrl+K — foca busca; só dentro de `containShortcutRoot`. */
  useEffect(() => {
    if (typeof window === 'undefined' || !containShortcutRoot || !searchInputRefProp) {
      return;
    }

    const input = searchInputRefProp;

    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== 'k') return;
      const target = e.target as Node | null;
      if (!target || !containShortcutRoot.contains(target)) return;
      if (isTypingTarget(target) && target !== input.current) return;
      e.preventDefault();
      input.current?.focus();
      input.current?.select();
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [containShortcutRoot, searchInputRefProp]);

  const handleNavClick = useCallback(() => {
    setDrawerOpen(false);
  }, []);

  const searchField = (idSuffix: string) => (
    <div className="guide-toc__search">
      <Search size={16} aria-hidden className="guide-toc__search-icon" />
      <input
        ref={searchInputRefProp}
        id={`guide-toc-search-${idSuffix}`}
        type="search"
        className="guide-toc__search-input"
        placeholder="Buscar nesta página…"
        autoComplete="off"
        value={filter}
        onChange={(ev) => setFilter(ev.target.value)}
        aria-label="Buscar no sumário desta página"
      />
    </div>
  );

  const listItems = () => (
    <ul className="guide-toc__list">
      {filteredSections.map((item) => {
        const isActive = activeSectionId === item.id;
        return (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              className={`${
                isActive ? 'guide-toc__link guide-toc__link--active' : 'guide-toc__link guide-toc__link--inactive'
              } typo-body-sm`}
              onClick={handleNavClick}
              {...(isActive ? { 'aria-current': 'location' as const } : {})}
            >
              {item.label}
            </a>
          </li>
        );
      })}
    </ul>
  );

  if (narrow) {
    return (
      <>
        <div className="guide-toc-fab no-print">
          <button
            type="button"
            className="guide-toc-fab__btn"
            onClick={() => setDrawerOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={drawerOpen}
          >
            <BookOpen size={20} aria-hidden />
            <span className="typo-body-sm">Sumário</span>
          </button>
        </div>

        <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
          <SheetContent title="Sumário" description="Navegação por seções do guia" side="right">
            <div className="guide-toc guide-toc--drawer-inner">
              <p className="guide-toc__heading-label typo-eyebrow">Nesta página</p>
              {searchField('drawer')}
              <nav className="guide-toc__nav-block" aria-label="Sumário da guia">
                {filteredSections.length ? listItems() : (
                  <p className="guide-toc__empty typo-caption">Nenhuma seção encontrada.</p>
                )}
              </nav>
            </div>
          </SheetContent>
        </Sheet>
      </>
    );
  }

  return (
    <aside className="guide-toc-aside no-print" aria-label="Sumário lateral do guia">
      <nav className="guide-toc guide-toc--desktop" aria-label="Sumário da guia">
        <p className="guide-toc__heading-label typo-eyebrow">Nesta página</p>
        {searchField('desktop')}
        {filteredSections.length ? (
          listItems()
        ) : (
          <p className="guide-toc__empty typo-caption">Nenhuma seção encontrada.</p>
        )}
      </nav>
    </aside>
  );
}
