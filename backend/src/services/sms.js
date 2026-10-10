/**
 * Service d'envoi de SMS — GestoCaisse
 * Supporte : Africa's Talking (Afrique) / Twilio (mondial)
 *
 * Configurez dans .env :
 *   SMS_PROVIDER=africastalking | twilio
 *   AFRICASTALKING_USERNAME=...
 *   AFRICASTALKING_API_KEY=...
 *   TWILIO_ACCOUNT_SID=...
 *   TWILIO_AUTH_TOKEN=...
 *   TWILIO_PHONE_NUMBER=+1...
 */

const https = require('https');
const http = require('http');

// ─── Helpers HTTP ─────────────────────────────────────────────────────────────
const httpRequest = (url, options = {}, body = null) =>
  new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const req = lib.request(url, { method: options.method || 'GET', headers: options.headers || {} }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, data }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(typeof body === 'string' ? body : JSON.stringify(body));
    req.end();
  });

// ─── Africa's Talking ─────────────────────────────────────────────────────────
const sendViaAfricastalking = async ({ to, message }) => {
  const { AFRICASTALKING_USERNAME, AFRICASTALKING_API_KEY } = process.env;
  if (!AFRICASTALKING_USERNAME || !AFRICASTALKING_API_KEY) {
    throw new Error("Clés Africa's Talking non configurées.");
  }

  // Africa's Talking utilise le format international (sans + pour certains pays africains)
  // Normalise : 229XXXXXXXX → 229XXXXXXXX
  const phone = to.replace(/^\+/, '');

  const body = new URLSearchParams({
    username: AFRICASTALKING_USERNAME,
    to: phone,
    message,
  }).toString();

  const result = await httpRequest(
    `https://api.africastalking.com/version1/messaging`,
    {
      method: 'POST',
      headers: {
        'ApiKey': AFRICASTALKING_API_KEY,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    },
    body
  );

  if (result.status !== 201 && result.status !== 200) {
    throw new Error(`Africa's Talking error: ${result.data}`);
  }

  return { provider: 'africastalking', id: result.data?.SMSMessageData?.Messages?.[0]?.messageId || 'ok' };
};

// ─── Twilio ──────────────────────────────────────────────────────────────────
const sendViaTwilio = async ({ to, message }) => {
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER } = process.env;
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
    throw new Error('Twilio non configuré (TWILIO_ACCOUNT_SID / AUTH_TOKEN / PHONE_NUMBER).');
  }

  const credentials = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');
  const phone = to.startsWith('+') ? to : `+${to}`;

  const result = await httpRequest(
    `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    },
    new URLSearchParams({ To: phone, From: TWILIO_PHONE_NUMBER, Body: message }).toString()
  );

  if (result.status !== 201) {
    throw new Error(`Twilio error: ${result.data?.message || result.data}`);
  }

  return { provider: 'twilio', id: result.data?.sid || 'ok' };
};

// ─── WhatsApp via Twilio ─────────────────────────────────────────────────────
// Nécessite un numéro WhatsApp Business validé sur Twilio
const sendWhatsAppViaTwilio = async ({ to, message }) => {
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM } = process.env;
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_WHATSAPP_FROM) {
    throw new Error('Twilio WhatsApp non configuré (TWILIO_WHATSAPP_FROM requis).');
  }

  const credentials = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');
  const phone = to.startsWith('+') ? to : `+${to}`;

  // Numéro WhatsApp doit commencer par whatsapp:
  const from = TWILIO_WHATSAPP_FROM.startsWith('whatsapp:')
    ? TWILIO_WHATSAPP_FROM
    : `whatsapp:${TWILIO_WHATSAPP_FROM}`;

  const result = await httpRequest(
    `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    },
    new URLSearchParams({ To: `whatsapp:${phone}`, From: from, Body: message }).toString()
  );

  if (result.status !== 201) {
    throw new Error(`Twilio WhatsApp error: ${result.data?.message || result.data}`);
  }

  return { provider: 'twilio_whatsapp', id: result.data?.sid || 'ok' };
};

// ─── API publique ────────────────────────────────────────────────────────────
const sms = {
  /**
   * Envoie un SMS au numéro donné.
   * @param {string} to - Numéro au format international (229XXXXXXXX)
   * @param {string} message - Contenu du message
   */
  async envoyer({ to, message }) {
    const provider = process.env.SMS_PROVIDER || 'africastalking';
    if (provider === 'twilio') return sendViaTwilio({ to, message });
    return sendViaAfricastalking({ to, message });
  },

  /**
   * Envoie un message WhatsApp.
   * @param {string} to - Numéro au format international
   * @param {string} message - Contenu (max 4096 caractères)
   */
  async envoyerWhatsApp({ to, message }) {
    return sendWhatsAppViaTwilio({ to, message });
  },

  /**
   * Vérifie si au moins un provider est configuré.
   */
  estConfigure() {
    const { SMS_PROVIDER, AFRICASTALKING_API_KEY, TWILIO_ACCOUNT_SID } = process.env;
    if (SMS_PROVIDER === 'twilio') return !!TWILIO_ACCOUNT_SID;
    return !!AFRICASTALKING_API_KEY;
  },

  whatsappEstConfigure() {
    const { TWILIO_ACCOUNT_SID, TWILIO_WHATSAPP_FROM } = process.env;
    return !!TWILIO_ACCOUNT_SID && !!TWILIO_WHATSAPP_FROM;
  },
};

module.exports = sms;
