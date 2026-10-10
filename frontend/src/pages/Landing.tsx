import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, TrendingUp, Users, Lock, Zap } from 'lucide-react';

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <img src="/logo-gestocaisse.svg" alt="GestoCaisse" className="h-11 w-11 rounded-2xl shadow-sm object-cover" />
            <h1 className="text-2xl font-bold text-primary-600">GestoCaisse</h1>
          </div>
          <div className="flex gap-3">
            <Link to="/connexion" className="px-4 py-2 text-primary-600 hover:bg-gray-50 rounded-lg">
              Connexion
            </Link>
            <Link to="/inscription" className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
              S'inscrire
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8 text-center">
        <div className="flex justify-center mb-6">
          <img src="/logo-gestocaisse.svg" alt="Logo GestoCaisse" className="h-28 w-28 rounded-[2rem] shadow-xl object-cover border border-emerald-100" />
        </div>
        <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
          Caisse & Stock pour boutiques béninoises
        </h2>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          Logiciel libre, hors-ligne, freemium. Gérez votre boutique comme un pro, sans internet. Fait au Bénin. 🔥
        </p>
        <div className="flex gap-4 justify-center">
          <Link to="/inscription" className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-bold">
            Démarrer gratuitement
          </Link>
          <a href="#features" className="px-6 py-3 border border-gray-300 text-gray-900 rounded-lg hover:bg-gray-50">
            En savoir plus
          </a>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
        <h3 className="text-3xl font-bold text-gray-900 text-center mb-12">Fonctionnalités</h3>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[
            { icon: ShoppingCart, title: 'Caisse rapide', desc: 'Scannez & vendez en 2 clics' },
            { icon: TrendingUp, title: 'Gestion de stock', desc: 'Alertes automatiques de rupture' },
            { icon: Users, title: 'Clients & crédits', desc: 'Suivi des clients et dettes' },
            { icon: Lock, title: 'Mode hors-ligne', desc: 'Fonctionne sans internet (PWA)' },
            { icon: Zap, title: 'Paiements', desc: 'Stripe + MTN MoMo' },
            { icon: TrendingUp, title: 'Rapports', desc: 'Journaliers et mensuels' },
          ].map((f, i) => (
            <div key={i} className="card p-6 text-center">
              <f.icon className="w-12 h-12 mx-auto mb-4 text-primary-600" />
              <h4 className="font-bold text-gray-900 mb-2">{f.title}</h4>
              <p className="text-gray-600 text-sm">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
        <h3 className="text-3xl font-bold text-gray-900 text-center mb-12">Nos plans</h3>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { name: 'Starter', price: 'Gratuit', features: ['5 produits max', 'Caisse simple', 'Stock basique'] },
            { name: 'Pro', price: '1 000 FCFA/mois ou 10 000 FCFA/an', features: ['Produits illimités', 'Multi-utilisateurs', 'Rapports avancés'] },
            { name: 'Business', price: '3 000 FCFA/mois ou 30 000 FCFA/an', features: ['Tout de Pro', 'Multi-boutiques', 'Support prioritaire'] },
          ].map((p, i) => (
            <div key={i} className={`card p-8 ${i === 1 ? 'ring-2 ring-primary-600 scale-105' : ''}`}>
              <h4 className="text-2xl font-bold text-gray-900 mb-2">{p.name}</h4>
              <p className="text-3xl font-bold text-primary-600 mb-6">{p.price}</p>
              <ul className="space-y-2 mb-6">
                {p.features.map((f, j) => (
                  <li key={j} className="text-gray-600 flex items-center gap-2">
                    <span className="text-primary-600">✓</span> {f}
                  </li>
                ))}
              </ul>
              <Link to="/inscription" className="block text-center py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
                Choisir
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p>GestoCaisse — © 2026. Tous droits réservés.</p>
        </div>
      </footer>
    </div>
  );
}
