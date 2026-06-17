import { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Loader2, CheckCircle2, ArrowLeft, Mail, Lock } from 'lucide-react';

interface ResetPasswordProps {
  mode?: 'request' | 'reset';
}

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export default function ResetPassword({ mode }: ResetPasswordProps) {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [email, setEmail] = useState('');
  const [form, setForm] = useState({ mot_de_passe: '', confirm: '' });
  const isRequest = mode === 'request' || !token;

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch(`${API_URL}/auth/mot-de-passe-oublie`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      setDone(true);
    } catch {
      toast.error('Erreur lors de l\'envoi. Réessayez.');
    }
    setLoading(false);
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.mot_de_passe !== form.confirm) return toast.error('Mots de passe differents');
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/reset-password/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mot_de_passe: form.mot_de_passe }),
      });
      const data = await res.json();
      if (data.success) {
        setDone(true);
        setTimeout(() => navigate('/connexion'), 2000);
      } else {
        toast.error(data.message || 'Lien invalide ou expire.');
      }
    } catch {
      toast.error('Lien invalide ou expire.');
    }
    setLoading(false);
  };

  const bg = 'min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center p-4';

  if (done) return (
    <div className={bg}>
      <div className="card p-10 text-center max-w-md w-full slide-up shadow-xl border-0">
        <CheckCircle2 size={56} className="text-emerald-600 mx-auto mb-4 bounce-in" />
        <h2 className="text-2xl font-bold mb-2">
          {isRequest ? 'Email envoye !' : 'Mot de passe reinitialise !'}
        </h2>
        <p className="text-gray-500 mb-6">
          {isRequest ? `Verifiez ${email} et cliquez sur le lien.` : 'Vous allez etre redirige vers la connexion...'}
        </p>
        <Link to="/connexion" className="btn btn-primary btn-lg w-full">Aller a la connexion</Link>
      </div>
    </div>
  );

  return (
    <div className={bg}>
      <div className="w-full max-w-md slide-up">
        <div className="text-center mb-8">
          <Link to="/" className="text-3xl font-extrabold text-gray-900">
            Gesto<span className="text-emerald-600">Caisse</span>
          </Link>
        </div>
        <div className="card p-8 shadow-xl border-0">
          <Link to="/connexion" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-5 transition-colors">
            <ArrowLeft size={14} /> Retour a la connexion
          </Link>
          {isRequest ? (
            <>
              <div className="flex items-center justify-center w-14 h-14 bg-emerald-100 rounded-2xl mb-4">
                <Mail size={24} className="text-emerald-600" />
              </div>
              <h2 className="text-xl font-bold mb-2">Mot de passe oublie ?</h2>
              <p className="text-gray-500 text-sm mb-5">
                Entrez votre email, nous vous enverrons un lien de reinitialisation.
              </p>
              <form onSubmit={handleRequest} className="space-y-4">
                <div>
                  <label className="label">Email</label>
                  <input
                    type="email" className="input" placeholder="votre@email.com"
                    value={email} onChange={(e) => setEmail(e.target.value)} required
                  />
                </div>
                <button type="submit" disabled={loading} className="btn btn-primary btn-lg w-full">
                  {loading ? <><Loader2 size={18} className="animate-spin" />Envoi...</> : 'Envoyer le lien'}
                </button>
              </form>
            </>
          ) : (
            <>
              <div className="flex items-center justify-center w-14 h-14 bg-emerald-100 rounded-2xl mb-4">
                <Lock size={24} className="text-emerald-600" />
              </div>
              <h2 className="text-xl font-bold mb-5">Nouveau mot de passe</h2>
              <form onSubmit={handleReset} className="space-y-4">
                <div>
                  <label className="label">Nouveau mot de passe</label>
                  <input
                    type="password" className="input" placeholder="Min. 6 caracteres"
                    value={form.mot_de_passe} onChange={(e) => setForm({ ...form, mot_de_passe: e.target.value })} required
                  />
                </div>
                <div>
                  <label className="label">Confirmer</label>
                  <input
                    type="password" className="input"
                    value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} required
                  />
                </div>
                <button type="submit" disabled={loading} className="btn btn-primary btn-lg w-full">
                  {loading
                    ? <><Loader2 size={18} className="animate-spin" />Enregistrement...</>
                    : 'Changer le mot de passe'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
