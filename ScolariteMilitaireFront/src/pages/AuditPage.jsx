import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Shield, UserPlus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import DataTable from '../components/common/DataTable';
import StickyFilterBar from '../components/common/StickyFilterBar';
import OpsModuleHeader from '../components/ops/OpsModuleHeader';
import { useAuth } from '../hooks/useAuth';
import { listAuditEvents } from '../services/auditService';
import { userService } from '../services/userService';
import { formatApiError } from '../utils/apiErrors';
import {
  ROLE_LABEL,
  ROLES,
  getCanonicalRole,
  getCreatableRoleOptions,
  getPermissions,
} from '../utils/userRole';

const ACTION_KEYS = [
  'VIEW',
  'CREATE',
  'UPDATE',
  'DELETE',
  'DOWNLOAD',
  'IMPORT',
  'LOGIN_SUCCESS',
  'LOGIN_FAIL',
  'LOGOUT',
  'PASSWORD_CHANGE',
  'PASSWORD_RESET',
];

const PAGE_SIZE = 20;

function formatDate(iso, locale) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString(locale === 'ar' ? 'ar-MR' : 'fr-FR');
  } catch {
    return iso;
  }
}

export default function AuditPage() {
  const { t, i18n } = useTranslation(['audit']);
  const { fonction } = useAuth();
  const currentRole = getCanonicalRole(fonction);
  const canCreateUsers = getPermissions(currentRole).canCreateUserRoles.length > 0;
  const roleOptions = useMemo(
    () => getCreatableRoleOptions(currentRole).filter((o) => o.value !== ROLES.ETUDIANT),
    [currentRole],
  );

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [action, setAction] = useState('');
  const [page, setPage] = useState(0);
  const [count, setCount] = useState(0);

  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState('');
  const [userBusyId, setUserBusyId] = useState(null);

  const actionLabel = useCallback(
    (key) => (key ? t(`audit:actions.${key}`, { defaultValue: key }) : ''),
    [t],
  );

  const loadEvents = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { page: page + 1, page_size: PAGE_SIZE };
      if (action) params.action = action;
      const data = await listAuditEvents(params);
      const results = Array.isArray(data) ? data : data.results || [];
      setRows(results);
      setCount(Array.isArray(data) ? results.length : data.count ?? results.length);
    } catch (err) {
      setError(formatApiError(err));
      setRows([]);
      setCount(0);
    } finally {
      setLoading(false);
    }
  }, [action, page]);

  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    setUsersError('');
    try {
      const { users: list } = await userService.listUsers();
      const military = (list || []).filter((u) => {
        const role = getCanonicalRole(u.fonction);
        return role && role !== ROLES.ETUDIANT;
      });
      setUsers(military);
    } catch (err) {
      setUsersError(formatApiError(err));
      setUsers([]);
    } finally {
      setUsersLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const toggleAccess = async (user) => {
    setUserBusyId(user.id);
    try {
      await userService.updateUser(user.id, {
        is_active_access: !user.is_active_access,
      });
      await loadUsers();
    } catch (err) {
      setUsersError(formatApiError(err));
    } finally {
      setUserBusyId(null);
    }
  };

  const changeRole = async (user, fonctionValue) => {
    if (!fonctionValue || fonctionValue === user.fonction) return;
    setUserBusyId(user.id);
    try {
      await userService.updateUser(user.id, { fonction: fonctionValue });
      await loadUsers();
    } catch (err) {
      setUsersError(formatApiError(err));
    } finally {
      setUserBusyId(null);
    }
  };

  const actionOptions = useMemo(
    () => ACTION_KEYS.map((k) => ({ key: k, label: actionLabel(k) })),
    [actionLabel],
  );

  const columns = useMemo(
    () => [
      {
        key: 'created_at',
        label: t('audit:colDate'),
        render: (r) => (
          <span className="whitespace-nowrap text-slate-700">
            {formatDate(r.created_at, i18n.language)}
          </span>
        ),
      },
      {
        key: 'actor',
        label: t('audit:colActor'),
        render: (r) => (
          <div className="min-w-0">
            <p className="break-all font-medium text-slate-900">{r.actor_email || '—'}</p>
            {r.actor_role ? (
              <p className="break-words text-xs text-slate-500">
                {ROLE_LABEL[getCanonicalRole(r.actor_role)] || r.actor_role}
              </p>
            ) : null}
          </div>
        ),
      },
      {
        key: 'action',
        label: t('audit:colAction'),
        render: (r) => (
          <span className="inline-flex rounded-md bg-navy/5 px-2 py-0.5 text-xs font-semibold text-navy ring-1 ring-navy/10">
            {r.action_label || actionLabel(r.action) || r.action || '—'}
          </span>
        ),
      },
      {
        key: 'eleve_matricule',
        label: t('audit:colMatricule'),
        render: (r) => (
          <span className="font-mono text-sm text-slate-800">{r.eleve_matricule || '—'}</span>
        ),
      },
      {
        key: 'summary',
        label: t('audit:colSummary'),
        render: (r) => (
          <span className="max-w-md break-words text-sm text-slate-700" title={r.summary || ''}>
            {r.summary || '—'}
          </span>
        ),
      },
    ],
    [t, i18n.language, actionLabel],
  );

  return (
    <div className="grid min-w-0 max-w-full grid-cols-1 gap-6 overflow-x-hidden md:gap-8 xl:grid-cols-12 xl:gap-x-8">
      <div className="min-w-0 xl:col-span-12">
        <OpsModuleHeader
          icon={Shield}
          title={t('audit:title')}
          subtitle={t('audit:subtitle')}
        />
      </div>

      <StickyFilterBar>
        <div className="flex min-w-0 flex-wrap items-end gap-3 p-3">
          <label className="flex min-w-0 flex-1 flex-col gap-0.5 sm:max-w-xs">
            <span className="label !mb-0.5 text-[11px]">{t('audit:action')}</span>
            <select
              className="input h-10 w-full min-w-0 border-slate-200 bg-white px-3 text-sm shadow-sm"
              value={action}
              onChange={(e) => {
                setPage(0);
                setAction(e.target.value);
              }}
            >
              <option value="">{t('audit:allActions')}</option>
              {actionOptions.map(({ key, label }) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          {canCreateUsers ? (
            <Link
              to="/utilisateurs/nouveau"
              className="btn btn-primary inline-flex h-10 items-center justify-center gap-2 px-4 text-sm"
            >
              <UserPlus size={16} aria-hidden />
              {t('audit:newUser')}
            </Link>
          ) : null}
        </div>
      </StickyFilterBar>

      {error ? (
        <p className="break-words rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 xl:col-span-12">
          {error}
        </p>
      ) : null}

      <section className="min-w-0 overflow-hidden rounded-2xl border border-light-gray bg-white shadow-sm xl:col-span-12">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-light-gray px-5 py-3.5 sm:px-6">
          <h2 className="text-sm font-semibold text-navy">{t('audit:listTitle')}</h2>
          <span className="text-xs text-slate-500">
            {loading ? t('audit:loading') : t('audit:eventCount', { count })}
          </span>
        </div>
        <div className="min-w-0 p-3 sm:p-4">
          {loading ? (
            <p className="py-12 text-center text-sm text-slate-500">{t('audit:loading')}</p>
          ) : (
            <DataTable
              columns={columns}
              rows={rows}
              rowKey="id"
              mode="server"
              page={page}
              onPageChange={setPage}
              pageSize={PAGE_SIZE}
              totalCount={count}
              empty={t('audit:empty')}
              dualHorizontalScroll={false}
              stickyHeader
              ariaLabel={t('audit:listTitle')}
            />
          )}
        </div>
      </section>

      <section className="min-w-0 overflow-hidden rounded-2xl border border-light-gray bg-white shadow-sm xl:col-span-12">
        <header className="border-b border-light-gray px-5 py-3.5 sm:px-6">
          <h2 className="text-sm font-semibold text-navy">{t('audit:usersTitle')}</h2>
        </header>
        {usersError ? (
          <p className="mx-5 mt-3 break-words rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 sm:mx-6">
            {usersError}
          </p>
        ) : null}
        <div className="min-w-0 overflow-x-auto p-3 sm:p-4">
          {usersLoading ? (
            <p className="py-10 text-center text-sm text-slate-500">{t('audit:loading')}</p>
          ) : users.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-500">{t('audit:emptyUsers')}</p>
          ) : (
            <table className="table-base min-w-full text-sm">
              <thead>
                <tr>
                  <th className="text-start">{t('audit:colEmail')}</th>
                  <th className="text-start">{t('audit:colName')}</th>
                  <th className="text-start">{t('audit:colRole')}</th>
                  <th className="text-start">{t('audit:colAccess')}</th>
                  <th className="text-start">{t('audit:changeRole')}</th>
                  <th className="text-start">{t('audit:colAction')}</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const role = getCanonicalRole(u.fonction);
                  const busy = userBusyId === u.id;
                  const active = u.is_active_access !== false;
                  return (
                    <tr key={u.id}>
                      <td className="break-all font-medium text-slate-900">{u.email || '—'}</td>
                      <td className="break-words">
                        {[u.prenom, u.nom].filter(Boolean).join(' ') || '—'}
                      </td>
                      <td>
                        <span className="inline-flex rounded-md bg-navy/5 px-2 py-0.5 text-xs font-semibold text-navy ring-1 ring-navy/10">
                          {ROLE_LABEL[role] || u.fonction || '—'}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                            active
                              ? 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200'
                              : 'bg-red-50 text-red-800 ring-1 ring-red-200'
                          }`}
                        >
                          {active ? t('audit:accessActive') : t('audit:accessSuspended')}
                        </span>
                      </td>
                      <td>
                        <select
                          className="input h-10 min-h-10 min-w-[10rem] max-w-full border-slate-200 py-1.5 text-sm"
                          value={role || ''}
                          disabled={busy}
                          onChange={(e) => changeRole(u, e.target.value)}
                          aria-label={t('audit:changeRole')}
                        >
                          {roleOptions.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => toggleAccess(u)}
                          className={`btn h-10 min-h-10 px-3 py-0 text-sm ${
                            active ? 'btn-secondary' : 'btn-primary'
                          }`}
                        >
                          {active ? t('audit:suspend') : t('audit:reactivate')}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}
