import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  flexRender,
  functionalUpdate,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type PaginationState,
  type Row,
  type SortingState,
  type Updater,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ArrowUpDown } from 'lucide-react';
import { TableRowSkeleton } from './TableRowSkeleton';
import './DataTable.css';

/** Opcional: `meta.tdClassName` / `meta.thClassName` nas `ColumnDef`. */
export type DataTableColumnMeta = {
  tdClassName?: string;
  thClassName?: string;
};

const PAGE_SIZE = 50;
const LARGE_DATA = 1000;
const VIRTUAL_THRESHOLD = 100;

export type DataTableUrlSortConfig = {
  /** `column.id` (ou accessorKey) → valor do parâmetro `sort` na URL */
  columnIdToSortParam: Record<string, string>;
};

export type DataTableProps<T> = {
  columns: ColumnDef<T, unknown>[];
  data: T[];
  getRowId: (row: T, index: number) => string;
  onRowClick?: (row: T) => void;
  stickyHeader?: boolean;
  /** `undefined` = automático: virtualiza quando a página atual tem mais de {@link VIRTUAL_THRESHOLD} linhas. */
  virtualize?: boolean;
  /** Ordem quando não há `sort`/`dir` na URL (com `urlSort`) ou sort inicial sem URL. */
  initialSort?: SortingState;
  urlSort?: DataTableUrlSortConfig;
  /** Destaque de linha (ex.: submissão ativa). */
  activeRowId?: string | null;
  isLoading?: boolean;
  loadingSkeletonRows?: number;
  /** Texto curto para `aria-label` em cada linha clicável. */
  getRowAriaLabel?: (row: T) => string;
  className?: string;
  tableClassName?: string;
  /**
   * Paginação explícita (TanStack client-side). Não altera tabelas existentes até `paginated={true}`.
   * Independente da paginação automática para dados muito grandes (`> LARGE_DATA`).
   */
  paginated?: boolean;
  /** Tamanho da página quando `paginated`. Default 10. */
  pageSize?: number;
};

function parseUrlSorting(searchParams: URLSearchParams, urlSort: DataTableUrlSortConfig): SortingState | undefined {
  const sortP = searchParams.get('sort');
  const dirP = searchParams.get('dir');
  if (!sortP || (dirP !== 'asc' && dirP !== 'desc')) {
    return undefined;
  }
  const colId = Object.entries(urlSort.columnIdToSortParam).find(([, v]) => v === sortP)?.[0];
  if (!colId) {
    return undefined;
  }
  return [{ id: colId, desc: dirP === 'desc' }];
}

function DataTableInner<T>({
  columns,
  data,
  getRowId,
  onRowClick,
  stickyHeader = true,
  virtualize,
  initialSort = [],
  urlSort,
  activeRowId = null,
  isLoading = false,
  loadingSkeletonRows = 5,
  getRowAriaLabel,
  className = '',
  tableClassName = '',
  paginated = false,
  pageSize: pageSizeProp = 10,
}: DataTableProps<T>) {
  const [searchParams, setSearchParams] = useSearchParams();
  const skipUrlReconcileRef = useRef(false);

  const [sorting, setSorting] = useState<SortingState>(() => {
    if (urlSort) {
      const fromUrl = parseUrlSorting(searchParams, urlSort);
      if (fromUrl) {
        return fromUrl;
      }
    }
    return initialSort;
  });

  const [largeDataPage, setLargeDataPage] = useState(0);
  const [pagination, setPagination] = useState<PaginationState>(() => ({
    pageIndex: 0,
    pageSize: pageSizeProp,
  }));
  const scrollRef = useRef<HTMLDivElement>(null);
  const [focusRowIndex, setFocusRowIndex] = useState(0);

  useEffect(() => {
    if (paginated) {
      setPagination((prev) => ({ ...prev, pageSize: pageSizeProp }));
    }
  }, [paginated, pageSizeProp]);

  useEffect(() => {
    if (!urlSort) {
      return;
    }
    if (skipUrlReconcileRef.current) {
      skipUrlReconcileRef.current = false;
      return;
    }
    const fromUrl = parseUrlSorting(searchParams, urlSort);
    if (fromUrl) {
      setSorting(fromUrl);
    } else {
      setSorting(initialSort);
    }
  }, [searchParams, urlSort, initialSort]);

  const applySortToUrl = useCallback(
    (next: SortingState, options?: { userCleared?: boolean }) => {
      if (!urlSort) {
        return;
      }
      if (options?.userCleared) {
        skipUrlReconcileRef.current = true;
      }
      setSearchParams(
        (prev) => {
          const p = new URLSearchParams(prev);
          if (next.length === 0) {
            p.delete('sort');
            p.delete('dir');
          } else {
            const param = urlSort.columnIdToSortParam[next[0].id];
            if (param) {
              p.set('sort', param);
              p.set('dir', next[0].desc ? 'desc' : 'asc');
            }
          }
          return p;
        },
        { replace: true },
      );
    },
    [setSearchParams, urlSort],
  );

  const onSortingChange = useCallback(
    (updater: Updater<SortingState>) => {
      setSorting((prev) => {
        const next = functionalUpdate(updater, prev);
        const userCleared = urlSort !== undefined && prev.length > 0 && next.length === 0;
        applySortToUrl(next, { userCleared });
        return next;
      });
    },
    [applySortToUrl, urlSort],
  );

  useEffect(() => {
    setLargeDataPage(0);
    if (paginated) {
      setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    }
  }, [data.length, sorting, paginated]);

  const { needsPagination, pageCount: largeDataPageCount, pageData } = useMemo(() => {
    if (paginated) {
      return { needsPagination: false, pageCount: 1, pageData: data };
    }
    const needs = data.length > LARGE_DATA;
    const count = needs ? Math.max(1, Math.ceil(data.length / PAGE_SIZE)) : 1;
    const slice = needs ? data.slice(largeDataPage * PAGE_SIZE, largeDataPage * PAGE_SIZE + PAGE_SIZE) : data;
    return { needsPagination: needs, pageCount: count, pageData: slice };
  }, [data, largeDataPage, paginated]);

  const tableData = isLoading ? [] : pageData;

  const useVirtual =
    !paginated &&
    !isLoading &&
    virtualize !== false &&
    (virtualize === true || pageData.length > VIRTUAL_THRESHOLD);

  const table = useReactTable({
    data: tableData,
    columns,
    state: paginated ? { sorting, pagination } : { sorting },
    onSortingChange,
    onPaginationChange: paginated ? setPagination : undefined,
    getRowId,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: paginated ? getPaginationRowModel() : undefined,
  });

  const rows = table.getRowModel().rows;

  const rowVirtualizer = useVirtualizer({
    count: useVirtual ? rows.length : 0,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 52,
    overscan: 12,
    measureElement:
      typeof window !== 'undefined' && !navigator.userAgent.includes('Firefox')
        ? (el) => el?.getBoundingClientRect().height ?? 52
        : undefined,
  });

  const virtualItems = useVirtual ? rowVirtualizer.getVirtualItems() : [];
  const totalVirtualSize = useVirtual ? rowVirtualizer.getTotalSize() : 0;
  const padTop = virtualItems.length > 0 ? virtualItems[0].start : 0;
  const padBottom =
    virtualItems.length > 0 ? totalVirtualSize - virtualItems[virtualItems.length - 1].end : 0;

  useEffect(() => {
    if (!useVirtual || rows.length === 0) {
      return;
    }
    const idx = Math.max(0, Math.min(focusRowIndex, rows.length - 1));
    rowVirtualizer.scrollToIndex(idx, { align: 'auto' });
  }, [focusRowIndex, largeDataPage, rowVirtualizer, rows.length, useVirtual]);

  useEffect(() => {
    if (rows.length === 0) {
      return;
    }
    setFocusRowIndex((i) => Math.max(0, Math.min(i, rows.length - 1)));
  }, [rows.length, largeDataPage]);

  const cycleHeaderSort = (columnId: string) => {
    if (isLoading) {
      return;
    }
    const col = table.getColumn(columnId);
    if (!col || !col.getCanSort()) {
      return;
    }
    const sorted = col.getIsSorted();
    if (sorted === false) {
      col.toggleSorting(false);
    } else if (sorted === 'asc') {
      col.toggleSorting(true);
    } else {
      col.clearSorting();
    }
  };

  const moveFocusVertical = (delta: number) => {
    if (rows.length === 0) {
      return;
    }
    setFocusRowIndex((i) => {
      return Math.max(0, Math.min(rows.length - 1, i + delta));
    });
  };

  const onRowKeyDown = (event: KeyboardEvent, row: Row<T>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      moveFocusVertical(1);
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      moveFocusVertical(-1);
      return;
    }
    if (event.key === 'Enter' && onRowClick) {
      event.preventDefault();
      onRowClick(row.original);
    }
  };

  const shellClass = useVirtual ? 'data-table-virtual-scroll table-shell' : 'table-shell';
  const theadClass = stickyHeader ? 'data-table-head--sticky' : '';

  const headerRow = (enableSortControls: boolean) =>
    table.getHeaderGroups().map((headerGroup) => (
      <tr key={headerGroup.id}>
        {headerGroup.headers.map((header) => {
          const col = header.column;
          const meta = col.columnDef.meta as DataTableColumnMeta | undefined;
          const thClass = meta?.thClassName;
          const canSort = enableSortControls && !isLoading && col.getCanSort();
          const sorted = col.getIsSorted();
          if (!header.isPlaceholder && canSort) {
            const label = flexRender(col.columnDef.header, header.getContext());
            return (
              <th
                key={header.id}
                colSpan={header.colSpan}
                className={thClass}
                scope="col"
                aria-sort={sorted === 'asc' ? 'ascending' : sorted === 'desc' ? 'descending' : 'none'}
              >
                <button
                  type="button"
                  className={`sort-header-btn data-table-header-sortable ${sorted ? 'sort-header-btn--active' : ''}`}
                  onClick={() => cycleHeaderSort(col.id)}
                >
                  <span>{label}</span>
                  <ArrowUpDown
                    aria-hidden
                    style={{
                      transform: sorted === 'desc' ? 'rotate(180deg)' : undefined,
                      opacity: sorted ? 1 : 0.45,
                    }}
                  />
                </button>
              </th>
            );
          }
          return (
            <th key={header.id} colSpan={header.colSpan} className={thClass} scope="col">
              {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
            </th>
          );
        })}
      </tr>
    ));

  return (
    <div className={className}>
      <div ref={scrollRef} className={shellClass}>
        <table className={`data-table ${tableClassName}`} {...(isLoading ? {} : { role: 'grid', 'aria-rowcount': rows.length })}>
          <thead className={theadClass}>{headerRow(true)}</thead>
          <tbody>
            {isLoading ? (
              <TableRowSkeleton columnCount={columns.length} rows={loadingSkeletonRows} />
            ) : rows.length === 0 ? null : useVirtual ? (
              <>
                {padTop > 0 ? (
                  <tr aria-hidden="true">
                    <td colSpan={columns.length} style={{ height: padTop, padding: 0, border: 0 }} />
                  </tr>
                ) : null}
                {virtualItems.map((vr) => {
                  const row = rows[vr.index];
                  if (!row) {
                    return null;
                  }
                  const rowId = row.id;
                  const clickable = Boolean(onRowClick);
                  const isFocused = vr.index === focusRowIndex;
                  return (
                    <tr
                      key={rowId}
                      data-index={vr.index}
                      ref={rowVirtualizer.measureElement}
                      data-row-index={vr.index}
                      className={[
                        rowId === activeRowId ? 'data-row--active' : '',
                        'data-table-row',
                        clickable ? 'data-table-row--clickable' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      tabIndex={clickable ? (isFocused ? 0 : -1) : undefined}
                      aria-selected={rowId === activeRowId ? true : undefined}
                      aria-label={clickable && getRowAriaLabel ? getRowAriaLabel(row.original) : undefined}
                      onClick={
                        clickable
                          ? () => {
                              setFocusRowIndex(vr.index);
                              onRowClick?.(row.original);
                            }
                          : undefined
                      }
                      onFocus={clickable ? () => setFocusRowIndex(vr.index) : undefined}
                      onKeyDown={clickable ? (e) => onRowKeyDown(e, row) : undefined}
                    >
                      {row.getVisibleCells().map((cell) => {
                        const meta = cell.column.columnDef.meta as DataTableColumnMeta | undefined;
                        return (
                          <td key={cell.id} className={meta?.tdClassName}>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
                {padBottom > 0 ? (
                  <tr aria-hidden="true">
                    <td colSpan={columns.length} style={{ height: padBottom, padding: 0, border: 0 }} />
                  </tr>
                ) : null}
              </>
            ) : (
              rows.map((row, rowIndex) => {
                const clickable = Boolean(onRowClick);
                const isFocused = rowIndex === focusRowIndex;
                return (
                  <tr
                    key={row.id}
                    data-row-index={rowIndex}
                    className={[
                      row.id === activeRowId ? 'data-row--active' : '',
                      'data-table-row',
                      clickable ? 'data-table-row--clickable' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    tabIndex={clickable ? (isFocused ? 0 : -1) : undefined}
                    aria-selected={row.id === activeRowId ? true : undefined}
                    aria-label={clickable && getRowAriaLabel ? getRowAriaLabel(row.original) : undefined}
                    onClick={
                      clickable
                        ? () => {
                            setFocusRowIndex(rowIndex);
                            onRowClick?.(row.original);
                          }
                        : undefined
                    }
                    onFocus={clickable ? () => setFocusRowIndex(rowIndex) : undefined}
                    onKeyDown={clickable ? (e) => onRowKeyDown(e, row) : undefined}
                  >
                    {row.getVisibleCells().map((cell) => {
                      const meta = cell.column.columnDef.meta as DataTableColumnMeta | undefined;
                      return (
                        <td key={cell.id} className={meta?.tdClassName}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {!isLoading && paginated && data.length > 0 ? (
        <div className="data-table-pagination" role="navigation" aria-label="Paginação da tabela">
          <span>
            Página {table.getState().pagination.pageIndex + 1} de {table.getPageCount()} ({data.length}{' '}
            registros)
          </span>
          <button
            type="button"
            className="data-table-pagination__btn"
            disabled={!table.getCanPreviousPage()}
            onClick={() => table.previousPage()}
          >
            Anterior
          </button>
          <button
            type="button"
            className="data-table-pagination__btn"
            disabled={!table.getCanNextPage()}
            onClick={() => table.nextPage()}
          >
            Próxima
          </button>
        </div>
      ) : null}

      {!isLoading && needsPagination ? (
        <div className="data-table-pagination" role="navigation" aria-label="Paginação da tabela">
          <span>
            Página {largeDataPage + 1} de {largeDataPageCount} ({data.length} registros)
          </span>
          <button
            type="button"
            className="data-table-pagination__btn"
            disabled={largeDataPage <= 0}
            onClick={() => setLargeDataPage((p) => Math.max(0, p - 1))}
          >
            Anterior
          </button>
          <button
            type="button"
            className="data-table-pagination__btn"
            disabled={largeDataPage >= largeDataPageCount - 1}
            onClick={() => setLargeDataPage((p) => Math.min(largeDataPageCount - 1, p + 1))}
          >
            Próxima
          </button>
        </div>
      ) : null}

      {useVirtual ? (
        <p className="sr-only" id="data-table-kbd-hint">
          Navegação por teclado ao nível da linha: use as setas para cima e para baixo para mover o foco entre linhas;
          Enter aciona a linha focada. Com virtualização, só parte das linhas está no DOM; o foco segue o índice na página
          atual (navegação célula a célula não suportada).
        </p>
      ) : null}
    </div>
  );
}

/**
 * Tabela TanStack com ordenação tri-estado (asc → desc → sem sort), opcional virtualização e sincronização de sort na URL.
 *
 * Paginação interna de 50 linhas quando `data.length > 1000` (salvo `paginated`, que usa TanStack em todo o conjunto).
 * Com `paginated` e `pageSize`, usar para tabelas compactas sem alterar as restantes.
 */
export function DataTable<T>(props: DataTableProps<T>) {
  return <DataTableInner {...props} />;
}
