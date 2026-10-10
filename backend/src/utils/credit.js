const toNumber = (value) => {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
};

const getCreditReste = ({ montant, montant_rembourse = 0 }) => {
  const total = toNumber(montant);
  const rembourse = toNumber(montant_rembourse);
  return Math.max(0, total - rembourse);
};

const nextCreditStatut = ({ montant, montant_rembourse = 0 }) => {
  const reste = getCreditReste({ montant, montant_rembourse });
  if (reste <= 0) return 'rembourse';
  if (toNumber(montant_rembourse) > 0) return 'partiel';
  return 'en_cours';
};

const getClientCreditEncours = (credits = []) => {
  return (credits || []).reduce((total, credit) => total + getCreditReste(credit), 0);
};

module.exports = {
  toNumber,
  getCreditReste,
  nextCreditStatut,
  getClientCreditEncours,
};
