import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Loader2, LogIn } from 'lucide-react';

export default function Connexion() {
  const { connexion, loading } = useAuthStore();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email:'', mot_de_passe:'' });
  const [showPwd, setShowPwd] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const r = await connexion(form.email, form.mot_de_passe);
    if (r?.success) {
      // Récupérer l'utilisateur stocké pour connaître son rôle
      const userStr = localStorage.getItem('gc_user');
      const user = userStr ? JSON.parse(userStr) : null;
      const redirectPath = user?.role === 'admin' ? '/app/admin' : '/app';
      navigate(redirectPath);
      toast.success('Bienvenue !');
    }
    else toast.error(r?.message || 'Identifiants incorrects');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center p-4">
      {/* Decoration fond */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-200 rounded-full opacity-20 blur-3xl"/>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-teal-200 rounded-full opacity-20 blur-3xl"/>
      </div>

      <div className="w-full max-w-md relative slide-up">
        <div className="text-center mb-8">
          <Link to="/" className="inline-block">
            <span className="text-3xl font-extrabold text-gray-900">Gesto<span className="text-emerald-600">Caisse</span></span>
          </Link>
          <p className="text-gray-500 mt-1 text-sm">Votre boutique, sous controle</p>
        </div>

        <div className="card p-8 shadow-xl border-0">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Connexion</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email</label>
              <input type="email" className="input" placeholder="votre@email.com"
                value={form.email} onChange={e=>setForm({...form,email:e.target.value})} required/>
            </div>
            <div>
              <label className="label">Mot de passe</label>
              <div className="relative">
                <input type={showPwd ? 'text' : 'password'} className="input pr-11"
                  placeholder="........" value={form.mot_de_passe}
                  onChange={e=>setForm({...form,mot_de_passe:e.target.value})} required/>
                <button type="button" onClick={()=>setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                  {showPwd ? <EyeOff size={16}/> : <Eye size={16}/>}
                </button>
              </div>
              <div className="text-right mt-1.5">
                <Link to="/mot-de-passe-oublie" className="text-xs text-emerald-600 hover:underline font-semibold">Mot de passe oublie ?</Link>
              </div>
            </div>
            <button type="submit" disabled={loading}
              className="btn btn-primary btn-lg w-full mt-2 shadow-lg shadow-emerald-200">
              {loading ? <><Loader2 size={18} className="animate-spin"/>Connexion en cours...</> :
               <><LogIn size={18}/>Se connecter</>}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Pas encore de compte ?{' '}
            <Link to="/inscription" className="text-emerald-600 font-bold hover:underline">Creer un compte gratuit</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
