import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, ChevronsUpDown, ChevronLeft, ChevronRight } from 'lucide-react';

export default function DataTable({
  columns,
  rows,
  rowKey = 'id',
  pageSize = 10,
  empty = 'Aucune donnée',
  onRowClick,
  mobileCardRender,
  mobileColumnOrder,
  selection,
  selectedId,
  dualHorizontalScroll = true,
  stickyHeader = true,
}) {
  const [sort, setSort] = useState({ key: null, dir: 'asc' });
  const [page, setPage] = useState(0);
  const mainScrollRef = useRef(null);
  const topScrollRef = useRef(null);
  const tableRef = useRef(null);
  const [scrollWidth, setScrollWidth] = useState(0);
  const syncingRef = useRef(false);

  useEffect(() => {
    setPage(0);
  }, [rows, pageSize]);

  const sorted = useMemo(() => {
    if (!sort.key) return rows;
    const copy = [...rows];
    const col = columns.find((c) => c.key === sort.key);
    copy.sort((a, b) => {
      const av = col?.accessor ? col.accessor(a) : a[sort.key];
      const bv = col?.accessor ? col.accessor(b) : b[sort.key];
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === 'number' && typeof bv === 'number') {
        return sort.dir === 'asc' ? av - bv : bv - av;
      }
      return sort.dir === 'asc'
        ? String(av).localeCompare(String(bv), 'fr')
        : String(bv).localeCompare(String(av), 'fr');
    });
    return copy;
  }, [rows, sort, columns]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = sorted.slice(safePage * pageSize, (safePage + 1) * pageSize);

  const mobileColumns = useMemo(() => {
    if (!mobileColumnOrder?.length) return columns;
    const byKey = Object.fromEntries(columns.map((c) => [c.key, c]));
    const ordered = mobileColumnOrder.map((key) => byKey[key]).filter(Boolean);
    const rest = columns.filter((c) => !mobileColumnOrder.includes(c.key));
    return [...ordered, ...rest];
  }, [columns, mobileColumnOrder]);

  const pageIds = pageRows.map((r) => r[rowKey]).filter((id) => id != null);
  const sel = selection?.selectedIds ?? [];
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => sel.includes(id));

  const colCount = columns.length + (selection ? 1 : 0);

  const toggleSort = (key, sortable) => {
    if (!sortable) return;
    setSort((s) =>
      s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' },
    );
  };

  const measureTable = useCallback(() => {
    if (tableRef.current) {
      setScrollWidth(tableRef.current.scrollWidth);
    }
  }, []);

  useLayoutEffect(() => {
    measureTable();
  }, [columns, pageRows, measureTable]);

  useEffect(() => {
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measureTable) : null;
    if (ro && tableRef.current) ro.observe(tableRef.current);
    window.addEventListener('resize', measureTable);
    return () => {
      ro?.disconnect();
      window.removeEventListener('resize', measureTable);
    };
  }, [measureTable]);

  const syncFromMain = (e) => {
    if (syncingRef.current) return;
    syncingRef.current = true;
    if (topScrollRef.current) topScrollRef.current.scrollLeft = e.target.scrollLeft;
    syncingRef.current = false;
  };

  const syncFromTop = (e) => {
    if (syncingRef.current) return;
    syncingRef.current = true;
    if (mainScrollRef.current) mainScrollRef.current.scrollLeft = e.target.scrollLeft;
    syncingRef.current = false;
  };

  const theadClass = stickyHeader ? 'sticky top-0 z-[2] bg-off-white shadow-[0_1px_0_0_#e2e8f0]' : '';

  return (
    <div className="w-full">
      {/* Desktop table */}
      <div className="hidden md:block">
        {dualHorizontalScroll && scrollWidth > 0 ? (
          <div
            ref={topScrollRef}
            className="mb-1 overflow-x-auto overflow-y-hidden"
            style={{ height: 12 }}
            onScroll={syncFromTop}
            aria-hidden
          >
            <div style={{ width: scrollWidth, height: 1 }} />
          </div>
        ) : null}
        <div
          ref={mainScrollRef}
          className="overflow-x-auto"
          onScroll={dualHorizontalScroll ? syncFromMain : undefined}
        >
          <table ref={tableRef} className="table-base">
            <thead className={theadClass}>
              <tr>
                {selection && (
                  <th className="w-11 align-middle">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-light-gray text-navy focus:ring-gold"
                      checked={allPageSelected}
                      onChange={() => selection.onTogglePage(pageIds, !allPageSelected)}
                      title="Sélectionner la page"
                      aria-label="Sélectionner tous les étudiants de cette page"
                    />
                  </th>
                )}
                {columns.map((c) => (
                  <th
                    key={c.key}
                    className={`${c.sortable ? 'cursor-pointer select-none hover:text-navy' : ''} ${c.align === 'right' ? 'text-right' : ''}`}
                    onClick={() => toggleSort(c.key, c.sortable)}
                    style={c.width ? { width: c.width } : undefined}
                  >
                    <span className="inline-flex items-center gap-1">
                      {c.label}
                      {c.sortable &&
                        (sort.key === c.key ? (
                          sort.dir === 'asc' ? (
                            <ChevronUp size={12} />
                          ) : (
                            <ChevronDown size={12} />
                          )
                        ) : (
                          <ChevronsUpDown size={12} className="text-slate-400" />
                        ))}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageRows.length === 0 && (
                <tr>
                  <td colSpan={colCount} className="py-10 text-center text-text-light">
                    {empty}
                  </td>
                </tr>
              )}
              {pageRows.map((row) => {
                const id = row[rowKey];
                const checked = sel.includes(id);
                const isSelected = selectedId != null && id === selectedId;
                return (
                  <tr
                    key={id}
                    onClick={() => onRowClick?.(row)}
                    aria-selected={isSelected || undefined}
                    className={`${onRowClick ? 'cursor-pointer hover:bg-slate-50/80' : ''} ${isSelected ? 'bg-emerald-50 ring-1 ring-inset ring-emerald-300' : ''}`}
                  >
                    {selection && (
                      <td className="w-11 align-middle" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-light-gray text-navy focus:ring-gold"
                          checked={checked}
                          onChange={() => selection.onToggleRow(id)}
                          aria-label="Sélectionner la ligne"
                        />
                      </td>
                    )}
                    {columns.map((c) => (
                      <td key={c.key} className={c.align === 'right' ? 'text-right' : ''}>
                        {c.render ? c.render(row) : c.accessor ? c.accessor(row) : row[c.key]}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {pageRows.length === 0 && (
          <div className="py-8 text-center text-text-light">{empty}</div>
        )}
        {pageRows.map((row) => {
          const id = row[rowKey];
          const checked = sel.includes(id);
          const isSelected = selectedId != null && id === selectedId;
          return mobileCardRender ? (
            <div
              key={id}
              onClick={() => onRowClick?.(row)}
              className={`data-card ${onRowClick ? 'cursor-pointer active:bg-slate-100' : ''} ${isSelected ? 'ring-2 ring-emerald-300 bg-emerald-50' : ''}`}
            >
              {mobileCardRender(row)}
            </div>
          ) : (
            <div
              key={id}
              className={`data-card relative ${onRowClick ? 'cursor-pointer active:bg-slate-100' : ''} ${isSelected ? 'ring-2 ring-emerald-300 bg-emerald-50' : ''}`}
              onClick={() => onRowClick?.(row)}
            >
              {selection && (
                <div className="absolute right-3 top-3 z-10" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-light-gray text-navy"
                    checked={checked}
                    onChange={() => selection.onToggleRow(id)}
                    aria-label="Sélectionner"
                  />
                </div>
              )}
              <dl className="space-y-2">
                {mobileColumns
                  .filter((c) => c.key !== 'actions' && c.key !== '_actions')
                  .map((c) => (
                    <div key={c.key} className="flex justify-between items-start gap-3">
                      <dt className="text-xs uppercase tracking-wide text-text-light">
                        {c.label}
                      </dt>
                      <dd className="min-w-0 flex-1 text-right text-sm text-text">
                        {c.render ? c.render(row) : c.accessor ? c.accessor(row) : row[c.key]}
                      </dd>
                    </div>
                  ))}
              </dl>
            </div>
          );
        })}
      </div>

      {pageCount > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-1 pt-4 text-xs text-text-light md:text-sm">
          <span>
            {sorted.length} résultat{sorted.length > 1 ? 's' : ''} · Page{' '}
            <span className="font-semibold text-navy">{safePage + 1}</span> / {pageCount}
          </span>
          <div className="flex items-center gap-1">
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={safePage === 0}
            >
              <ChevronLeft size={14} /> Précédent
            </button>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
              disabled={safePage >= pageCount - 1}
            >
              Suivant <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
