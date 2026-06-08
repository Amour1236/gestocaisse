const { supabase } = require('../database/supabase');

const auditLog = async (req, { action, entity, entity_id = null, before_data = null, after_data = null }) => {
  try {
    await supabase.from('audit_logs').insert({
      boutique_id: req.boutique_id || null,
      user_id: req.user?.id || null,
      action,
      entity,
      entity_id: entity_id ? String(entity_id) : null,
      before_data,
      after_data,
      ip: req.ip,
      user_agent: req.headers['user-agent'] || '',
    });
  } catch (err) {
    console.error('[audit]', err.message);
  }
};

module.exports = { auditLog };
