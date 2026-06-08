import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';

export default function ConfirmerEmail() {
  const { token } = useParams();
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/auth/confirmer-email/${token}`)
      .then(r => r.json())
      .then(d => setStatus(d.success ? 'ok' : 'error'))
      .catch(() => setStatus('error'));
  }, [token]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center p-4">
      <div className="card p-10 text-center max-w-md w-full shadow-xl border-0 slide-up">
        {status === 'loading' && <><Loader2 size={48} className="animate-spin text-emerald-600 mx-auto mb-4"/><p className="text-gray-600 font-medium">Vérification en cours...</p></>}
        {status === 'ok' && <><CheckCircle2 size={56} className="text-emerald-600 mx-auto mb-4 bounce-in"/><h2 className="text-2xl font-bold mb-2">Email confirmé !</h2><p className="text-gray-500 mb-6">Votre compte est activé.</p><Link to="/connexion" className="btn btn-primary btn-lg w-full">Se connecter</Link></>}
        {status === 'error' && <><XCircle size={56} className="text-red-500 mx-auto mb-4"/><h2 className="text-2xl font-bold mb-2">Lien invalide</h2><p className="text-gray-500 mb-6">Ce lien est invalide ou déjà utilisé.</p><Link to="/connexion" className="btn btn-primary btn-lg w-full">Aller à la connexion</Link></>}
      </div>
    </div>
  );
}
