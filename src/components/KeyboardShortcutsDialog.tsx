import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { useMemo } from 'react';
import type { RoleCode } from '../features/auth/auth.types';
import {
  CATEGORY_LABELS_PT,
  type ShortcutCategory,
  type ShortcutSheetContext,
  filterShortcutsForSheet,
  formatShortcutLabel,
} from '../lib/shortcutRegistry';
import './KeyboardShortcutsDialog.css';

const CATEGORY_ORDER: ShortcutCategory[] = ['nav', 'actions', 'edit', 'approvals', 'view'];

export type KeyboardShortcutsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pathname: string;
  roleCodes: RoleCode[];
  sheetContext: ShortcutSheetContext;
};

export function KeyboardShortcutsDialog({
  open,
  onOpenChange,
  pathname,
  roleCodes,
  sheetContext,
}: KeyboardShortcutsDialogProps) {
  const rows = useMemo(
    () => filterShortcutsForSheet(pathname, roleCodes, sheetContext),
    [pathname, roleCodes, sheetContext],
  );

  const sections = useMemo(() => {
    const map = new Map<ShortcutCategory, typeof rows>();
    for (const cat of CATEGORY_ORDER) {
      map.set(cat, []);
    }
    for (const row of rows) {
      const list = map.get(row.category);
      if (list) list.push(row);
    }
    return CATEGORY_ORDER.filter((c) => (map.get(c)?.length ?? 0) > 0).map((c) => ({
      category: c,
      label: CATEGORY_LABELS_PT[c],
      items: map.get(c) ?? [],
    }));
  }, [rows]);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="kbd-sheet-overlay" />
        <Dialog.Content className="kbd-sheet-content" aria-describedby={undefined}>
          <div className="kbd-sheet-header">
            <Dialog.Title className="kbd-sheet-title">Atalhos de teclado</Dialog.Title>
            <Dialog.Close className="kbd-sheet-close" type="button" aria-label="Fechar">
              <X size={18} aria-hidden />
            </Dialog.Close>
          </div>
          <p className="kbd-sheet-intro">
            Resumo dos atalhos activos para esta rota e o seu perfil. Os modificadores mostram-se para o seu sistema.
          </p>

          <div className="kbd-sheet-columns">
            {sections.map((section) => (
              <section key={section.category} className="kbd-sheet-section">
                <h3 className="kbd-sheet-section-title">{section.label}</h3>
                <ul className="kbd-sheet-list">
                  {section.items.map((item) => (
                    <li key={item.id} className="kbd-sheet-row">
                      <div className="kbd-sheet-keys">
                        <kbd className="kbd-sheet-kbd">{formatShortcutLabel(item.keys)}</kbd>
                      </div>
                      <p className="kbd-sheet-desc">{item.description}</p>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>

          <div className="kbd-sheet-footer">
            <p className="kbd-sheet-note">
              <strong>Cmd+K</strong> na Auditoria abre apenas a paleta local de filtros;{' '}
              <strong>{formatShortcutLabel('Mod+/')}</strong> abre a paleta global de navegação (U15).
            </p>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
