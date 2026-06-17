import { formatFCFA, formatDate, formatDateTime, modePaiementLabel, modePaiementColor } from '../utils/format';

describe('formatFCFA', () => {
  it('formate un nombre positif', () => {
    const result = formatFCFA(1000);
    expect(result).toContain('FCFA');
    expect(result).toContain('1');
  });

  it('retourne 0 FCFA pour null', () => {
    expect(formatFCFA(null)).toBe('0 FCFA');
  });

  it('retourne 0 FCFA pour undefined', () => {
    expect(formatFCFA(undefined)).toBe('0 FCFA');
  });

  it('retourne 0 FCFA pour NaN', () => {
    expect(formatFCFA(NaN)).toBe('0 FCFA');
  });

  it('formate zéro correctement', () => {
    const result = formatFCFA(0);
    expect(result).toContain('FCFA');
  });

  it('accepte une chaîne numérique', () => {
    const result = formatFCFA('5000');
    expect(result).toContain('FCFA');
  });
});

describe('formatDate', () => {
  it('retourne — pour null', () => {
    expect(formatDate(null)).toBe('—');
  });

  it('retourne — pour undefined', () => {
    expect(formatDate(undefined)).toBe('—');
  });

  it('formate une date ISO', () => {
    const result = formatDate('2026-01-15T10:00:00Z');
    expect(result).toMatch(/\d{2}\/\d{2}\/\d{4}/);
  });
});

describe('formatDateTime', () => {
  it('retourne — pour null', () => {
    expect(formatDateTime(null)).toBe('—');
  });

  it('formate une date avec heure', () => {
    const result = formatDateTime('2026-01-15T10:30:00Z');
    expect(typeof result).toBe('string');
    expect(result).not.toBe('—');
  });
});

describe('modePaiementLabel', () => {
  it('retourne le bon label pour espèces', () => {
    expect(modePaiementLabel('especes')).toBe('Espèces');
  });

  it('retourne le bon label pour momo', () => {
    expect(modePaiementLabel('momo')).toBe('MTN MoMo');
  });

  it('retourne le bon label pour carte', () => {
    expect(modePaiementLabel('carte')).toBe('Carte');
  });

  it('retourne le bon label pour crédit', () => {
    expect(modePaiementLabel('credit')).toBe('Crédit');
  });

  it('retourne la valeur brute pour un mode inconnu', () => {
    expect(modePaiementLabel('virement')).toBe('virement');
  });
});

describe('modePaiementColor', () => {
  it('retourne badge-green pour espèces', () => {
    expect(modePaiementColor('especes')).toBe('badge-green');
  });

  it('retourne badge-yellow pour momo', () => {
    expect(modePaiementColor('momo')).toBe('badge-yellow');
  });

  it('retourne badge-gray pour un mode inconnu', () => {
    expect(modePaiementColor('inconnu')).toBe('badge-gray');
  });
});
