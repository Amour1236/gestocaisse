const nodemailer = require('nodemailer');

let transporter = null;
try {
  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });
  }
} catch {}

const wrap = (body) => `
<div style="font-family:sans-serif;background:#f3f4f6;padding:40px 20px;">
  <div style="max-width:580px;margin:0 auto;background:white;border-radius:16px;overflow:hidden;">
    <div style="background:linear-gradient(135deg,#059669,#0284c7);padding:24px;text-align:center;">
      <span style="font-size:26px;font-weight:900;color:white;">Gesto<span style="color:#fbbf24;">Caisse</span></span>
    </div>
    <div style="padding:32px;">${body}</div>
    <div style="background:#f9fafb;padding:16px;text-align:center;border-top:1px solid #e5e7eb;">
      <p style="color:#9ca3af;font-size:12px;margin:0;">© 2026 GestoCaisse</p>
    </div>
  </div>
</div>`;

const btn = (url, text) =>
  `<div style="text-align:center;margin:24px 0;">
    <a href="${url}" style="background:#059669;color:white;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:700;">
      ${text}
    </a>
  </div>`;

const TEMPLATES = {
  confirmEmail: (prenom, token, base) => ({
    subject: 'Confirmez votre email - GestoCaisse',
    html: wrap(`
      <h2>Bonjour ${prenom} ??</h2>
      <p>Confirmez votre email pour activer votre compte GestoCaisse.</p>
      ${btn(`${base}/confirmer-email/${token}`, 'Confirmer mon email')}
      <p style="color:#9ca3af;font-size:12px;text-align:center;">Lien valable 24h.</p>
    `),
  }),
  resetPassword: (prenom, token, base) => ({
    subject: 'Reinitialisation mot de passe - GestoCaisse',
    html: wrap(`
      <h2>Bonjour ${prenom},</h2>
      <p>Vous avez demande la reinitialisation de votre mot de passe.</p>
      ${btn(`${base}/reset-password/${token}`, 'Reinitialiser mon mot de passe')}
      <p style="color:#9ca3af;font-size:12px;text-align:center;">Lien valable 1 heure.</p>
    `),
  }),
  alerteStock: (prenom, produits, boutique) => ({
    subject: `?? Stocks faibles - ${boutique}`,
    html: wrap(`
      <h2>Alerte stock faible ??</h2>
      <p>Bonjour <strong>${prenom}</strong>, ${produits.length} produit(s) en stock faible dans <strong>${boutique}</strong> :</p>
      ${produits.map(p => `<div style="background:#fef3c7;border-radius:8px;padding:10px;margin:6px 0;">
        <strong>${p.nom}</strong> - Stock: <span style="color:#dc2626;font-weight:700;">${p.stock_actuel} ${p.unite}</span> (min: ${p.stock_minimum})
      </div>`).join('')}
    `),
  }),
  abonnementConfirme: (prenom, plan, fin, boutique) => ({
    subject: `Abonnement ${plan} active - GestoCaisse`,
    html: wrap(`
      <h2>Abonnement active ??</h2>
      <p>Bonjour <strong>${prenom}</strong>, votre abonnement <strong>${plan}</strong> pour <strong>${boutique}</strong> est actif jusqu'au <strong>${fin}</strong>.</p>
    `),
  }),
};

const sendEmail = async (to, tplName, ...args) => {
  if (!transporter) {
    console.log(`[Email - non configure] ${tplName} pour ${to}`);
    return false;
  }
  try {
    const tpl = TEMPLATES[tplName]?.(...args);
    if (!tpl) return false;
    await transporter.sendMail({ from: `GestoCaisse <${process.env.EMAIL_USER}>`, to, ...tpl });
    return true;
  } catch (err) {
    console.error(`[Email error - ${tplName}]:`, err.message);
    return false;
  }
};

module.exports = { sendEmail };
