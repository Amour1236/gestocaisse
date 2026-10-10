const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const { createClient } = require('@supabase/supabase-js');

if (!process.env.SUPABASE_URL) {
  console.error('\n❌ ERREUR: SUPABASE_URL manquant dans backend/.env');
  process.exit(1);
}
if (!process.env.SUPABASE_SERVICE_KEY) {
  console.error('\n❌ ERREUR: SUPABASE_SERVICE_KEY manquant dans backend/.env');
  process.exit(1);
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

module.exports = { supabase };
