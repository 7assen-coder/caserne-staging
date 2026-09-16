import { api } from './api';
import { apiPaths } from './apiPaths';

export async function listAuditEvents(params = {}) {
  const { data } = await api.get(apiPaths.audit.list, { params });
  return data;
}

export async function getAuditEvent(id) {
  const { data } = await api.get(apiPaths.audit.detail(id));
  return data;
}
