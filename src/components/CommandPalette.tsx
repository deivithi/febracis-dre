import * as Dialog from '@radix-ui/react-dialog';
import { Command } from 'cmdk';
import type { ReactNode } from 'react';
import './GlobalCommandPalette.css';

export type CommandPaletteProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Rótulo acessível do diálogo (cmdk). */
  label: string;
  /** Conteúdo: `Command.Group`, `Command.Item`, `Command.Empty`, etc. */
  children: ReactNode;
  /** Placeholder do campo de busca integrado (Linear-style). */
  searchPlaceholder?: string;
  /** Quando false, omite `Command.Input` (útil se a busca fica só na página). */
  showSearch?: boolean;
};

/**
 * Paleta reutilizável (cmdk `Command.Dialog` + tokens de `GlobalCommandPalette.css`).
 * **Esc** fecha via Radix/cmdk chamando `onOpenChange(false)` — não altera filtros da página pai.
 */
export function CommandPalette({
  open,
  onOpenChange,
  label,
  children,
  searchPlaceholder = 'Buscar…',
  showSearch = true,
}: CommandPaletteProps) {
  return (
    <Command.Dialog
      open={open}
      onOpenChange={onOpenChange}
      label={label}
      overlayClassName="cmd-palette-overlay"
      contentClassName="cmd-palette-dialog"
    >
      <Dialog.Title id="febracis-command-palette-label-title" className="sr-only">
        {label}
      </Dialog.Title>
      {showSearch ? (
        <div className="cmd-palette__header">
          <Command.Input placeholder={searchPlaceholder} className="cmd-palette-input" />
        </div>
      ) : null}
      <Command.List className="cmd-palette-list">{children}</Command.List>
    </Command.Dialog>
  );
}
