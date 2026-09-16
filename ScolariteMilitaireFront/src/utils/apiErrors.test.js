import { describe, expect, it } from 'vitest';
import { formatApiError, humanizeError } from './apiErrors';

describe('formatApiError', () => {
  it('maps timeout / ECONNABORTED to French 408 message', () => {
    const msg = formatApiError({ message: 'timeout of 5000ms exceeded', code: 'ECONNABORTED' });
    expect(msg).toBe('La requête a pris trop de temps. Réessayez.');
  });

  it('maps HTTP 408 status', () => {
    const msg = formatApiError({ response: { status: 408, data: {} } });
    expect(msg).toBe('La requête a pris trop de temps. Réessayez.');
  });

  it('humanizes blank required field with French label', () => {
    const msg = formatApiError({
      response: {
        status: 400,
        data: { tel_urgence: ['This field may not be blank.'] },
      },
    });
    expect(msg).toBe('Tél. urgence est obligatoire.');
  });

  it('humanizes nested blank required', () => {
    const msg = formatApiError({
      response: {
        status: 400,
        data: { detail: { prenom_pere: ['This field is required.'] } },
      },
    });
    expect(msg).toBe('Prénom du père est obligatoire.');
  });

  it('humanizes max length', () => {
    const msg = humanizeError('Ensure this field has no more than 8 characters.');
    expect(msg).toBe('Trop long (maximum 8 caractères).');
  });

  it('humanizes email', () => {
    const msg = humanizeError('Enter a valid email address.');
    expect(msg).toBe('Adresse e-mail invalide.');
  });

  it('humanizes invalid choice', () => {
    const msg = humanizeError('"5" is not a valid choice.');
    expect(msg).toBe('Valeur non reconnue. Choisissez une option dans la liste.');
  });

  it('humanizes unique / already exists', () => {
    const msg = formatApiError({
      response: {
        status: 400,
        data: { matricule: ['eleve with this matricule already exists.'] },
      },
    });
    expect(msg).toBe('Matricule : Cette valeur existe déjà.');
  });

  it('hides IntegrityError dumps', () => {
    const msg = humanizeError('IntegrityError: duplicate key value violates unique constraint');
    expect(msg).toMatch(/Une erreur est survenue/);
  });

  it('keeps HTTP 403 generic', () => {
    const msg = formatApiError({ response: { status: 403, data: { detail: 'Forbidden' } } });
    expect(msg).toBe("Vous n'avez pas la permission d'effectuer cette action.");
  });
});
