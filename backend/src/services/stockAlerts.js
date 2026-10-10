const { supabase } = require('../database/supabase');
const { sendEmail } = require('./email');

const notifierStockFaible = async (boutiqueId, produits) => {
  const alertes = (produits || []).filter((p) => Number(p.stock_actuel) <= Number(p.stock_minimum));
  if (!boutiqueId || alertes.length === 0) return [];

  const [{ data: boutique }, { data: utilisateurs }] = await Promise.all([
    supabase.from('boutiques').select('nom').eq('id', boutiqueId).maybeSingle(),
    supabase.from('users').select('id,email,prenom,role').eq('boutique_id', boutiqueId).eq('actif', true),
  ]);

  const destinataires = (utilisateurs || []).filter((u) =>
    ['proprietaire', 'admin'].includes(u.role) && u.email
  );
  if (destinataires.length === 0 && process.env.EMAIL_USER) {
    destinataires.push({ email: process.env.EMAIL_USER, prenom: 'Responsable' });
  }
  const created = [];

  for (const produit of alertes) {
    const titre = `Stock faible: ${produit.nom}`;
    const message = `Stock actuel ${produit.stock_actuel} ${produit.unite}, minimum ${produit.stock_minimum}.`;
    const { data: recentes } = await supabase
      .from('notifications')
      .select('id, statut, sent_at')
      .eq('boutique_id', boutiqueId)
      .eq('type', 'stock_faible')
      .eq('titre', titre)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(1);

    const recente = recentes?.[0];
    if (recente?.sent_at || recente?.statut === 'sent') continue;

    let notification = recente;
    if (!notification) {
      const result = await supabase.from('notifications').insert({
        boutique_id: boutiqueId,
        type: 'stock_faible',
        canal: 'app',
        destinataire: destinataires.map((u) => u.email).join(', '),
        titre,
        message,
      }).select().single();
      notification = result.data;
      if (result.error) {
        console.error('[Stock alert] Notification impossible:', result.error.message);
        continue;
      }
    }

    let envoyes = 0;
    for (const utilisateur of destinataires) {
      if (await sendEmail(utilisateur.email, 'alerteStock', utilisateur.prenom, [produit], boutique?.nom || 'votre boutique')) {
        envoyes += 1;
      }
    }
    if (envoyes > 0) {
      await supabase.from('notifications').update({
        statut: 'sent',
        sent_at: new Date().toISOString(),
        erreur: '',
      }).eq('id', notification.id);
      notification.statut = 'sent';
      notification.sent_at = new Date().toISOString();
      notification.erreur = '';
    } else {
      await supabase.from('notifications').update({
        statut: 'pending',
        erreur: 'Email non envoyé. Vérifiez la configuration Gmail.',
      }).eq('id', notification.id);
      notification.statut = 'pending';
      notification.erreur = 'Email non envoyé. Vérifiez la configuration Gmail.';
    }
    created.push(notification);
  }

  return created;
};

module.exports = { notifierStockFaible };
