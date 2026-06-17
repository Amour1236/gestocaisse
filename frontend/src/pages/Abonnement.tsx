import React, { useEffect, useState } from 'react';
import { paiementsAPI } from '../services/api';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';
import { Check, Loader2, X } from 'lucide-react';
import { formatDate } from '../utils/format';

const PLANS = [
  { id: 'pro_mensuel', nom: 'Pro', periode: 'Mensuel', prix_fcfa: 1000, prix_eur: '1,52 EUR', cadence: 'par mois', features: ['Produits illimites', 'Mode hors-ligne total', 'Alertes stock', 'Export PDF/Excel', '2 utilisateurs'], color: 'primary' },
  { id: 'pro_annuel', nom: 'Pro', periode: 'Annuel', prix_fcfa: 10000, prix_eur: '15,24 EUR', cadence: 'par an', note: '2 mois offerts', economie: 'Economisez 2 000 FCFA/an', features: ['Produits illimites', 'Mode hors-ligne total', 'Alertes stock', 'Export PDF/Excel', '2 utilisateurs'], color: 'primary' },
  { id: 'business_mensuel', nom: 'Business', periode: 'Mensuel', prix_fcfa: 3000, prix_eur: '4,57 EUR', cadence: 'par mois', features: ['Tout Pro inclus', 'Multi-boutiques', 'Credits avances', 'Utilisateurs illimites', 'Support prioritaire'], color: 'blue' },
  { id: 'business_annuel', nom: 'Business', periode: 'Annuel', prix_fcfa: 30000, prix_eur: '45,73 EUR', cadence: 'par an', note: '2 mois offerts', economie: 'Economisez 6 000 FCFA/an', features: ['Tout Pro inclus', 'Multi-boutiques', 'Credits avances', 'Utilisateurs illimites', 'Support prioritaire'], color: 'blue' },
];

export default function Abonnement() {
  const { user } = useAuthStore();
  const [paiements, setPaiements] = useState([]);
  const [loading, setLoading] = useState(null);
  const [momoInfo, setMomoInfo] = useState(null);

  const loadPaiements = () => paiementsAPI.mesPaiements().then(r => setPaiements(r.data.data));

  useEffect(() => { loadPaiements(); }, []);

  const planActuel = user?.boutique?.plan || 'starter';

  const payer = async (plan_id, methode) => {
    setLoading(plan_id + methode);
    try {
      if (methode === 'stripe') {
        const { data } = await paiementsAPI.stripeCheckout(plan_id);
        window.location.href = (data as any).url;
      } else {
        const { data } = await paiementsAPI.momoInitier(plan_id);
        setMomoInfo(data);
        await loadPaiements();
        toast.success('Reference MoMo generee !');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur.');
    }
    setLoading(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Abonnement</h1>
        <p className="text-gray-500 text-sm mt-1">Plan actuel: <span className="font-semibold text-primary-600 capitalize">{planActuel}</span> - Aucun renouvellement automatique</p>
      </div>

      <div className="card p-5 border-2 border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-gray-900">Plan Starter - Gratuit</h3>
            <p className="text-sm text-gray-500 mt-1">Caisse simple, jusqu'a 5 produits, rapport journalier</p>
          </div>
          {planActuel === 'starter' && <span className="badge badge-green">Plan actuel</span>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {PLANS.map(plan => (
          <div key={plan.id} className={'card p-5 border-2 transition-all ' + (plan.color === 'primary' ? 'border-primary-200 hover:border-primary-400' : 'border-blue-200 hover:border-blue-400')}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-bold text-gray-900">{plan.nom} - {plan.periode}</h3>
                {plan.note && <span className="badge badge-green text-xs mt-1">{plan.note}</span>}
              </div>
              <div className="text-right">
                <p className="text-2xl font-extrabold text-gray-900">{plan.prix_fcfa.toLocaleString()} FCFA</p>
                <p className="text-xs font-semibold text-gray-500">{plan.cadence}</p>
                <p className="text-xs text-gray-400">{plan.prix_eur}</p>
              </div>
            </div>
            {plan.economie && <p className="text-sm font-semibold text-emerald-700 mb-3">{plan.economie}</p>}
            <ul className="space-y-1.5 mb-4">
              {plan.features.map((f, i) => <li key={i} className="flex items-center gap-2 text-sm text-gray-600"><Check size={14} className="text-green-500 flex-shrink-0" />{f}</li>)}
            </ul>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => payer(plan.id, 'momo')} disabled={loading !== null}
                className={'btn btn-md flex-1 ' + (plan.color === 'primary' ? 'bg-primary-50 text-primary-700 hover:bg-primary-100' : 'bg-blue-50 text-blue-700 hover:bg-blue-100')}>
                {loading === plan.id + 'momo' ? <Loader2 size={14} className="animate-spin" /> : 'MoMo'}
              </button>
              <button onClick={() => payer(plan.id, 'stripe')} disabled={loading !== null}
                className="btn btn-secondary btn-md flex-1">
                {loading === plan.id + 'stripe' ? <Loader2 size={14} className="animate-spin" /> : 'Carte'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {momoInfo && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="card p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">Paiement Mobile Money</h3>
              <button onClick={() => setMomoInfo(null)}><X size={18} /></button>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
              <p className="text-sm text-amber-800 font-medium mb-3">Suivez ces etapes :</p>
              <ol className="space-y-2 text-sm text-amber-900">
                <li className="flex gap-2"><span className="font-bold">1.</span> Envoyez <strong>{momoInfo.montant?.toLocaleString()} FCFA</strong> au numero <strong>{momoInfo.numero_momo}</strong></li>
                <li className="flex gap-2"><span className="font-bold">2.</span> Dans le libelle, mettez la reference : <strong className="font-mono bg-white px-2 py-0.5 rounded">{momoInfo.reference}</strong></li>
                <li className="flex gap-2"><span className="font-bold">3.</span> L'administrateur confirmera le paiement avant activation.</li>
              </ol>
            </div>
            <button onClick={() => { navigator.clipboard.writeText(momoInfo.reference); toast.success('Reference copiee !'); }} className="btn btn-secondary btn-md w-full mb-2">
              Copier la reference: {momoInfo.reference}
            </button>
            <button onClick={() => setMomoInfo(null)} className="btn btn-primary btn-md w-full">Compris, j'ai envoye le paiement</button>
          </div>
        </div>
      )}

      {paiements.length > 0 && (
        <div className="card overflow-hidden">
          <div className="p-4 border-b border-gray-100"><h3 className="font-bold">Historique des abonnements</h3></div>
          <div className="divide-y divide-gray-50">
            {paiements.map(p => (
              <div key={p.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium capitalize">{p.plan} - {p.methode}</p>
                  <p className="text-xs text-gray-500">Expire: {formatDate(p.fin)}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold">{p.montant_fcfa?.toLocaleString()} FCFA</p>
                  <span className={'badge ' + (p.statut === 'actif' ? 'badge-green' : p.statut === 'en_attente' ? 'badge-yellow' : 'badge-gray')}>{p.statut}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
