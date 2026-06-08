export const formatFCFA = (n) => {
  if (n === null || n === undefined || isNaN(n)) return '0 FCFA';
  return Number(n).toLocaleString('fr-FR') + ' FCFA';
};

export const formatDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

export const formatDateTime = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
};

export const modePaiementLabel = (mode) => ({
  especes: 'Espèces', momo: 'MTN MoMo', carte: 'Carte', credit: 'Crédit'
}[mode] || mode);

export const modePaiementColor = (mode) => ({
  especes: 'badge-green', momo: 'badge-yellow', carte: 'badge-blue', credit: 'badge-red'
}[mode] || 'badge-gray');
