import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import {
  ShoppingCart, Package, BarChart3, Users, WifiOff, Check,
  ChevronRight, LogIn, Star, Printer,
  Shield, Smartphone, TrendingUp, Receipt, ArrowRight, Menu, X
} from 'lucide-react';

export default function Accueil() {
  const { token } = useAuthStore();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [visibleSection, setVisibleSection] = useState('');

  useEffect(() => {
    if (token) navigate('/app');
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [token, navigate]);

  return (
    <div className="min-h-screen bg-white" style={{fontFamily:"'Plus Jakarta Sans', sans-serif"}}>

      {/* ── NAVBAR ── */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/95 backdrop-blur-md shadow-sm' : 'bg-white'} border-b border-gray-100`}>
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="text-2xl font-extrabold tracking-tight">
            Gesto<span className="text-emerald-600">Caisse</span>
          </Link>
          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-2">
            <Link to="/connexion" className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-all">
              <LogIn size={13}/> Connexion
            </Link>
            <Link to="/inscription" className="px-5 py-2 text-sm font-bold bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all shadow-sm hover:shadow-emerald-200 hover:shadow-md">
              Commencer
            </Link>
          </div>
          <button className="md:hidden p-2 rounded-xl hover:bg-gray-100" onClick={()=>setMenuOpen(!menuOpen)}>
            {menuOpen ? <X size={20}/> : <Menu size={20}/>}
          </button>
        </div>
        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100 p-4 space-y-2 fade-in">
            <Link to="/connexion" className="w-full btn btn-secondary btn-lg justify-center"><LogIn size={16}/> Connexion</Link>
            <Link to="/inscription" className="w-full btn btn-primary btn-lg justify-center">Commencer gratuitement</Link>
          </div>
        )}
      </nav>

      {/* ── HERO ── */}
      <section className="pt-28 pb-20 px-4 text-center relative overflow-hidden">
        {/* Background gradient blobs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-10 left-1/4 w-96 h-96 bg-emerald-100 rounded-full opacity-40 blur-3xl" style={{animation:'float 6s ease-in-out infinite'}}/>
          <div className="absolute top-20 right-1/4 w-64 h-64 bg-teal-100 rounded-full opacity-40 blur-3xl" style={{animation:'float 8s ease-in-out infinite reverse'}}/>
        </div>
        <div className="max-w-4xl mx-auto relative">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-emerald-50 border border-emerald-200 rounded-full text-sm text-emerald-700 font-bold mb-8 slide-up">
            <span className="w-2 h-2 bg-emerald-500 rounded-full" style={{animation:'pulseSoft 2s infinite'}}/>
            🇧🇯 Fait au Bénin — Pour les commerçants béninois
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold text-gray-900 mb-6 leading-tight tracking-tighter slide-up" style={{animationDelay:'100ms'}}>
            Gérez votre boutique<br/>
            <span className="text-emerald-600">même sans internet</span>
          </h1>
          <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed slide-up" style={{animationDelay:'200ms'}}>
            Caisse, stock, clients, rapports — tout en un. 4× moins cher que la concurrence.
            Commencez gratuitement dès aujourd'hui.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 slide-up" style={{animationDelay:'300ms'}}>
            <Link to="/inscription" className="group flex items-center gap-2 px-8 py-4 bg-emerald-600 text-white font-bold rounded-2xl hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-200 text-lg w-full sm:w-auto justify-center hover:-translate-y-0.5">
              Commencer gratuitement <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform"/>
            </Link>
          </div>
          {/* Stats animées */}
          <div className="flex items-center justify-center gap-10 flex-wrap slide-up" style={{animationDelay:'400ms'}}>
            {[['🆓 Gratuit', 'pour démarrer'], ['⚡ 10 min', 'pour installer'], ['📶 Offline', 'sans internet']].map(([v,l]) => (
              <div key={l} className="text-center">
                <p className="text-2xl font-extrabold text-gray-900">{v}</p>
                <p className="text-sm text-gray-400 mt-0.5">{l}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FONCTIONNALITÉS ── */}
      <section className="bg-gray-50 py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <span className="text-emerald-600 font-bold text-sm uppercase tracking-widest">Fonctionnalités</span>
            <h2 className="text-4xl font-extrabold text-gray-900 mt-2 mb-3">Tout ce dont vous avez besoin</h2>
            <p className="text-gray-500 max-w-xl mx-auto">Un seul logiciel remplace votre cahier, votre calculatrice et votre tableur.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: ShoppingCart, color: 'from-emerald-400 to-emerald-600', title: 'Caisse ultra-rapide', desc: 'Vente en 3 clics. Panier, encaissement espèces ou MoMo. Ticket imprimable style pharmacie avec tous les détails.', tag: '⚡ Le plus utilisé' },
              { icon: Package,      color: 'from-blue-400 to-blue-600',       title: 'Stock intelligent',   desc: 'Stock mis à jour automatiquement à chaque vente. Alertes email si stock faible. Historique complet des mouvements.', tag: '📦 Essentiel' },
              { icon: BarChart3,    color: 'from-purple-400 to-purple-600',   title: 'Rapports clairs',     desc: "CA du jour, bénéfice estimé, top produits. Graphiques d'évolution mensuels. Export PDF disponible.", tag: '📊 Plan Pro' },
              { icon: Users,        color: 'from-amber-400 to-amber-600',     title: 'Clients & crédits',   desc: "Enregistrez vos clients fidèles. Suivez les dettes avec historique. Envoi de rappel de paiement.", tag: '👥 Très demandé' },
              { icon: WifiOff,      color: 'from-red-400 to-red-600',         title: 'Hors-ligne total',    desc: "Connexion coupée ? GestoCaisse continue. Toutes vos données synchronisées automatiquement au retour.", tag: '📶 Unique' },
              { icon: Printer,      color: 'from-pink-400 to-pink-600',       title: 'Ticket professionnel',desc: "Tickets style pharmacie avec détail de chaque produit, TVA, mode de paiement, monnaie rendue. Imprimez en 1 clic.", tag: '🧾 Nouveau' },
            ].map((f, i) => (
              <div key={i} className="card-hover p-6" style={{animation:'slideUp 0.5s ease-out', animationDelay:`${i*80}ms`, animationFillMode:'both'}}>
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-12 h-12 bg-gradient-to-br ${f.color} rounded-2xl flex items-center justify-center shadow-md`}>
                    <f.icon size={22} className="text-white"/>
                  </div>
                  <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">{f.tag}</span>
                </div>
                <h3 className="font-extrabold text-gray-900 mb-2 text-lg">{f.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PLANS ── */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <span className="text-emerald-600 font-bold text-sm uppercase tracking-widest">Tarifs</span>
            <h2 className="text-4xl font-extrabold text-gray-900 mt-2 mb-3">Des prix honnêtes</h2>
            <p className="text-gray-500">Aucun renouvellement automatique. Payez seulement quand vous êtes convaincu.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { nom: 'Starter', badge: 'Gratuit', badgeColor: 'bg-gray-100 text-gray-600', prix: '0 FCFA', desc: 'Pour commencer', border: 'border-gray-200',
                features: ['✅ Caisse complète', '✅ 5 produits', '✅ Rapport journalier', '✅ 1 utilisateur', '✅ Tickets imprimables'], cta: 'Commencer', ctaStyle: 'btn-secondary' },
              { nom: 'Pro', badge: '⭐ Populaire', badgeColor: 'bg-emerald-100 text-emerald-800', prix: '1 000 FCFA', desc: '/mois ou 10 000 FCFA/an', border: 'border-emerald-500 shadow-xl shadow-emerald-100',
                features: ['✅ Produits illimités', '✅ Mode hors-ligne', '✅ Alertes stock', '✅ Export PDF', '✅ 2 utilisateurs', '✅ Rapports mensuels'], cta: 'Choisir Pro', ctaStyle: 'btn-primary' },
              { nom: 'Business', badge: '🏆 Complet', badgeColor: 'bg-blue-100 text-blue-800', prix: '3 000 FCFA', desc: '/mois ou 30 000 FCFA/an', border: 'border-blue-300',
                features: ['✅ Tout Pro inclus', '✅ Multi-boutiques', '✅ Crédits avancés', '✅ Utilisateurs illimités', '✅ Support 24h'], cta: 'Choisir Business', ctaStyle: 'btn-secondary' },
            ].map((p,i) => (
              <div key={i} className={`rounded-3xl p-7 border-2 ${p.border} relative transition-all hover:-translate-y-1`}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-extrabold text-gray-900">{p.nom}</h3>
                  <span className={`text-xs font-extrabold px-3 py-1 rounded-full ${p.badgeColor}`}>{p.badge}</span>
                </div>
                <div className="mb-5">
                  <span className="text-4xl font-extrabold text-gray-900">{p.prix}</span>
                  {p.desc !== 'Pour commencer' && <span className="text-gray-400 ml-1">{p.desc}</span>}
                  {p.desc === 'Pour commencer' && <p className="text-gray-400 text-sm mt-1">Pour commencer</p>}
                </div>
                <ul className="space-y-2 mb-6">
                  {p.features.map((f,j) => <li key={j} className="text-sm text-gray-600 font-medium">{f}</li>)}
                </ul>
                <Link to="/inscription" className={`btn ${p.ctaStyle} btn-lg w-full`}>{p.cta}</Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section className="py-20 px-4 bg-gradient-to-br from-emerald-600 to-teal-700 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-4xl font-extrabold text-white mb-4">Prêt à gérer votre boutique comme un pro ?</h2>
          <p className="text-emerald-100 mb-8 text-lg">Rejoignez les commerçants béninois qui font confiance à GestoCaisse.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/inscription"
              className="px-10 py-4 bg-white text-emerald-700 font-extrabold rounded-2xl hover:bg-emerald-50 transition-all shadow-xl text-lg w-full sm:w-auto hover:-translate-y-0.5">
              Créer mon compte gratuit 🚀
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-gray-900 border-t border-gray-800 py-8 px-4">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="text-xl font-extrabold text-white">Gesto<span className="text-emerald-500">Caisse</span></span>
          <p className="text-gray-500 text-sm">GestoCaisse — © 2026. Tous droits réservés.</p>
          <div className="flex gap-4">
            <Link to="/connexion" className="text-gray-400 hover:text-white text-sm transition-colors">Connexion</Link>
            <Link to="/inscription" className="text-gray-400 hover:text-white text-sm transition-colors">Inscription</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
