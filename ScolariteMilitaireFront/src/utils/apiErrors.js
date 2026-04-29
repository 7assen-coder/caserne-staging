function stringifyToken(token) {
  if (token == null) return '';
  if (typeof token === 'string') return token;
  if (typeof token === 'number' || typeof token === 'boolean') return String(token);
  if (Array.isArray(token)) {
    return token.map((x) => stringifyToken(x)).filter(Boolean).join(' ');
  }
  if (typeof token === 'object') {
    const code = token.code;
    const msg = token.message || token.detail;
    if (code && msg) return `${msg} (${String(code)})`;
    if (msg) return String(msg);
    try {
      return JSON.stringify(token);
    } catch {
      return String(token);
    }
  }
  return String(token);
}

function firstListItem(v) {
  if (v == null) return '';
  if (Array.isArray(v)) return v.map(stringifyToken).filter(Boolean).join(' — ') || stringifyToken(v[0]);
  return stringifyToken(v);
}

function flattenFieldErrors(obj, prefix = '') {
  const out = [];
  if (!obj || typeof obj !== 'object') return out;
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix} ${k}` : k;
    if (v != null && typeof v === 'object' && !Array.isArray(v) && typeof v.detail === 'undefined') {
      out.push(...flattenFieldErrors(v, key));
    } else {
      out.push(`${key}: ${firstListItem(v)}`);
    }
  }
  return out;
}

export function formatApiError(err) {
  const status = err?.response?.status;
  const data = err?.response?.data;

  if (status === 401) {
    return 'Session expirée. Reconnectez-vous pour continuer.';
  }
  if (status === 403) {
    return "Vous n'avez pas la permission d'effectuer cette action.";
  }
  if (status === 404) {
    return 'Ressource introuvable.';
  }
  if (status >= 500) {
    return 'Le serveur est temporairement indisponible. Réessayez plus tard.';
  }

  if (!data) {
    return err?.message && err.message !== 'Request failed with status code 401'
      ? err.message
      : 'Erreur réseau. Vérifiez votre connexion.';
  }

  if (typeof data === 'string') return data;

  if (data.code === 'token_not_valid' || data.messages) {
    return 'Session expirée ou jeton invalide. Reconnectez-vous.';
  }

  if (data.non_field_errors) {
    return firstListItem(data.non_field_errors);
  }

  if (data.detail != null) {
    if (typeof data.detail === 'string') return data.detail;
    if (Array.isArray(data.detail)) {
      return data.detail
        .map((d) => {
          if (typeof d === 'string') return d;
          if (d && typeof d === 'object') return stringifyToken(d);
          return '';
        })
        .filter(Boolean)
        .join(' ');
    }
    if (typeof data.detail === 'object') {
      return flattenFieldErrors(data.detail).join(' — ') || 'Requête refusée.';
    }
  }

  const skip = new Set(['detail', 'code', 'messages']);
  const entries = Object.entries(data).filter(([k]) => !skip.has(k));
  if (entries.length > 0) {
    const lines = [];
    for (const [k, v] of entries) {
      lines.push(`${k}: ${firstListItem(v)}`);
    }
    return lines.join(' · ');
  }

  return err?.message || 'Une erreur est survenue.';
}
