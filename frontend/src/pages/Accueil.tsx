import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import MockupShowcase from '../components/MockupShowcase';
import {
  ShoppingCart, Package, BarChart3, Users, WifiOff, Check,
  ChevronRight, LogIn, Printer, Smartphone, Receipt, ArrowRight,
  Menu, X, Sparkles, Zap, ShieldCheck, TrendingUp, Star, Heart,
  CreditCard, CloudOff, MessageCircle, Globe, Award, ArrowUpRight
} from 'lucide-react';

export default function Accueil() {
  const { token } = useAuthStore();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (token) navigate('/app');
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [token, navigate]);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950" style={{fontFamily:"'Plus Jakarta Sans', sans-serif"}}>

      {/* ── NAVBAR ── */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled ? 'bg-white/90 dark:bg-gray-950/90 backdrop-blur-xl shadow-lg shadow-gray-900/5' : 'bg-white/80 dark:bg-gray-950/80 backdrop-blur-md'} border-b border-gray-100/50 dark:border-gray-800/50`}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/30 flex items-center justify-center transition-transform group-hover:scale-110 group-hover:rotate-3">
              <ShoppingCart size={20} className="text-white" strokeWidth={2.5}/>
            </div>
            <span className="text-xl font-extrabold text-gray-900 dark:text-white tracking-tight">
              Gesto<span className="text-emerald-600">Caisse</span>
            </span>
          </Link>
          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-2">
            <a href="#features" className="px-4 py-2 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-xl transition-all">
              Fonctionnalités
            </a>
            <a href="#pricing" className="px-4 py-2 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-xl transition-all">
              Tarifs
            </a>
            <Link to="/connexion" className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all">
              <LogIn size={14}/> Connexion
            </Link>
            <Link to="/inscription" className="px-5 py-2.5 text-sm font-bold bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl hover:shadow-lg hover:shadow-emerald-500/30 hover:-translate-y-0.5 transition-all">
              Commencer gratuitement
            </Link>
          </div>
          <button className="md:hidden p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200" onClick={()=>setMenuOpen(!menuOpen)}>
            {menuOpen ? <X size={20}/> : <Menu size={20}/>}
          </button>
        </div>
        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 p-4 space-y-2 fade-in shadow-xl">
            <a href="#features" onClick={()=>setMenuOpen(false)} className="block px-4 py-3 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl">Fonctionnalités</a>
            <a href="#pricing" onClick={()=>setMenuOpen(false)} className="block px-4 py-3 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl">Tarifs</a>
            <Link to="/connexion" className="w-full btn btn-secondary btn-lg justify-center"><LogIn size={16}/> Connexion</Link>
            <Link to="/inscription" className="w-full btn btn-primary btn-lg justify-center">Commencer gratuitement</Link>
          </div>
        )}
      </nav>

      {/* ── HERO ── */}
      <section className="pt-28 pb-20 sm:pt-36 sm:pb-28 px-4 text-center relative overflow-hidden">
        {/* Background gradient orbs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-10 left-1/4 w-[500px] h-[500px] bg-emerald-200/40 dark:bg-emerald-500/10 rounded-full blur-3xl" style={{animation:'float 8s ease-in-out infinite'}}/>
          <div className="absolute top-20 right-1/4 w-96 h-96 bg-teal-200/40 dark:bg-teal-500/10 rounded-full blur-3xl" style={{animation:'float 10s ease-in-out infinite reverse'}}/>
          <div className="absolute -bottom-20 left-1/2 w-96 h-96 bg-cyan-200/30 dark:bg-cyan-500/10 rounded-full blur-3xl" style={{animation:'float 12s ease-in-out infinite'}}/>
        </div>

        {/* Grid pattern overlay */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.03] dark:opacity-[0.05]" style={{
          backgroundImage: 'linear-gradient(rgba(16, 185, 129, 0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(16, 185, 129, 0.5) 1px, transparent 1px)',
          backgroundSize: '60px 60px'
        }}/>

        <div className="max-w-5xl mx-auto relative">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/30 dark:to-teal-900/30 border border-emerald-200/50 dark:border-emerald-700/30 rounded-full text-sm text-emerald-700 dark:text-emerald-300 font-bold mb-8 slide-up shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>🇧🇯 Fait au Bénin — Pour les commerçants béninois</span>
          </div>

          <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-extrabold text-gray-900 dark:text-white mb-6 leading-[0.95] tracking-tighter slide-up" style={{animationDelay:'100ms'}}>
            Gérez votre boutique<br/>
            <span className="relative inline-block">
              <span className="bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-600 bg-clip-text text-transparent bg-[length:200%_auto] animate-[gradient_3s_ease-in-out_infinite]">
                même sans internet
              </span>
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed slide-up font-medium" style={{animationDelay:'200ms'}}>
            La caisse intelligente pour les boutiques du Bénin : <span className="text-gray-900 dark:text-white font-bold">ventes, stock, clients, MoMo</span> et gestion fiable même sans internet.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-14 slide-up" style={{animationDelay:'300ms'}}>
            <Link to="/inscription" className="group flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold rounded-2xl transition-all shadow-xl shadow-emerald-500/30 hover:shadow-2xl hover:shadow-emerald-500/40 text-base w-full sm:w-auto justify-center hover:-translate-y-0.5">
              Démarrer gratuitement
              <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform"/>
            </Link>
            <a href="#features" className="flex items-center gap-2 px-6 py-4 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-bold rounded-2xl border border-gray-200 dark:border-gray-700 hover:border-emerald-500 dark:hover:border-emerald-500 transition-all w-full sm:w-auto justify-center hover:-translate-y-0.5">
              Voir les fonctionnalités
            </a>
          </div>

          {/* Stats animées */}
          <div className="grid grid-cols-3 max-w-2xl mx-auto gap-4 sm:gap-8 slide-up" style={{animationDelay:'400ms'}}>
            {[
              { v: '10 min', l: 'pour installer', icon: Zap, color: 'text-amber-500' },
              { v: '100%', l: 'hors-ligne', icon: CloudOff, color: 'text-blue-500' },
              { v: '0 FCFA', l: 'pour démarrer', icon: Heart, color: 'text-rose-500' },
            ].map(({ v, l, icon: Icon, color }, i) => (
              <div key={i} className="text-center p-4 rounded-2xl bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border border-gray-100 dark:border-gray-700 hover:border-emerald-200 dark:hover:border-emerald-700 transition-all hover:-translate-y-0.5">
                <Icon size={20} className={`mx-auto mb-2 ${color}`}/>
                <p className="text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-white">{v}</p>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5 font-medium">{l}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FONCTIONNALITÉS ── */}
      <section id="features" className="relative py-20 sm:py-28 px-4 bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-950">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-extrabold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/30 rounded-full uppercase tracking-wider">
              <Sparkles size={12}/> Fonctionnalités
            </span>
            <h2 className="text-4xl sm:text-5xl font-extrabold text-gray-900 dark:text-white mt-4 mb-4 tracking-tight">
              Tout ce dont vous avez besoin
            </h2>
            <p className="text-gray-500 dark:text-gray-400 max-w-xl mx-auto text-lg">
              Un seul logiciel remplace votre cahier, votre calculatrice et votre tableur.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: ShoppingCart, color: 'from-emerald-400 to-emerald-600', shadow: 'shadow-emerald-500/30', title: 'Caisse ultra-rapide', desc: 'Vente en 3 clics. Panier, encaissement espèces ou MoMo. Ticket imprimable avec tous les détails.', tag: '⚡ Populaire' },
              { icon: Package,      color: 'from-blue-400 to-blue-600',       shadow: 'shadow-blue-500/30',    title: 'Stock intelligent',   desc: 'Stock mis à jour automatiquement à chaque vente. Alertes email si stock faible. Historique complet.', tag: '📦 Essentiel' },
              { icon: BarChart3,    color: 'from-purple-400 to-purple-600',   shadow: 'shadow-purple-500/30',  title: 'Rapports clairs',     desc: "CA du jour, bénéfice estimé, top produits. Graphiques d'évolution mensuels. Export PDF.", tag: '📊 Pro' },
              { icon: Users,        color: 'from-amber-400 to-amber-600',     shadow: 'shadow-amber-500/30',   title: 'Clients & crédits',   desc: "Enregistrez vos clients fidèles. Suivez les dettes avec historique. Envoi de rappel de paiement.", tag: '👥 Très demandé' },
              { icon: WifiOff,      color: 'from-red-400 to-red-600',         shadow: 'shadow-red-500/30',     title: 'Hors-ligne total',    desc: "Connexion coupée ? GestoCaisse continue. Toutes vos données synchronisées automatiquement.", tag: '📶 Unique' },
              { icon: Printer,      color: 'from-pink-400 to-pink-600',       shadow: 'shadow-pink-500/30',    title: 'Ticket professionnel',desc: "Tickets style pharmacie avec détail de chaque produit, mode de paiement, monnaie rendue.", tag: '🧾 Nouveau' },
            ].map((f, i) => (
              <div
                key={i}
                className="group relative card-hover p-6 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 overflow-hidden"
                style={{animation:'slideUp 0.5s ease-out', animationDelay:`${i*80}ms`, animationFillMode:'both'}}
              >
                {/* Gradient on hover */}
                <div className={`absolute -inset-px bg-gradient-to-br ${f.color} opacity-0 group-hover:opacity-5 transition-opacity duration-500 rounded-2xl pointer-events-none`}/>

                <div className="flex items-start justify-between mb-4 relative">
                  <div className={`w-12 h-12 bg-gradient-to-br ${f.color} rounded-2xl flex items-center justify-center shadow-lg ${f.shadow} transition-transform group-hover:scale-110 group-hover:rotate-3`}>
                    <f.icon size={22} className="text-white"/>
                  </div>
                  <span className="text-xs font-bold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2.5 py-1 rounded-full">{f.tag}</span>
                </div>
                <h3 className="font-extrabold text-gray-900 dark:text-white mb-2 text-lg">{f.title}</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">{f.desc}</p>
                <ArrowUpRight size={16} className="absolute top-6 right-6 text-gray-300 dark:text-gray-600 opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-1 group-hover:-translate-y-1"/>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── BANDEAU "COMMENT ÇA MARCHE" ── */}
      <section className="py-20 px-4 bg-white dark:bg-gray-950">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-extrabold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/30 rounded-full uppercase tracking-wider">
              <Zap size={12}/> Comment ça marche
            </span>
            <h2 className="text-4xl sm:text-5xl font-extrabold text-gray-900 dark:text-white mt-4 mb-4 tracking-tight">
              3 étapes, c'est tout
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
            {/* Connection line */}
            <div className="hidden md:block absolute top-8 left-1/6 right-1/6 h-0.5 bg-gradient-to-r from-emerald-200 via-teal-200 to-emerald-200 dark:from-emerald-800 dark:via-teal-800 dark:to-emerald-800"/>

            {[
              { num: '1', title: 'Inscrivez-vous', desc: 'Créez votre compte en 2 minutes. Aucune carte bancaire requise pour le plan gratuit.', icon: ShieldCheck },
              { num: '2', title: 'Ajoutez vos produits', desc: 'Importez votre catalogue ou ajoutez vos produits manuellement avec prix et stock.', icon: Package },
              { num: '3', title: 'Encaissez vos clients', desc: 'Créez votre première vente en quelques clics. Mode hors-ligne activé par défaut.', icon: ShoppingCart },
            ].map(({ num, title, desc, icon: Icon }, i) => (
              <div key={i} className="relative text-center p-6">
                <div className="relative inline-flex items-center justify-center w-16 h-16 mb-5 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-2xl font-extrabold shadow-xl shadow-emerald-500/30">
                  {num}
                </div>
                <h3 className="font-extrabold text-gray-900 dark:text-white mb-2 text-lg">{title}</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── APERÇU DU PRODUIT (MOCKUPS) ── */}
      <MockupShowcase />

      {/* ── TÉMOIGNAGES ── */}
      <section className="py-20 px-4 bg-gradient-to-br from-emerald-50/50 via-white to-teal-50/30 dark:from-emerald-950/20 dark:via-gray-950 dark:to-teal-950/20">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-extrabold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/30 rounded-full uppercase tracking-wider">
              <Heart size={12}/> Témoignages
            </span>
            <h2 className="text-4xl sm:text-5xl font-extrabold text-gray-900 dark:text-white mt-4 mb-4 tracking-tight">
              Ils nous font confiance
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              { name: 'Aïcha D.', role: 'Boutique — Cotonou', initial: 'AD', color: 'from-emerald-400 to-teal-500', text: 'Depuis que j\'utilise GestoCaisse, je ne perds plus de temps avec mon cahier. La gestion du crédit client est devenue simple !', stars: 5 },
              { name: 'Kossi M.', role: 'Supermarché — Porto-Novo', initial: 'KM', color: 'from-blue-400 to-indigo-500', text: 'Le mode hors-ligne est une révolution. Même quand le réseau coupe, je continue à encaisser. Mes clients sont contents.', stars: 5 },
              { name: 'Fatou B.', role: 'Boutique de cosmétiques', initial: 'FB', color: 'from-purple-400 to-pink-500', text: 'Le rapport journalier me permet de voir en un coup d\'œuil mes bénéfices. L\'envoi du ticket par WhatsApp est top !', stars: 5 },
            ].map((t, i) => (
              <div key={i} className="card p-6 hover:-translate-y-1 transition-transform" style={{animation:'slideUp 0.5s ease-out', animationDelay:`${i*100}ms`, animationFillMode:'both'}}>
                <div className="flex gap-0.5 mb-3">
                  {[...Array(t.stars)].map((_, k) => (
                    <Star key={k} size={16} className="fill-amber-400 text-amber-400"/>
                  ))}
                </div>
                <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed mb-4">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${t.color} text-white font-bold flex items-center justify-center text-sm`}>
                    {t.initial}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 dark:text-white text-sm">{t.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PLANS ── */}
      <section id="pricing" className="py-20 sm:py-28 px-4 bg-white dark:bg-gray-950">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-extrabold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/30 rounded-full uppercase tracking-wider">
              <Award size={12}/> Tarifs
            </span>
            <h2 className="text-4xl sm:text-5xl font-extrabold text-gray-900 dark:text-white mt-4 mb-4 tracking-tight">
              Des prix honnêtes
            </h2>
            <p className="text-gray-500 dark:text-gray-400 max-w-xl mx-auto text-lg">
              Aucun renouvellement automatique. Payez seulement quand vous êtes convaincu.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { nom: 'Starter', badge: 'Gratuit', badgeColor: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300', prix: '0', devise: 'FCFA', desc: 'Pour commencer', border: 'border-gray-200 dark:border-gray-700',
                features: ['✅ Caisse complète', '✅ 5 produits', '✅ Rapport journalier', '✅ 1 utilisateur', '✅ Tickets imprimables'], cta: 'Commencer', ctaStyle: 'btn-secondary' },
              { nom: 'Pro', badge: '⭐ Populaire', badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300', prix: '1 000', devise: 'FCFA', desc: '/mois ou 10 000 FCFA/an', border: 'border-emerald-500 shadow-2xl shadow-emerald-500/20',
                features: ['✅ Produits illimités', '✅ Mode hors-ligne', '✅ Alertes stock', '✅ Export PDF', '✅ 2 utilisateurs', '✅ Rapports mensuels'], cta: 'Choisir Pro', ctaStyle: 'btn-primary' },
              { nom: 'Business', badge: '🏆 Complet', badgeColor: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300', prix: '3 000', devise: 'FCFA', desc: '/mois ou 30 000 FCFA/an', border: 'border-blue-300 dark:border-blue-700',
                features: ['✅ Tout Pro inclus', '✅ Multi-boutiques', '✅ Crédits avancés', '✅ Utilisateurs illimités', '✅ Support 24h'], cta: 'Choisir Business', ctaStyle: 'btn-secondary' },
            ].map((p,i) => (
              <div key={i} className={`group relative rounded-3xl p-7 border-2 ${p.border} bg-white dark:bg-gray-800 transition-all hover:-translate-y-2 ${i === 1 ? 'sm:scale-105' : ''}`}>
                {i === 1 && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-extrabold rounded-full shadow-lg">
                    Recommandé
                  </div>
                )}
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-extrabold text-gray-900 dark:text-white">{p.nom}</h3>
                  <span className={`text-xs font-extrabold px-3 py-1 rounded-full ${p.badgeColor}`}>{p.badge}</span>
                </div>
                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl sm:text-5xl font-extrabold text-gray-900 dark:text-white">{p.prix}</span>
                    <span className="text-lg font-bold text-gray-500 dark:text-gray-400">{p.devise}</span>
                  </div>
                  {p.desc === 'Pour commencer' ? (
                    <p className="text-gray-400 text-sm mt-1">Pour toujours</p>
                  ) : (
                    <p className="text-gray-400 text-sm mt-1">{p.desc}</p>
                  )}
                </div>
                <ul className="space-y-2.5 mb-7">
                  {p.features.map((f,j) => (
                    <li key={j} className="text-sm text-gray-600 dark:text-gray-300 font-medium flex items-start gap-2">
                      <Check size={16} className="text-emerald-500 flex-shrink-0 mt-0.5"/>
                      <span>{f.replace('✅ ', '')}</span>
                    </li>
                  ))}
                </ul>
                <Link to="/inscription" className={`btn ${p.ctaStyle} btn-lg w-full`}>{p.cta}</Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section className="py-20 sm:py-28 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-700"/>
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: 'radial-gradient(circle at 30% 50%, rgba(255,255,255,0.3) 0%, transparent 50%), radial-gradient(circle at 70% 50%, rgba(255,255,255,0.2) 0%, transparent 50%)'
        }}/>
        <div className="max-w-2xl mx-auto text-center relative">
          <div className="inline-flex items-center justify-center w-16 h-16 mb-6 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20">
            <Sparkles size={28} className="text-white"/>
          </div>
          <h2 className="text-4xl sm:text-5xl font-extrabold text-white mb-5 tracking-tight">
            Prêt à gérer votre boutique comme un pro ?
          </h2>
          <p className="text-emerald-50 mb-8 text-lg sm:text-xl font-medium">
            Rejoignez les commerçants béninois qui font confiance à GestoCaisse.
          </p>
          <Link to="/inscription"
            className="inline-flex items-center gap-2 px-10 py-4 bg-white text-emerald-700 font-extrabold rounded-2xl hover:bg-emerald-50 transition-all shadow-2xl text-base hover:-translate-y-0.5">
            Créer mon compte gratuit <ArrowRight size={18}/>
          </Link>
          <p className="text-emerald-100 text-sm mt-5 font-medium">
            ✨ Sans engagement • Installation en 10 min
          </p>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-gray-950 border-t border-gray-800 py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                  <ShoppingCart size={18} className="text-white" strokeWidth={2.5}/>
                </div>
                <span className="text-xl font-extrabold text-white">Gesto<span className="text-emerald-400">Caisse</span></span>
              </div>
              <p className="text-gray-400 text-sm max-w-sm leading-relaxed">
                La solution de caisse moderne pour les commerçants africains. Vendez, suivez votre stock et vos clients, même sans internet.
              </p>
            </div>
            <div>
              <h4 className="text-white font-bold mb-3 text-sm uppercase tracking-wider">Produit</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#features" className="text-gray-400 hover:text-emerald-400 transition-colors">Fonctionnalités</a></li>
                <li><a href="#pricing" className="text-gray-400 hover:text-emerald-400 transition-colors">Tarifs</a></li>
                <li><Link to="/inscription" className="text-gray-400 hover:text-emerald-400 transition-colors">S'inscrire</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-bold mb-3 text-sm uppercase tracking-wider">Compte</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/connexion" className="text-gray-400 hover:text-emerald-400 transition-colors">Connexion</Link></li>
                <li><Link to="/mot-de-passe-oublie" className="text-gray-400 hover:text-emerald-400 transition-colors">Mot de passe oublié</Link></li>
              </ul>
            </div>
          </div>
          <div className="pt-6 border-t border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-gray-500 text-sm">GestoCaisse — © 2026. Tous droits réservés.</p>
            <p className="text-gray-500 text-sm">🇧🇯 Conçu avec ❤️ au Bénin</p>
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes gradient {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        html { scroll-behavior: smooth; }
      `}</style>
    </div>
  );
}
