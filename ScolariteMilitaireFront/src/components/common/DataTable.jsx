import { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, ChevronsUpDown, ChevronLeft, ChevronRight } from 'lucide-react';

export default function DataTable({
  columns,
  rows,
  rowKey = 'id',
  pageSize = 10,
  empty = 'Aucune donnée',
  onRowClick,
  mobileCardRender,
  selection,
}) {
  const [sort, setSort] = useState({ key: null, dir: 'asc' });
  const [page, setPage] = useState(0);

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
  const pageRows = sorted.slice(page * pageSize, (page + 1) * pageSize);

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

  return (
    <div className="w-full">
      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="table-base">
          <thead>
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
              return (
              <tr
                key={id}
                onClick={() => onRowClick?.(row)}
                className={onRowClick ? 'cursor-pointer' : ''}
              >
                {selection && (
                  <td
                    className="w-11 align-middle"
                    onClick={(e) => e.stopPropagation()}
                  >
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

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {pageRows.length === 0 && (
          <div className="py-8 text-center text-text-light">{empty}</div>
        )}
        {pageRows.map((row) => {
          const id = row[rowKey];
          const checked = sel.includes(id);
          return mobileCardRender ? (
            <div
              key={id}
              onClick={() => onRowClick?.(row)}
              className={`data-card ${onRowClick ? 'cursor-pointer active:bg-slate-100' : ''}`}
            >
              {mobileCardRender(row)}
            </div>
          ) : (
            <div
              key={id}
              className={`data-card relative ${onRowClick ? 'cursor-pointer active:bg-slate-100' : ''}`}
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
                {columns
                  .filter((c) => c.key !== 'actions')
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
            <span className="font-semibold text-navy">{page + 1}</span> / {pageCount}
          </span>
          <div className="flex items-center gap-1">
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              <ChevronLeft size={14} /> Précédent
            </button>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
              disabled={page >= pageCount - 1}
            >
              Suivant <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
