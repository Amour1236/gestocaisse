const jwt = require('jsonwebtoken');
const { supabase } = require('../database/supabase');

const getEffectivePlan = (plan, expireAt, userRole = null) => {
  const basePlan = plan || 'starter';
  if (!expireAt) return basePlan;

  const expiration = new Date(expireAt);
  if (Number.isNaN(expiration.getTime())) return basePlan;

  return expiration.getTime() <= Date.now() ? 'starter' : basePlan;
};

const proteger = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Token manquant.' });
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const { data: user, error } = await supabase
      .from('users').select('*').eq('id', decoded.id).eq('actif', true).maybeSingle();

    if (error || !user) {
      return res.status(401).json({ success: false, message: 'Utilisateur introuvable.' });
    }
    delete user.mot_de_passe;
    req.user = user;
    req.boutique_id = user.boutique_id;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Token invalide ou expiré.' });
  }
};

const autoriser = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Accès refusé.' });
  }
  next();
};

const ROLE_PERMISSIONS = {
  admin: ['*'],
  proprietaire: ['gerer_caisse', 'voir_rapports', 'gerer_stock', 'gerer_produits', 'gerer_clients'],
  caissier: ['gerer_caisse', 'voir_rapports'],
};

const exigerPermission = (...permissions) => (req, res, next) => {
  const perms = ROLE_PERMISSIONS[req.user?.role] || [];
  const ok = perms.includes('*') || permissions.some(p => perms.includes(p));
  if (!ok) {
    return res.status(403).json({ success: false, message: 'Accès refusé.' });
  }
  next();
};

const checkPlan = (planRequis) => async (req, res, next) => {
  try {
    const plans = { starter: 0, pro: 1, business: 2 };

    const { data, error } = await supabase
      .from('boutiques')
      .select('plan, plan_expire_at')
      .eq('id', req.boutique_id)
      .maybeSingle();

    if (error) throw error;

    const plan = getEffectivePlan(data?.plan || 'starter', data?.plan_expire_at, req.user?.role);
    if (plan !== data?.plan && data?.plan && data?.plan !== 'starter') {
      await supabase.from('boutiques').update({ plan: 'starter' }).eq('id', req.boutique_id);
    }

    if ((plans[plan] || 0) < (plans[planRequis] || 0)) {
      return res.status(402).json({
        success: false,
        message: `Fonctionnalité réservée au plan ${planRequis}. Votre abonnement est expiré ou inférieur à ce niveau.`,
        requireUpgrade: true,
        planRequis,
      });
    }

    next();
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { proteger, autoriser, checkPlan, exigerPermission, getEffectivePlan };
