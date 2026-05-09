type TableRowSkeletonProps = {
  /** Número de células na linha (alinha com colunas da tabela). */
  columnCount?: number;
  /** Quantidade de linhas placeholder. */
  rows?: number;
};

/**
 * Esqueleto de linhas de tabela (U08 / loading de grid).
 * Usa tokens de skeleton já definidos em `layout.css`.
 */
export function TableRowSkeleton({ columnCount = 5, rows = 5 }: TableRowSkeletonProps) {
  return (
    <>
      {Array.from({ length: rows }, (_, r) => (
        <tr key={r} aria-hidden>
          {Array.from({ length: columnCount }, (_, c) => (
            <td key={c}>
              <div className="skeleton skeleton--text" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
