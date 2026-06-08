const jwt = require('jsonwebtoken');
const { supabase } = require('../database/supabase');

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

const checkPlan = (planRequis) => async (req, res, next) => {
  try {
    const plans = { starter: 0, pro: 1, business: 2 };
    const boutiquePlan = req.user?.boutique?.plan;

    const { data, error } = await supabase
      .from('boutiques')
      .select('plan')
      .eq('id', req.boutique_id)
      .maybeSingle();

    if (error) throw error;

    const plan = data?.plan || boutiquePlan || 'starter';
    if ((plans[plan] || 0) < (plans[planRequis] || 0)) {
      return res.status(402).json({
        success: false,
        message: `Fonctionnalité réservée au plan ${planRequis}.`,
        requireUpgrade: true,
        planRequis,
      });
    }

    next();
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { proteger, autoriser, checkPlan };
