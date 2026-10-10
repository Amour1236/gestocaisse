import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Play, Sparkles, Monitor, ShoppingCart, BarChart3,
  Users, Receipt, Loader2, RefreshCw, ArrowRight,
} from 'lucide-react';
import { demoAPI } from '../services/api';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';

type PageId = 'caisse' | 'dashboard' | 'clients' | 'ventes';

const PAGES: { id: PageId; label: string; icon: typeof ShoppingCart; gradient: string; bgGradient: string; }[] = [
  { id: 'caisse',    label: 'Caisse',          icon: ShoppingCart, gradient: 'from-emerald-400 to-teal-600', bgGradient: 'from-emerald-50 to-teal-50' },
  { id: 'dashboard', label: 'Tableau de bord',  icon: BarChart3,    gradient: 'from-blue-400 to-indigo-500', bgGradient: 'from-blue-50 to-indigo-50' },
  { id: 'clients',   label: 'Clients',          icon: Users,        gradient: 'from-rose-400 to-pink-500',    bgGradient: 'from-rose-50 to-pink-50' },
  { id: 'ventes',    label: 'Historique',        icon: Receipt,     gradient: 'from-amber-400 to-orange-500', bgGradient: 'from-amber-50 to-orange-50' },
];

// Mini preview de chaque page (capture UI simulée)
function PagePreview({ pageId }: { pageId: PageId }) {
  if (pageId === 'caisse') return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div className="w-10 bg-gray-900 dark:bg-gray-950 flex flex-col items-center py-3 gap-2">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
          <span className="text-white font-bold text-[6px]">GC</span>
        </div>
        <div className="w-5 h-5 rounded bg-emerald-500/80"/>
        <div className="w-5 h-5 rounded bg-gray-700"/>
        <div className="w-5 h-5 rounded bg-gray-700"/>
        <div className="w-5 h-5 rounded bg-gray-700"/>
        <div className="w-5 h-5 rounded bg-gray-700"/>
      </div>
      {/* Main */}
      <div className="flex-1 flex flex-col">
        <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-3 py-2">
          <p className="text-[7px] text-gray-400">Caisse</p>
          <p className="text-[10px] font-bold text-gray-900 dark:text-white">Ma Boutique</p>
        </div>
        <div className="flex-1 flex gap-2 p-2 bg-gray-50 dark:bg-gray-900">
          <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg p-2">
            <p className="text-[6px] font-bold text-gray-400 uppercase mb-1">Articles</p>
            <div className="grid grid-cols-3 gap-1">
              {['Biscuit\n500F', 'Olé\n500F', 'Yaourt\n1500F', 'Pain\n700F', 'Coca\n800F', 'Eau\n300F'].map((item, i) => (
                <div key={i} className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded border border-emerald-100 dark:border-emerald-800/30 p-1 text-center">
                  <p className="text-[5px] font-bold text-gray-800 dark:text-gray-200 leading-tight">{item.split('\n')[0]}</p>
                  <p className="text-[5px] text-emerald-600 dark:text-emerald-300">{item.split('\n')[1]}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="w-24 bg-white dark:bg-gray-800 rounded-lg p-2 flex flex-col">
            <p className="text-[6px] font-bold text-gray-400 uppercase mb-1">Panier</p>
            <div className="flex-1 space-y-0.5">
              <div className="flex justify-between text-[5px]"><span className="text-gray-700 dark:text-gray-300">Biscuit</span><span className="text-emerald-600 dark:text-emerald-300">500F</span></div>
              <div className="flex justify-between text-[5px]"><span className="text-gray-700 dark:text-gray-300">Olé</span><span className="text-emerald-600 dark:text-emerald-300">500F</span></div>
              <div className="flex justify-between text-[5px]"><span className="text-gray-700 dark:text-gray-300">Yaourt</span><span className="text-emerald-600 dark:text-emerald-300">1500F</span></div>
            </div>
            <div className="mt-auto pt-1 border-t border-gray-100 dark:border-gray-700">
              <div className="flex justify-between text-[6px] font-bold"><span className="text-gray-900 dark:text-white">Total</span><span className="text-emerald-600 dark:text-emerald-300">2 500F</span></div>
              <div className="mt-1 bg-gradient-to-r from-emerald-500 to-teal-500 rounded text-[6px] text-white font-bold text-center py-1.5">Encaisser</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (pageId === 'dashboard') return (
    <div className="flex h-full">
      <div className="w-10 bg-gray-900 dark:bg-gray-950 flex flex-col items-center py-3 gap-2">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center"><span className="text-white font-bold text-[6px]">GC</span></div>
        <div className="w-5 h-5 rounded bg-gray-700"/>
        <div className="w-5 h-5 rounded bg-emerald-500/80"/>
        <div className="w-5 h-5 rounded bg-gray-700"/>
        <div className="w-5 h-5 rounded bg-gray-700"/>
        <div className="w-5 h-5 rounded bg-gray-700"/>
      </div>
      <div className="flex-1 flex flex-col">
        <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-3 py-2">
          <p className="text-[7px] text-gray-400">Bonjour, Demo</p>
          <p className="text-[10px] font-bold text-gray-900 dark:text-white">Tableau de bord</p>
        </div>
        <div className="flex-1 p-2 bg-gray-50 dark:bg-gray-900 space-y-1.5">
          <div className="grid grid-cols-3 gap-1">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-1.5 shadow-sm text-center">
              <p className="text-[5px] text-gray-400 uppercase font-semibold">CA du jour</p>
              <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-300">7 000F</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-1.5 shadow-sm text-center">
              <p className="text-[5px] text-gray-400 uppercase font-semibold">Ventes</p>
              <p className="text-[10px] font-bold text-blue-600 dark:text-blue-300">8</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-1.5 shadow-sm text-center">
              <p className="text-[5px] text-gray-400 uppercase font-semibold">Bénéfice</p>
              <p className="text-[10px] font-bold text-purple-600 dark:text-purple-300">1 200F</p>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-2 shadow-sm flex-1">
            <p className="text-[6px] font-bold text-gray-500 uppercase mb-1">Performance</p>
            <div className="flex items-end justify-around h-14 gap-0.5">
              {[40,65,45,80,55,90,70,85,60,95,75,88].map((h,i) => (
                <div key={i} className="w-1.5 bg-gradient-to-t from-emerald-500 to-teal-400 rounded-t" style={{height:`${h}%`}}/>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (pageId === 'clients') return (
    <div className="flex h-full">
      <div className="w-10 bg-gray-900 dark:bg-gray-950 flex flex-col items-center py-3 gap-2">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center"><span className="text-white font-bold text-[6px]">GC</span></div>
        <div className="w-5 h-5 rounded bg-gray-700"/>
        <div className="w-5 h-5 rounded bg-gray-700"/>
        <div className="w-5 h-5 rounded bg-gray-700"/>
        <div className="w-5 h-5 rounded bg-emerald-500/80"/>
        <div className="w-5 h-5 rounded bg-gray-700"/>
      </div>
      <div className="flex-1 flex flex-col">
        <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-3 py-2">
          <p className="text-[7px] text-gray-400">Clients</p>
          <p className="text-[10px] font-bold text-gray-900 dark:text-white">Fidélité & Crédits</p>
        </div>
        <div className="flex-1 p-2 bg-gray-50 dark:bg-gray-900 space-y-1.5">
          <div className="grid grid-cols-2 gap-1">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-1.5 shadow-sm text-center">
              <p className="text-[8px] font-bold text-emerald-600 dark:text-emerald-300">68%</p>
              <p className="text-[5px] text-gray-400">Fidélité</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-1.5 shadow-sm text-center">
              <p className="text-[8px] font-bold text-amber-600 dark:text-amber-300">3</p>
              <p className="text-[5px] text-gray-400">Crédits actifs</p>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
            <div className="px-2 py-1 bg-gradient-to-r from-emerald-500 to-teal-500">
              <p className="text-[5px] font-bold text-white uppercase">Clients</p>
            </div>
            {[{name:'Aïcha D.',p:3,t:'2 500F'}, {name:'Kossi M.',p:5,t:'8 000F'}, {name:'Aminata S.',p:2,t:'1 200F'}].map((c,i) => (
              <div key={i} className="flex items-center justify-between px-2 py-1 border-b border-gray-50 dark:border-gray-700 last:border-0">
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 rounded-full bg-gradient-to-br from-emerald-300 to-teal-400 flex items-center justify-center">
                    <span className="text-[4px] font-bold text-white">{c.name[0]}</span>
                  </div>
                  <span className="text-[5px] font-semibold text-gray-700 dark:text-gray-200">{c.name}</span>
                </div>
                <div className="text-right">
                  <p className="text-[4px] text-gray-400">#{c.p}</p>
                  <p className="text-[5px] font-bold text-emerald-600 dark:text-emerald-300">{c.t}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  // ventes
  return (
    <div className="flex h-full">
      <div className="w-10 bg-gray-900 dark:bg-gray-950 flex flex-col items-center py-3 gap-2">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center"><span className="text-white font-bold text-[6px]">GC</span></div>
        <div className="w-5 h-5 rounded bg-gray-700"/>
        <div className="w-5 h-5 rounded bg-gray-700"/>
        <div className="w-5 h-5 rounded bg-gray-700"/>
        <div className="w-5 h-5 rounded bg-gray-700"/>
        <div className="w-5 h-5 rounded bg-emerald-500/80"/>
      </div>
      <div className="flex-1 flex flex-col">
        <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-3 py-2">
          <p className="text-[7px] text-gray-400">Historique des ventes</p>
          <p className="text-[10px] font-bold text-gray-900 dark:text-white">Reçus & Transactions</p>
        </div>
        <div className="flex-1 p-2 bg-gray-50 dark:bg-gray-900">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 bg-gradient-to-r from-emerald-600 to-teal-600">
              <p className="text-[6px] font-bold text-white">DATE</p>
              <p className="text-[6px] font-bold text-white">HEURE</p>
              <p className="text-[6px] font-bold text-white">TOTAL</p>
              <p className="text-[6px] font-bold text-white">MODE</p>
            </div>
            {[
              {date:'04 Sept',h:'10:30',total:'2 500F',mode:'Espèces'},
              {date:'04 Sept',h:'09:15',total:'1 800F',mode:'MoMo'},
              {date:'03 Sept',h:'18:45',total:'3 200F',mode:'Espèces'},
              {date:'03 Sept',h:'14:20',total:'800F', mode:'Carte'},
              {date:'03 Sept',h:'11:05',total:'5 000F',mode:'MoMo'},
              {date:'02 Sept',h:'16:30',total:'700F', mode:'Espèces'},
            ].map((v,i) => (
              <div key={i} className="flex items-center justify-between px-3 py-1.5 border-b border-gray-50 dark:border-gray-700 last:border-0">
                <p className="text-[5px] text-gray-600 dark:text-gray-300">{v.date}</p>
                <p className="text-[5px] text-gray-500 dark:text-gray-400">{v.h}</p>
                <p className="text-[6px] font-bold text-emerald-600 dark:text-emerald-300">{v.total}</p>
                <span className={`text-[4px] font-bold px-1.5 py-0.5 rounded-full ${v.mode==='Espèces'?'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300':'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'}`}>{v.mode}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MockupShowcase() {
  const navigate = useNavigate();
  const { loginWithToken } = useAuthStore();
  const [activePage, setActivePage] = useState<PageId>('caisse');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'idle' | 'ready' | 'done'>('idle');

  const handleStartDemo = async () => {
    setLoading(true);
    try {
      const { data } = await demoAPI.demarrer();
      if (data.success && data.token && data.user) {
        loginWithToken(data.token, data.user);
        setStep('ready');
        setTimeout(() => {
          window.location.href = '/app';
        }, 800);
        toast.success(`Compte démo prêt ! Redirection...`, { duration: 2000 });
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Erreur de démarrage de la démo';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const currentPage = PAGES.find((p) => p.id === activePage)!;

  return (
    <section id="mockup" className="py-20 px-4 bg-gradient-to-b from-white via-emerald-50/30 to-white dark:from-gray-950 dark:via-emerald-950/10 dark:to-gray-950">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-extrabold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/30 rounded-full uppercase tracking-wider mb-4">
            <Sparkles size={12}/> Démo interactive
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-3">
            Voyez GestoCaisse en action
          </h2>
          <p className="text-gray-500 dark:text-gray-400 max-w-xl mx-auto text-sm sm:text-base">
            Cliquez sur <strong>Démarrer la démo</strong> pour accéder à un compte pré-rempli avec de vraies données de test.
          </p>
        </div>

        {/* Navigation tabs */}
        <div className="flex items-center justify-center gap-2 mb-6 flex-wrap">
          {PAGES.map((page) => {
            const Icon = page.icon;
            const isActive = activePage === page.id;
            return (
              <button
                key={page.id}
                onClick={() => setActivePage(page.id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  isActive
                    ? `bg-gradient-to-r ${page.gradient} text-white shadow-lg`
                    : 'text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <Icon size={14}/>
                {page.label}
              </button>
            );
          })}
        </div>

        {/* Browser window */}
        <div className="relative max-w-5xl mx-auto">
          <div className="absolute -inset-2 bg-gradient-to-r from-emerald-400 via-blue-400 to-rose-400 opacity-10 blur-3xl rounded-3xl"/>

          <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-gray-900/20 dark:shadow-gray-900/50 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
            {/* Browser bar */}
            <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400 shadow-sm"/>
                <div className="w-3 h-3 rounded-full bg-yellow-400 shadow-sm"/>
                <div className="w-3 h-3 rounded-full bg-green-400 shadow-sm"/>
              </div>
              <div className="flex-1 flex items-center gap-2 bg-white dark:bg-gray-700 rounded-md px-3 py-1 max-w-md mx-auto">
                <div className="w-4 h-4 rounded bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shrink-0">
                  <span className="text-white font-bold text-[5px]">GC</span>
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-300 truncate">
                  gestocaisse.app/app/{activePage}
                </span>
                {step === 'ready' && (
                  <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"/>
                    CONNECTÉ
                  </span>
                )}
              </div>
              <div className="flex gap-1">
                <div className="w-3 h-3 rounded bg-gray-200 dark:bg-gray-600"/>
                <div className="w-3 h-3 rounded bg-gray-200 dark:bg-gray-600"/>
              </div>
            </div>

            {/* Page content */}
            <div className={`h-[420px] sm:h-[480px] bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 bg-gradient-to-br ${currentPage.bgGradient} dark:from-gray-900 dark:to-gray-950 overflow-hidden`}>
              <PagePreview pageId={activePage}/>
            </div>

            {/* Status bar */}
            {step === 'ready' && (
              <div className="px-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 border-t border-emerald-100 dark:border-emerald-800/30 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"/>
                <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                  ✓ Connecté au compte démo — 15 produits, 5 clients, 50+ ventes
                </p>
              </div>
            )}
          </div>

          {/* CTA */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            {step === 'ready' ? (
              <button
                onClick={() => window.location.href = '/app'}
                className="inline-flex items-center gap-2 px-6 py-3 text-base font-extrabold text-white bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl shadow-xl shadow-emerald-500/30 hover:shadow-2xl hover:shadow-emerald-500/40 hover:-translate-y-1 transition-all"
              >
                <Monitor size={18}/>
                Ouvrir GestoCaisse
                <ArrowRight size={18}/>
              </button>
            ) : (
              <button
                onClick={handleStartDemo}
                disabled={loading}
                className="inline-flex items-center gap-2 px-8 py-4 text-base font-extrabold text-white bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl shadow-xl shadow-emerald-500/30 hover:shadow-2xl hover:shadow-emerald-500/40 hover:-translate-y-1 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <><Loader2 size={20} className="animate-spin"/> Création du compte démo...</>
                ) : (
                  <><Play size={20} fill="white"/> Démarrer la démo gratuite</>
                )}
              </button>
            )}
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Sans inscription • Données fictives• Annulable à tout moment
            </p>
          </div>

          {/* Features */}
          <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl mx-auto">
            {[
              { label: '15+ produits',     icon: '📦', color: 'emerald' },
              { label: '5 clients',         icon: '👥', color: 'blue' },
              { label: '50+ ventes',        icon: '💰', color: 'amber' },
              { label: 'Plan Pro actif',    icon: '⭐', color: 'rose' },
            ].map((f, i) => (
              <div key={i} className="flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl px-3 py-2 text-center">
                <span className="text-sm">{f.icon}</span>
                <span className="text-xs font-bold text-gray-700 dark:text-gray-200">{f.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
