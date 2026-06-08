const { createClient } = require('@supabase/supabase-js');

if (!process.env.SUPABASE_URL || process.env.SUPABASE_SERVICE_KEY === 'COLLER_VOTRE_SERVICE_KEY_ICI') {
  console.error('\n❌ ERREUR: Configurez SUPABASE_URL et SUPABASE_SERVICE_KEY dans backend/.env');
  console.error('   Lisez le README.md pour savoir où trouver ces clés.\n');
}

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || ''
);

module.exports = { supabase };
