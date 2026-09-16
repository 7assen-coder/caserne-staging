import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, ChevronsUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { localeCompare } from '../../utils/formatLocale';
import RtlIcon from './RtlIcon';

/**
 * @param {'client'|'server'} mode
 */
export default function DataTable({
  columns,
  rows,
  rowKey = 'id',
  pageSize = 10,
  empty,
  onRowClick,
  mobileCardRender,
  mobileColumnOrder,
  selection,
  selectedId,
  dualHorizontalScroll = true,
  hideScrollbar = false,
  stickyHeader = true,
  mode = 'client',
  totalCount,
  page: controlledPage,
  onPageChange,
  ariaLabel,
}) {
  const { t } = useTranslation('common');
  const emptyLabel = empty ?? t('noData');
  const isServer = mode === 'server';
  const [sort, setSort] = useState({ key: null, dir: 'asc' });
  const [internalPage, setInternalPage] = useState(0);
  const mainScrollRef = useRef(null);
  const topScrollRef = useRef(null);
  const tableRef = useRef(null);
  const [scrollWidth, setScrollWidth] = useState(0);
  const syncingRef = useRef(false);

  const page = isServer && controlledPage != null ? controlledPage : internalPage;
  const setPage = (updater) => {
    const next = typeof updater === 'function' ? updater(page) : updater;
    if (isServer && onPageChange) onPageChange(next);
    else setInternalPage(next);
  };

  useEffect(() => {
    // Reset client pagination when the row set or page size changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional sync of derived page index
    if (!isServer) setInternalPage(0);
  }, [rows, pageSize, isServer]);

  const sorted = useMemo(() => {
    if (isServer) return rows;
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
      const cmp = localeCompare(av, bv);
      return sort.dir === 'asc' ? cmp : -cmp;
    });
    return copy;
  }, [rows, sort, columns, isServer]);

  const total = isServer ? Number(totalCount) || 0 : sorted.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize) || 1);
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = isServer ? rows : sorted.slice(safePage * pageSize, (safePage + 1) * pageSize);

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
    if (!sortable || isServer) return;
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
  const showPager = isServer ? total > pageSize : pageCount > 1;
  const rowName = (row) =>
    `${row.prenom ?? row.first_name ?? ''} ${row.nom ?? row.nom_famille ?? ''}`.trim() ||
    String(row[rowKey] ?? '');

  return (
    <div className="w-full">
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
          className={`overflow-x-auto overflow-y-visible${
            hideScrollbar
              ? ' [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
              : ''
          }`}
          onScroll={dualHorizontalScroll ? syncFromMain : undefined}
        >
          <table ref={tableRef} className="table-base" aria-label={ariaLabel}>
            <thead className={theadClass}>
              <tr>
                {selection && (
                  <th className="w-11 align-middle">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-light-gray text-navy focus:ring-gold"
                      checked={allPageSelected}
                      onChange={() => selection.onTogglePage(pageIds, !allPageSelected)}
                      aria-label={t('selectPage')}
                    />
                  </th>
                )}
                {columns.map((c) => {
                  const sortable = c.sortable && !isServer;
                  const ariaSort =
                    sortable && sort.key === c.key
                      ? sort.dir === 'asc'
                        ? 'ascending'
                        : 'descending'
                      : sortable
                        ? 'none'
                        : undefined;
                  return (
                    <th
                      key={c.key}
                      className={c.align === 'right' ? 'text-end' : 'text-start'}
                      style={c.width ? { width: c.width } : undefined}
                      aria-sort={ariaSort}
                    >
                      {sortable ? (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 hover:text-navy"
                          onClick={() => toggleSort(c.key, true)}
                        >
                          {c.label}
                          {sort.key === c.key ? (
                            sort.dir === 'asc' ? (
                              <ChevronUp size={12} aria-hidden />
                            ) : (
                              <ChevronDown size={12} aria-hidden />
                            )
                          ) : (
                            <ChevronsUpDown size={12} className="text-slate-400" aria-hidden />
                          )}
                        </button>
                      ) : (
                        <span className="inline-flex items-center gap-1">{c.label}</span>
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {pageRows.length === 0 && (
                <tr>
                  <td colSpan={colCount} className="py-10 text-center text-slate-600">
                    {emptyLabel}
                  </td>
                </tr>
              )}
              {pageRows.map((row) => {
                const id = row[rowKey];
                const checked = sel.includes(id);
                const isSelected = selectedId != null && id === selectedId;
                const name = rowName(row);
                return (
                  <tr
                    key={id}
                    tabIndex={onRowClick ? 0 : undefined}
                    onClick={() => onRowClick?.(row)}
                    onKeyDown={(e) => {
                      if (!onRowClick) return;
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onRowClick(row);
                      }
                    }}
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
                          aria-label={t('selectRow', { name })}
                        />
                      </td>
                    )}
                    {columns.map((c) => (
                      <td key={c.key} className={c.align === 'right' ? 'text-end' : 'text-start'}>
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

      <div className="space-y-3 md:hidden">
        {pageRows.length === 0 && (
          <div className="py-8 text-center text-slate-600">{emptyLabel}</div>
        )}
        {pageRows.map((row) => {
          const id = row[rowKey];
          const checked = sel.includes(id);
          const isSelected = selectedId != null && id === selectedId;
          const name = rowName(row);
          return mobileCardRender ? (
            <div
              key={id}
              role={onRowClick ? 'button' : undefined}
              tabIndex={onRowClick ? 0 : undefined}
              onClick={() => onRowClick?.(row)}
              onKeyDown={(e) => {
                if (!onRowClick) return;
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onRowClick(row);
                }
              }}
              className={`data-card ${onRowClick ? 'cursor-pointer active:bg-slate-100' : ''} ${isSelected ? 'bg-emerald-50 ring-2 ring-emerald-300' : ''}`}
            >
              {mobileCardRender(row)}
            </div>
          ) : (
            <div
              key={id}
              role={onRowClick ? 'button' : undefined}
              tabIndex={onRowClick ? 0 : undefined}
              className={`data-card relative ${onRowClick ? 'cursor-pointer active:bg-slate-100' : ''} ${isSelected ? 'bg-emerald-50 ring-2 ring-emerald-300' : ''}`}
              onClick={() => onRowClick?.(row)}
              onKeyDown={(e) => {
                if (!onRowClick) return;
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onRowClick(row);
                }
              }}
            >
              {selection && (
                <div className="absolute end-3 top-3 z-10" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-light-gray text-navy"
                    checked={checked}
                    onChange={() => selection.onToggleRow(id)}
                    aria-label={t('selectRow', { name })}
                  />
                </div>
              )}
              <dl className="space-y-2">
                {mobileColumns
                  .filter((c) => c.key !== 'actions' && c.key !== '_actions')
                  .map((c) => (
                    <div key={c.key} className="flex items-start justify-between gap-3">
                      <dt className="text-xs uppercase tracking-wide text-slate-600">{c.label}</dt>
                      <dd className="min-w-0 flex-1 text-end text-sm text-slate-900">
                        {c.render ? c.render(row) : c.accessor ? c.accessor(row) : row[c.key]}
                      </dd>
                    </div>
                  ))}
              </dl>
            </div>
          );
        })}
      </div>

      {showPager && (
        <div
          className="flex flex-wrap items-center justify-between gap-3 px-1 pt-4 text-xs text-slate-600 md:text-sm"
          aria-live="polite"
        >
          <span>
            {t(total === 1 ? 'results' : 'results_plural', { count: total })} ·{' '}
            {t('pageOf', { current: safePage + 1, total: pageCount })}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={safePage === 0}
            >
              <RtlIcon icon={ChevronLeft} size={14} /> {t('previous')}
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
              disabled={safePage >= pageCount - 1}
            >
              {t('next')} <RtlIcon icon={ChevronRight} size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
