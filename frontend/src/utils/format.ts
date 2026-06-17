type ModePaiement = 'especes' | 'momo' | 'carte' | 'credit';

export const formatFCFA = (n: number | string | null | undefined): string => {
  if (n === null || n === undefined || isNaN(Number(n))) return '0 FCFA';
  return Number(n).toLocaleString('fr-FR') + ' FCFA';
};

export const formatDate = (d: string | Date | null | undefined): string => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

export const formatDateTime = (d: string | Date | null | undefined): string => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

export const modePaiementLabel = (mode: string): string =>
  ({ especes: 'Espèces', momo: 'MTN MoMo', carte: 'Carte', credit: 'Crédit' } as Record<string, string>)[mode] ?? mode;

export const modePaiementColor = (mode: string): string =>
  ({ especes: 'badge-green', momo: 'badge-yellow', carte: 'badge-blue', credit: 'badge-red' } as Record<string, string>)[mode] ?? 'badge-gray';
