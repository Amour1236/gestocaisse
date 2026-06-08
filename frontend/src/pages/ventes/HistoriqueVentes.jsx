import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ventesAPI } from '../../services/api';
import { formatFCFA, formatDate, formatDateTime, modePaiementLabel, modePaiementColor } from '../../utils/format';
import {
  CalendarDays, ChevronDown, ChevronRight, CreditCard, Loader2,
  Receipt, Search, ShoppingCart, TrendingUp
} from 'lucide-react';

const today = new Date().toISOString().split('T')[0];
const firstDayOfMonth = today.slice(0, 7) + '-01';

export default function HistoriqueVentes() {
  const [filters, setFilters] = useState({ debut: firstDayOfMonth, fin: today, mode_paiement: '' });
  const [groupes, setGroupes] = useState([]);
  const [resume, setResume] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState({});

  const charger = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
      const { data } = await ventesAPI.historique(params);
      setGroupes(data.data || []);
      setResume(data.resume || null);
    } catch (e) {
      setError(e.response?.data || { message: 'Impossible de charger l historique.' });
      setGroupes([]);
      setResume(null);
    }
    setLoading(false);
  };

  useEffect(() => { charger(); }, []);

  const toutesLesVentes = useMemo(
    () => groupes.flatMap(g => g.ventes || []),
    [groupes]
  );

  const toggle = (id) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  if (error?.requireUpgrade) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="card p-8 text-center">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-emerald-50 flex items-center justify-center">
            <Receipt size={28} className="text-emerald-600" />
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900 mb-2">Historique des ventes</h1>
          <p className="text-gray-500 mb-6">
            Cette liste detaillee est reservee au plan Pro: ventes par jour, articles, prix, remises et modes de paiement.
          </p>
          <Link to="/app/abonnement" className="btn btn-primary btn-lg">
            Voir les abonnements
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Receipt size={24} className="text-emerald-600" /> Historique des ventes
          </h1>
          <p className="text-sm text-gray-500 mt-1">Toutes les ventes avec articles, prix, remises et paiement.</p>
        </div>
        <Link to="/app/caisse" className="btn btn-secondary btn-md">
          <ShoppingCart size={16} /> Nouvelle vente
        </Link>
      </div>

      <div className="card p-4">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label className="label">Debut</label>
            <input type="date" className="input" value={filters.debut} onChange={e => setFilters(f => ({ ...f, debut: e.target.value }))} />
          </div>
          <div>
            <label className="label">Fin</label>
            <input type="date" className="input" value={filters.fin} onChange={e => setFilters(f => ({ ...f, fin: e.target.value }))} />
          </div>
          <div>
            <label className="label">Paiement</label>
            <select className="input" value={filters.mode_paiement} onChange={e => setFilters(f => ({ ...f, mode_paiement: e.target.value }))}>
              <option value="">Tous</option>
              <option value="especes">Especes</option>
              <option value="momo">MTN MoMo</option>
              <option value="carte">Carte</option>
              <option value="credit">Credit</option>
            </select>
          </div>
          <div className="flex items-end">
            <button onClick={charger} disabled={loading} className="btn btn-primary btn-md w-full">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />} Filtrer
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="CA total" value={formatFCFA(resume?.ca)} icon={TrendingUp} />
        <Stat label="Ventes" value={resume?.nb_ventes || 0} icon={Receipt} />
        <Stat label="Articles" value={resume?.articles || 0} icon={ShoppingCart} />
        <Stat label="Remises" value={formatFCFA(resume?.remises)} icon={CreditCard} />
      </div>

      {loading ? (
        <div className="card p-8 text-center text-gray-400">
          <Loader2 size={28} className="animate-spin mx-auto mb-2" />
          Chargement de l historique...
        </div>
      ) : toutesLesVentes.length === 0 ? (
        <div className="card p-8 text-center text-gray-400">
          <CalendarDays size={34} className="mx-auto mb-2" />
          Aucune vente trouvee pour cette periode.
        </div>
      ) : (
        <div className="space-y-4">
          {groupes.map(groupe => (
            <section key={groupe.date} className="card overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 className="font-extrabold text-gray-900">{formatDate(groupe.date)}</h2>
                  <p className="text-xs text-gray-500">{groupe.ventes.length} vente(s) - {groupe.articles} article(s)</p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-lg font-extrabold text-emerald-700">{formatFCFA(groupe.total)}</p>
                  {groupe.remises > 0 && <p className="text-xs text-amber-600">Remises: {formatFCFA(groupe.remises)}</p>}
                </div>
              </div>

              <div className="divide-y divide-gray-50">
                {groupe.ventes.map(vente => {
                  const lignes = vente.lignes_vente || [];
                  const isOpen = !!expanded[vente.id];
                  return (
                    <div key={vente.id} className="px-4 py-3">
                      <button onClick={() => toggle(vente.id)} className="w-full flex items-center justify-between gap-3 text-left">
                        <div className="flex items-center gap-3 min-w-0">
                          {isOpen ? <ChevronDown size={18} className="text-gray-400" /> : <ChevronRight size={18} className="text-gray-400" />}
                          <div className="min-w-0">
                            <p className="font-bold text-gray-900 truncate">{vente.numero}</p>
                            <p className="text-xs text-gray-500">
                              {formatDateTime(vente.created_at)} - {vente.clients?.nom || 'Client comptoir'}
                            </p>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="font-extrabold text-gray-900">{formatFCFA(vente.total_final)}</p>
                          <span className={'badge text-xs ' + modePaiementColor(vente.mode_paiement)}>{modePaiementLabel(vente.mode_paiement)}</span>
                        </div>
                      </button>

                      {isOpen && (
                        <div className="mt-3 ml-8 bg-gray-50 rounded-xl overflow-hidden">
                          <table className="w-full text-sm">
                            <thead className="text-xs text-gray-500 uppercase">
                              <tr>
                                <th className="px-3 py-2 text-left">Article</th>
                                <th className="px-3 py-2 text-center">Qte</th>
                                <th className="px-3 py-2 text-right">Prix</th>
                                <th className="px-3 py-2 text-right">Total</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white">
                              {lignes.map(ligne => (
                                <tr key={ligne.id}>
                                  <td className="px-3 py-2 font-medium text-gray-800">{ligne.nom_produit}</td>
                                  <td className="px-3 py-2 text-center">{ligne.quantite}</td>
                                  <td className="px-3 py-2 text-right">{formatFCFA(ligne.prix_unitaire)}</td>
                                  <td className="px-3 py-2 text-right font-bold">{formatFCFA(ligne.total)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          <div className="px-3 py-2 border-t border-white text-xs text-gray-500 flex flex-wrap gap-x-4 gap-y-1">
                            <span>Total brut: <strong>{formatFCFA(vente.total)}</strong></span>
                            <span>Remise: <strong>{formatFCFA(vente.remise)}</strong></span>
                            <span>Total final: <strong>{formatFCFA(vente.total_final)}</strong></span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

const Stat = ({ label, value, icon: Icon }) => (
  <div className="card p-4 flex items-center gap-3">
    <div className="p-2 rounded-xl bg-emerald-50">
      <Icon size={20} className="text-emerald-600" />
    </div>
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="font-extrabold text-gray-900">{value}</p>
    </div>
  </div>
);
