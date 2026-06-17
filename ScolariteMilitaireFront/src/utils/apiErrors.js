const FIELD_LABELS = {
  matricule: 'Matricule',
  nom: 'Nom',
  prenom: 'Prénom',
  nni: 'NNI',
  sexe: 'Sexe',
  email: 'E-mail',
  email_pro: 'E-mail professionnel',
  emailPro: 'E-mail professionnel',
  email_perso: 'E-mail personnel',
  emailPerso: 'E-mail personnel',
  telephone: 'Téléphone',
  tel1: 'Téléphone',
  password: 'Mot de passe',
  non_field_errors: 'Erreur',
  detail: 'Détail',
  file: 'Fichier',
  photo: 'Photo',
};

const HTTP_MESSAGES = {
  400: 'Les informations envoyées sont incorrectes. Vérifiez le formulaire.',
  401: 'Session expirée. Reconnectez-vous pour continuer.',
  403: "Vous n'avez pas la permission d'effectuer cette action.",
  404: 'Élément introuvable.',
  408: 'La requête a pris trop de temps. Réessayez.',
  413: 'Le fichier dépasse la taille maximale autorisée.',
  415: 'Format de fichier non accepté.',
  422: 'Certaines informations sont invalides. Corrigez le formulaire.',
  429: 'Trop de tentatives. Patientez quelques instants.',
  500: 'Le serveur est temporairement indisponible. Réessayez plus tard.',
  502: 'Service momentanément indisponible. Réessayez plus tard.',
  503: 'Service momentanément indisponible. Réessayez plus tard.',
};

function isHtmlString(value) {
  if (typeof value !== 'string') return false;
  const t = value.trim();
  return /<html|<!doctype|<title|<body/i.test(t);
}

function stripHtml(value) {
  return String(value)
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function humanizeRawMessage(raw) {
  if (raw == null || raw === '') return '';
  let text = typeof raw === 'string' ? raw : String(raw);
  if (isHtmlString(text)) {
    if (/413|Request Entity Too Large|Content Too Large/i.test(text)) {
      return HTTP_MESSAGES[413];
    }
    if (/404|Not Found/i.test(text)) return HTTP_MESSAGES[404];
    if (/403|Forbidden/i.test(text)) return HTTP_MESSAGES[403];
    if (/500|Internal Server Error/i.test(text)) return HTTP_MESSAGES[500];
    const stripped = stripHtml(text);
    if (stripped.length > 180) return 'Une erreur est survenue. Réessayez ou contactez l’administrateur.';
    return stripped || 'Une erreur est survenue.';
  }
  text = text.trim();

  const statusMatch = text.match(/status code (\d{3})/i);
  if (statusMatch) {
    const code = Number(statusMatch[1]);
    if (HTTP_MESSAGES[code]) return HTTP_MESSAGES[code];
  }

  if (/network error/i.test(text)) {
    return 'Impossible de joindre le serveur. Vérifiez votre connexion internet.';
  }
  if (/timeout|ECONNABORTED/i.test(text)) {
    return HTTP_MESSAGES[408];
  }
  if (/failed to fetch/i.test(text)) {
    return 'Connexion interrompue. Vérifiez votre réseau et réessayez.';
  }
  if (/unexpected token|<!doctype/i.test(text)) {
    return 'Le serveur a renvoyé une réponse inattendue. Réessayez plus tard.';
  }

  return text;
}

function stringifyToken(token) {
  if (token == null) return '';
  if (typeof token === 'string') return humanizeRawMessage(token);
  if (typeof token === 'number' || typeof token === 'boolean') return String(token);
  if (Array.isArray(token)) {
    return token.map((x) => stringifyToken(x)).filter(Boolean).join(' ');
  }
  if (typeof token === 'object') {
    const msg = token.message || token.detail;
    if (msg) return humanizeRawMessage(String(msg));
    try {
      return humanizeRawMessage(JSON.stringify(token));
    } catch {
      return 'Erreur inconnue.';
    }
  }
  return humanizeRawMessage(String(token));
}

function firstListItem(v) {
  if (v == null) return '';
  if (Array.isArray(v)) return v.map(stringifyToken).filter(Boolean).join(' — ') || stringifyToken(v[0]);
  return stringifyToken(v);
}

function fieldLabel(key) {
  return FIELD_LABELS[key] ?? key.replace(/_/g, ' ').replace(/\./g, ' · ');
}

function flattenFieldErrors(obj, prefix = '') {
  const out = [];
  if (!obj || typeof obj !== 'object') return out;
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v != null && typeof v === 'object' && !Array.isArray(v) && typeof v.detail === 'undefined') {
      out.push(...flattenFieldErrors(v, key));
    } else {
      const label = fieldLabel(k);
      const msg = firstListItem(v);
      out.push(label === key ? msg : `${label} : ${msg}`);
    }
  }
  return out;
}

/** Message court et lisible pour l’utilisateur final (erreurs API, réseau, fichiers, etc.). */
export function formatApiError(err) {
  const status = err?.response?.status;
  const data = err?.response?.data;

  if (status && HTTP_MESSAGES[status] && status !== 400 && status !== 422) {
    return HTTP_MESSAGES[status];
  }

  if (!data) {
    const msg = err?.message;
    if (msg) return humanizeRawMessage(msg);
    return 'Erreur réseau. Vérifiez votre connexion.';
  }

  if (typeof data === 'string') {
    if (isHtmlString(data)) {
      if (status === 413) return HTTP_MESSAGES[413];
      return humanizeRawMessage(stripHtml(data));
    }
    return humanizeRawMessage(data);
  }

  if (data.code === 'token_not_valid' || data.messages) {
    return HTTP_MESSAGES[401];
  }

  if (data.error && typeof data.error === 'string') {
    return humanizeRawMessage(data.error);
  }

  if (data.non_field_errors) {
    return firstListItem(data.non_field_errors);
  }

  if (data.detail != null) {
    if (typeof data.detail === 'string') {
      if (isHtmlString(data.detail)) return humanizeRawMessage(stripHtml(data.detail));
      return humanizeRawMessage(data.detail);
    }
    if (Array.isArray(data.detail)) {
      return data.detail.map((d) => stringifyToken(d)).filter(Boolean).join(' ');
    }
    if (typeof data.detail === 'object') {
      const flat = flattenFieldErrors(data.detail);
      return flat.join(' — ') || HTTP_MESSAGES[400];
    }
  }

  const skip = new Set(['detail', 'code', 'messages', 'error']);
  const entries = Object.entries(data).filter(([k]) => !skip.has(k));
  if (entries.length > 0) {
    const lines = [];
    for (const [k, v] of entries) {
      lines.push(`${fieldLabel(k)} : ${firstListItem(v)}`);
    }
    return lines.join(' · ');
  }

  if (status && HTTP_MESSAGES[status]) return HTTP_MESSAGES[status];
  return humanizeRawMessage(err?.message) || 'Une erreur est survenue.';
}

/** Alias pour erreurs JavaScript simples ou messages bruts. */
export function humanizeError(errOrMessage) {
  if (errOrMessage == null) return 'Une erreur est survenue.';
  if (typeof errOrMessage === 'string') return humanizeRawMessage(errOrMessage);
  if (errOrMessage?.response || errOrMessage?.isAxiosError) return formatApiError(errOrMessage);
  if (errOrMessage?.message) return humanizeRawMessage(errOrMessage.message);
  return 'Une erreur est survenue.';
}
