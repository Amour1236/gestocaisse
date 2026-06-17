import React, { useState, useEffect } from 'react';
import { rapportsAPI, ventesAPI } from '../../services/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { TrendingUp, TrendingDown, ShoppingCart, Award, Calendar } from 'lucide-react';
import { formatFCFA, formatDateTime, modePaiementLabel, modePaiementColor } from '../../utils/format';

export default function Rapports() {
  const [tab, setTab] = useState('jour');
  const [dateJour, setDateJour] = useState(new Date().toISOString().split('T')[0]);
  const [rapportJour, setRapportJour] = useState<any>(null);
  const [rapportMois, setRapportMois] = useState<any>(null);
  const [rapportGlobal, setRapportGlobal] = useState<any>(null);
  const [ventes, setVentes] = useState<any[]>([]);
  const [loadingJ, setLoadingJ] = useState(false);
  const [loadingM, setLoadingM] = useState(false);
  const [loadingG, setLoadingG] = useState(false);
  const [moisSel, setMoisSel] = useState({ annee: new Date().getFullYear(), mois: new Date().getMonth()+1 });

  useEffect(() => {
    setLoadingJ(true);
    rapportsAPI.rapportJour(dateJour).then(r => { setRapportJour((r.data as any).data); setLoadingJ(false); }).catch(() => setLoadingJ(false));
  }, [dateJour]);

  useEffect(() => {
    if (tab === 'mois') {
      setLoadingM(true);
      rapportsAPI.rapportMois(moisSel).then(r => { setRapportMois((r.data as any).data); setLoadingM(false); }).catch(() => setLoadingM(false));
    }
    if (tab === 'ventes') {
      ventesAPI.liste().then(r => setVentes(r.data.data || []));
    }
    if (tab === 'global') {
      setLoadingG(true);
      rapportsAPI.global().then(r => { setRapportGlobal((r.data as any).data); setLoadingG(false); }).catch(() => setLoadingG(false));
    }
  }, [tab, moisSel]);

  const StatItem = ({ label, value, icon: Icon, color='text-primary-600' }: { label: string; value: any; icon: any; color?: string }) => (
    <div className="card p-4 flex items-center gap-3">
      <div className={'p-2 rounded-xl bg-gray-50'}><Icon size={20} className={color}/></div>
      <div><p className="text-xs text-gray-500">{label}</p><p className="font-bold text-gray-900">{value}</p></div>
    </div>
  );

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Rapports</h1>
      <div className="flex gap-2 flex-wrap">
        {['jour','mois','global','ventes'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={'px-4 py-2 rounded-xl text-sm font-medium transition-all ' +
              (tab===t ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200')}>
            {t === 'jour' ? "Aujourd'hui" : t === 'mois' ? 'Ce mois' : t === 'global' ? 'Depuis creation' : 'Toutes les ventes'}
          </button>
        ))}
      </div>

      {/* RAPPORT JOUR */}
      {tab === 'jour' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <input type="date" className="input w-auto" value={dateJour} onChange={e => setDateJour(e.target.value)} />
          </div>
          {loadingJ ? <p className="text-gray-400 text-sm">Chargement...</p> : rapportJour && (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <StatItem label="CA du jour" value={formatFCFA(rapportJour.ca)} icon={TrendingUp} color="text-primary-600"/>
                <StatItem label="Ventes" value={rapportJour.nb_ventes} icon={ShoppingCart} color="text-blue-600"/>
                <StatItem label="Bénéfice estimé" value={formatFCFA(rapportJour.benefice)} icon={TrendingUp} color="text-green-600"/>
                <StatItem label="Remises accordées" value={formatFCFA(rapportJour.total_remises)} icon={TrendingDown} color="text-amber-600"/>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="card p-5">
                  <h3 className="font-bold mb-4">Par mode de paiement</h3>
                  <div className="space-y-3">
                    {rapportJour.modes && Object.entries(rapportJour.modes).map(([mode, total]) => (
                      <div key={mode} className="flex items-center justify-between">
                        <span className={'badge ' + modePaiementColor(mode)}>{modePaiementLabel(mode)}</span>
                        <span className="font-bold">{formatFCFA(total as number)}</span>
                      </div>
                    ))}
                    {rapportJour.modes && Object.keys(rapportJour.modes).length === 0 && <p className="text-gray-400 text-sm">Aucune vente aujourd'hui</p>}
                  </div>
                </div>

                <div className="card p-5">
                  <h3 className="font-bold mb-4 flex items-center gap-2"><Award size={16} className="text-amber-500"/>Top produits</h3>
                  <div className="space-y-2">
                    {rapportJour.top_produits && rapportJour.top_produits.map((p: any, i: number) => (
                      <div key={i} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                        <div className="flex items-center gap-2">
                          <span className={'text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center ' + (i===0?'bg-amber-100 text-amber-700':i===1?'bg-gray-100 text-gray-600':'bg-gray-50 text-gray-400')}>{i+1}</span>
                          <span className="text-sm text-gray-700">{p.nom}</span>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold">{formatFCFA(p.total)}</p>
                          <p className="text-xs text-gray-400">{p.quantite} vendu(s)</p>
                        </div>
                      </div>
                    ))}
                    {rapportJour.top_produits && rapportJour.top_produits.length === 0 && <p className="text-gray-400 text-sm">Aucune vente</p>}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* RAPPORT MOIS */}
      {tab === 'mois' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <select className="input w-auto" value={moisSel.mois} onChange={e => setMoisSel(m => ({...m, mois: Number(e.target.value)}))}>
              {['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'].map((m,i) => <option key={i} value={i+1}>{m}</option>)}
            </select>
            <input type="number" className="input w-24" value={moisSel.annee} onChange={e => setMoisSel(m => ({...m, annee: Number(e.target.value)}))} />
          </div>
          {loadingM ? <p className="text-gray-400 text-sm">Chargement...</p> : rapportMois && (
            <>
              <div className="grid grid-cols-3 gap-3">
                <StatItem label="CA du mois" value={formatFCFA(rapportMois.ca)} icon={TrendingUp} color="text-primary-600"/>
                <StatItem label="Nb. ventes" value={rapportMois.nb_ventes} icon={ShoppingCart} color="text-blue-600"/>
                <StatItem label="Bénéfice" value={formatFCFA(rapportMois.benefice)} icon={TrendingUp} color="text-green-600"/>
              </div>
              <div className="card p-5">
                <h3 className="font-bold mb-4">Évolution du CA par jour</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={rapportMois.graphData} margin={{ top:5, right:10, left:0, bottom:5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(d: string) => d.slice(8)} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => v >= 1000 ? Math.round(v/1000)+'k' : String(v)} />
                    <Tooltip formatter={(v: any) => formatFCFA(v as number)} labelFormatter={(l: string) => 'Jour ' + l.slice(8)} />
                    <Bar dataKey="total" fill="#059669" radius={[4,4,0,0]} name="CA" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
          {!loadingM && !rapportMois && <div className="card p-8 text-center"><p className="text-gray-400 text-sm">Passez au plan Pro pour accéder aux rapports mensuels.</p></div>}
        </div>
      )}

      {/* RAPPORT GLOBAL */}
      {tab === 'global' && (
        <div className="space-y-4">
          {loadingG ? <p className="text-gray-400 text-sm">Chargement...</p> : rapportGlobal && (
            <>
              {rapportGlobal.depuis && <p className="text-sm text-gray-500">Statistiques depuis le {new Date(rapportGlobal.depuis).toLocaleDateString('fr-FR')}</p>}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <StatItem label="CA total" value={formatFCFA(rapportGlobal.ca)} icon={TrendingUp} color="text-primary-600"/>
                <StatItem label="Toutes les ventes" value={rapportGlobal.nb_ventes} icon={ShoppingCart} color="text-blue-600"/>
                <StatItem label="Benefice total estime" value={formatFCFA(rapportGlobal.benefice)} icon={TrendingUp} color="text-green-600"/>
                <StatItem label="Panier moyen" value={formatFCFA(rapportGlobal.panier_moyen)} icon={Calendar} color="text-amber-600"/>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="card p-5">
                  <h3 className="font-bold mb-4">Par mode de paiement</h3>
                  <div className="space-y-3">
                    {rapportGlobal.modes && Object.entries(rapportGlobal.modes).map(([mode, total]) => (
                      <div key={mode} className="flex items-center justify-between">
                        <span className={'badge ' + modePaiementColor(mode)}>{modePaiementLabel(mode)}</span>
                        <span className="font-bold">{formatFCFA(total as number)}</span>
                      </div>
                    ))}
                    {rapportGlobal.modes && Object.keys(rapportGlobal.modes).length === 0 && <p className="text-gray-400 text-sm">Aucune vente enregistree</p>}
                  </div>
                </div>

                <div className="card p-5">
                  <h3 className="font-bold mb-4 flex items-center gap-2"><Award size={16} className="text-amber-500"/>Top produits depuis creation</h3>
                  <div className="space-y-2">
                    {rapportGlobal.top_produits && rapportGlobal.top_produits.map((p: any, i: number) => (
                      <div key={i} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                        <div className="flex items-center gap-2">
                          <span className={'text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center ' + (i===0?'bg-amber-100 text-amber-700':i===1?'bg-gray-100 text-gray-600':'bg-gray-50 text-gray-400')}>{i+1}</span>
                          <span className="text-sm text-gray-700">{p.nom}</span>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold">{formatFCFA(p.total)}</p>
                          <p className="text-xs text-gray-400">{p.quantite} vendu(s)</p>
                        </div>
                      </div>
                    ))}
                    {rapportGlobal.top_produits && rapportGlobal.top_produits.length === 0 && <p className="text-gray-400 text-sm">Aucune vente</p>}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* TOUTES LES VENTES */}
      {tab === 'ventes' && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">N° Vente</th>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-left">Client</th>
                  <th className="px-4 py-3 text-center">Paiement</th>
                  <th className="px-4 py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {ventes.map((v: any) => (
                  <tr key={v.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs font-medium">{v.numero}</td>
                    <td className="px-4 py-3 text-gray-500">{formatDateTime(v.created_at)}</td>
                    <td className="px-4 py-3">{v.clients?.nom || <span className="text-gray-300">—</span>}</td>
                    <td className="px-4 py-3 text-center"><span className={'badge ' + modePaiementColor(v.mode_paiement)}>{modePaiementLabel(v.mode_paiement)}</span></td>
                    <td className="px-4 py-3 text-right font-bold">{formatFCFA(v.total_final)}</td>
                  </tr>
                ))}
                {ventes.length === 0 && <tr><td colSpan={5} className="text-center py-10 text-gray-400">Aucune vente enregistrée</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
