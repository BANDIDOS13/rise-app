// FORGE Email API — Resend Integration
// Handles: welcome, payment confirmation, streak danger, win-back, weekly recap
// Environment: RESEND_API_KEY, FORGE_FROM_EMAIL (default: noreply@forge-app.com)

export const config = { runtime: 'nodejs' };

const TEMPLATES = {
  welcome: {
    subject: 'Bienvenue sur FORGE 🔥',
    html: (data) => `
      <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;background:#07080a;color:#f0ece4;padding:40px 30px;border-radius:16px">
        <div style="text-align:center;margin-bottom:24px">
          <div style="font-size:36px;font-weight:800;letter-spacing:4px;color:#d4aa4a">FORGE</div>
          <div style="font-size:12px;color:#8a9099;margin-top:4px">Forge ta meilleure version</div>
        </div>
        <h1 style="font-size:22px;color:#f0ece4;margin-bottom:12px">Bienvenue ${data.name || 'Forgeur'} !</h1>
        <p style="color:#8a9099;line-height:1.7;margin-bottom:20px">Tu viens de rejoindre FORGE. Ton mentor IA JARVIS t'attend. Commence par ton check-in du jour pour gagner tes premiers XP.</p>
        <div style="background:#111418;border:1px solid #1e252e;border-radius:10px;padding:16px;margin-bottom:20px">
          <div style="font-weight:700;color:#d4aa4a;margin-bottom:8px">Tes premiers pas :</div>
          <div style="color:#8a9099;font-size:14px;line-height:1.8">
            1. Fais ton check-in du matin ☀️<br>
            2. Complète 3 quêtes du jour ⚡<br>
            3. Parle à JARVIS pour ton plan personnalisé 🤖
          </div>
        </div>
        <a href="https://forge-app.com" style="display:block;text-align:center;padding:14px 28px;background:linear-gradient(135deg,#d4aa4a,#e8c86a);color:#07080a;font-weight:700;border-radius:8px;text-decoration:none;margin-bottom:16px">Ouvrir FORGE →</a>
        <p style="font-size:11px;color:#424b57;text-align:center">Tu reçois cet email car tu t'es inscrit sur FORGE.<br><a href="https://forge-app.com/privacy" style="color:#d4aa4a">Politique de confidentialité</a></p>
      </div>`,
  },
  payment_success: {
    subject: 'FORGE Premium activé ✅',
    html: (data) => `
      <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;background:#07080a;color:#f0ece4;padding:40px 30px;border-radius:16px">
        <div style="text-align:center;margin-bottom:24px">
          <div style="font-size:36px;font-weight:800;letter-spacing:4px;color:#d4aa4a">FORGE</div>
        </div>
        <h1 style="font-size:22px;color:#f0ece4;margin-bottom:12px">Plan ${data.plan || 'Premium'} activé ! 👑</h1>
        <p style="color:#8a9099;line-height:1.7;margin-bottom:20px">Merci ${data.name || 'Forgeur'}. Tu as maintenant accès à toutes les fonctionnalités Pro. Coach IA illimité, 12 formations, guildes, et plus.</p>
        <a href="https://forge-app.com" style="display:block;text-align:center;padding:14px 28px;background:linear-gradient(135deg,#d4aa4a,#e8c86a);color:#07080a;font-weight:700;border-radius:8px;text-decoration:none">Explorer les fonctionnalités Pro →</a>
      </div>`,
  },
  streak_danger: {
    subject: 'Ta streak FORGE est en danger 🔥',
    html: (data) => `
      <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;background:#07080a;color:#f0ece4;padding:40px 30px;border-radius:16px">
        <div style="text-align:center;margin-bottom:24px">
          <div style="font-size:36px;font-weight:800;letter-spacing:4px;color:#d4aa4a">FORGE</div>
        </div>
        <h1 style="font-size:22px;color:#e0874a;margin-bottom:12px">${data.streak || 0} jours de suite — ne lâche pas ! 🔥</h1>
        <p style="color:#8a9099;line-height:1.7;margin-bottom:20px">Tu n'as pas encore fait ton check-in aujourd'hui. Un quick check-in prend 30 secondes et préserve ta série.</p>
        <a href="https://forge-app.com" style="display:block;text-align:center;padding:14px 28px;background:linear-gradient(135deg,#e0874a,#f0a870);color:#07080a;font-weight:700;border-radius:8px;text-decoration:none">Faire mon check-in →</a>
      </div>`,
  },
  winback: {
    subject: 'Tu nous manques sur FORGE',
    html: (data) => `
      <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;background:#07080a;color:#f0ece4;padding:40px 30px;border-radius:16px">
        <div style="text-align:center;margin-bottom:24px">
          <div style="font-size:36px;font-weight:800;letter-spacing:4px;color:#d4aa4a">FORGE</div>
        </div>
        <h1 style="font-size:22px;color:#f0ece4;margin-bottom:12px">Ça fait ${data.days || 3} jours...</h1>
        <p style="color:#8a9099;line-height:1.7;margin-bottom:20px">Chaque jour sans progrès est un jour de retard. JARVIS a préparé un plan de retour personnalisé pour toi.</p>
        <a href="https://forge-app.com" style="display:block;text-align:center;padding:14px 28px;background:linear-gradient(135deg,#d4aa4a,#e8c86a);color:#07080a;font-weight:700;border-radius:8px;text-decoration:none">Reprendre ma progression →</a>
        <p style="font-size:11px;color:#424b57;text-align:center;margin-top:16px"><a href="https://forge-app.com/privacy" style="color:#d4aa4a">Se désinscrire</a></p>
      </div>`,
  },
};

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' } });
  }
  if (req.method !== 'POST') {
    return resp({ error: 'Method not allowed' }, 405);
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return resp({ error: 'Email not configured', offline: true }, 503);
  }

  try {
    const { template, to, data } = await req.json();

    if (!template || !to || !TEMPLATES[template]) {
      return resp({ error: 'Invalid template or recipient' }, 400);
    }

    const tmpl = TEMPLATES[template];
    const from = process.env.FORGE_FROM_EMAIL || 'FORGE <noreply@forge-app.com>';

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        from,
        to: [to],
        subject: tmpl.subject,
        html: tmpl.html(data || {}),
      }),
    });

    const result = await res.json();
    if (result.error) return resp({ error: result.error.message }, 400);
    return resp({ ok: true, id: result.id });
  } catch (err) {
    return resp({ error: 'Email error' }, 500);
  }
}

function resp(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
}
