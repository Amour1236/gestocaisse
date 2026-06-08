import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Loader2, Store, ArrowRight, Check } from 'lucide-react';

const steps = ['Identite', 'Boutique', 'Securite'];

export default function Inscription() {
  const navigate = useNavigate();
  const { loginWithToken } = useAuthStore();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [form, setForm] = useState({ prenom:'', nom:'', email:'', nom_boutique:'', mot_de_passe:'', confirm_mot_de_passe:'' });
  const upd = (k,v) => setForm(f => ({...f, [k]:v}));

  const nextStep = (e) => {
    e.preventDefault();
    if (step === 0 && (!form.prenom || !form.nom || !form.email)) return toast.error('Remplissez tous les champs.');
    if (step === 0 && !/\S+@\S+\.\S+/.test(form.email)) return toast.error('Email invalide.');
    if (step === 1 && !form.nom_boutique) return toast.error('Entrez le nom de votre boutique.');
    if (step < 2) { setStep(s => s+1); return; }
    handleSubmit();
  };

  const handleSubmit = async () => {
    if (!form.mot_de_passe || form.mot_de_passe.length < 6) return toast.error('Mot de passe min. 6 caracteres.');
    if (form.mot_de_passe !== form.confirm_mot_de_passe) return toast.error('Les mots de passe ne correspondent pas.');
    setLoading(true);
    try {
      const { data } = await authAPI.inscription(form);
      if (data.success && data.token) {
        loginWithToken(data.token, data.user);
        toast.success('Bienvenue sur GestoCaisse !', { duration: 4000 });
        navigate('/app');
      } else {
        toast.error(data.message || 'Erreur.');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur serveur.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md slide-up">

        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-block">
            <span className="text-3xl font-extrabold text-gray-900 hover:opacity-80 transition-opacity">
              Gesto<span className="text-emerald-600">Caisse</span>
            </span>
          </Link>
          <p className="text-gray-500 mt-1 text-sm">Commencez gratuitement - aucune carte bancaire</p>
        </div>

        <div className="card p-8 shadow-xl border-0">
          {/* Progress steps */}
          <div className="flex items-center justify-between mb-8">
            {steps.map((s, i) => (
              <React.Fragment key={i}>
                <div className="flex flex-col items-center gap-1">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                    i < step ? 'bg-emerald-600 text-white scale-90' :
                    i === step ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200 scale-110' :
                    'bg-gray-100 text-gray-400'
                  }`}>
                    {i < step ? <Check size={16}/> : i+1}
                  </div>
                  <span className={`text-xs font-semibold ${i === step ? 'text-emerald-600' : 'text-gray-400'}`}>{s}</span>
                </div>
                {i < steps.length-1 && (
                  <div className={`flex-1 h-0.5 mx-2 mb-4 transition-all duration-500 ${i < step ? 'bg-emerald-600' : 'bg-gray-200'}`}/>
                )}
              </React.Fragment>
            ))}
          </div>

          <form onSubmit={nextStep} className="space-y-4">
            {/* Step 0 - Identite */}
            {step === 0 && (
              <div className="fade-in space-y-4">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Qui etes-vous ?</h2>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Prenom</label>
                    <input className="input" placeholder="Kofi" value={form.prenom} onChange={e=>upd('prenom',e.target.value)} required/>
                  </div>
                  <div>
                    <label className="label">Nom</label>
                    <input className="input" placeholder="Agbo" value={form.nom} onChange={e=>upd('nom',e.target.value)} required/>
                  </div>
                </div>
                <div>
                  <label className="label">Adresse email</label>
                  <input type="email" className="input" placeholder="kofi@gmail.com" value={form.email} onChange={e=>upd('email',e.target.value)} required/>
                </div>
              </div>
            )}

            {/* Step 1 - Boutique */}
            {step === 1 && (
              <div className="fade-in space-y-4">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Votre boutique</h2>
                <div className="flex items-center justify-center w-16 h-16 bg-emerald-100 rounded-2xl mx-auto mb-4">
                  <Store size={28} className="text-emerald-600"/>
                </div>
                <div>
                  <label className="label">Nom de votre boutique</label>
                  <input className="input text-lg font-semibold" placeholder="Ex: Epicerie Chez Mama" value={form.nom_boutique} onChange={e=>upd('nom_boutique',e.target.value)} required/>
                  <p className="text-xs text-gray-400 mt-1">Ce nom apparaitra sur vos tickets de caisse.</p>
                </div>
              </div>
            )}

            {/* Step 2 - Mot de passe */}
            {step === 2 && (
              <div className="fade-in space-y-4">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Securisez votre compte</h2>
                <div>
                  <label className="label">Mot de passe</label>
                  <div className="relative">
                    <input type={showPwd ? 'text' : 'password'} className="input pr-11"
                      placeholder="Min. 6 caracteres" value={form.mot_de_passe} onChange={e=>upd('mot_de_passe',e.target.value)} required/>
                    <button type="button" onClick={()=>setShowPwd(!showPwd)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPwd ? <EyeOff size={16}/> : <Eye size={16}/>}
                    </button>
                  </div>
                  {form.mot_de_passe && (
                    <div className="flex gap-1 mt-2">
                      {[form.mot_de_passe.length>=6, /[A-Z]/.test(form.mot_de_passe), /[0-9]/.test(form.mot_de_passe)].map((ok,i) => (
                        <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${ok ? 'bg-emerald-500' : 'bg-gray-200'}`}/>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <label className="label">Confirmer le mot de passe</label>
                  <input type="password" className={`input ${form.confirm_mot_de_passe && form.confirm_mot_de_passe !== form.mot_de_passe ? 'input-error' : ''}`}
                    placeholder="Repetez le mot de passe" value={form.confirm_mot_de_passe} onChange={e=>upd('confirm_mot_de_passe',e.target.value)} required/>
                  {form.confirm_mot_de_passe && form.confirm_mot_de_passe === form.mot_de_passe && (
                    <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1"><Check size={12}/> Mots de passe identiques</p>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              {step > 0 && (
                <button type="button" onClick={() => setStep(s=>s-1)}
                  className="btn btn-secondary btn-lg flex-1">Retour</button>
              )}
              <button type="submit" disabled={loading}
                className="btn btn-primary btn-lg flex-1">
                {loading ? <><Loader2 size={18} className="animate-spin"/>Creation...</> :
                 step < 2 ? <span className="flex items-center gap-2">Continuer <ArrowRight size={16}/></span> :
                 'Creer mon compte'}
              </button>
            </div>
          </form>

          <p className="text-center text-sm text-gray-500 mt-5">
            Deja un compte ? <Link to="/connexion" className="text-emerald-600 font-semibold hover:underline">Se connecter</Link>
          </p>
        </div>
        <p className="text-center text-xs text-gray-400 mt-4">GestoCaisse — © 2026. Tous droits réservés.</p>
      </div>
    </div>
  );
}
