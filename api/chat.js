// FORGE AI Mentor (JARVIS) — Vercel Edge Function
export const config = { runtime: 'edge' };

const SYSTEM_PROMPT = `Tu es JARVIS, le mentor IA intégré dans FORGE — l'app qui transforme les intentions en progrès réels.

QUI TU ES:
- Un mentor, pas un coach. Un coach dit quoi faire. Un mentor croit en toi.
- Tu tutoies toujours. Tu parles comme quelqu'un qui connaît les doutes, les excuses, et les victoires.
- Expert en: corps, esprit, business, finances, productivité, bien-être, relations, nature.
- Tu es direct, encourageant sans être condescendant, ambitieux, humain, bref.

TA VOIX:
- Chaque mot compte. Les mots inutiles sont supprimés.
- Pas de phrases molles ("Continue comme ça!") ni corporatives ("Optimise ton potentiel").
- Pas de culpabilisation ("Tu n'as pas fait tes objectifs..."). Tu observes, tu ne juges pas.
- Tu donnes des conseils actionnables, concrets, avec des étapes claires.
- Tu termines par une question ou un défi — jamais par du vide.

RÈGLES:
- Jamais de réponse générique. Si tu ne sais pas, dis-le.
- Plan d'action concret quand c'est pertinent.
- Adapte-toi au profil (débutant vs avancé).
- Encourage mais ne mens jamais. La vérité respectueuse > le réconfort vide.
- Réponses en français sauf si on te parle en anglais.
- Maximum 250 mots par réponse. Concis et dense.
- Utilise des emojis avec parcimonie — un ou deux max, jamais en excès.

TA SIGNATURE:
"Je ne te dis pas quoi faire — je t'aide à faire ce que tu as déjà décidé de faire."`;

function getAllowedOrigin(req) {
  const origin = req.headers.get('origin') || '';
  const allowed = [/\.vercel\.app$/, /forge-app\.com$/, /localhost/];
  return allowed.some(p => p.test(origin)) ? origin : '';
}

export default async function handler(req) {
  _corsOrigin = getAllowedOrigin(req);
  if (req.method === 'OPTIONS') {
    const corsOrigin = _corsOrigin;
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': corsOrigin,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    const { message, context, history } = await req.json();

    // Input validation
    if (!message || typeof message !== 'string' || message.length > 2000) {
      return jsonResp({ error: 'Invalid message' }, 400);
    }
    if (history && history.length > 20) {
      return jsonResp({ error: 'History too long' }, 400);
    }

    const userContext = context
      ? `\n\nPROFIL: ${context.name || 'Champion'}, ${context.age || '?'} ans. Objectif: ${context.goal || 'all'}. Niveau: ${context.level || 1}. Streak: ${context.streak || 0} jours. XP: ${context.xp || 0}.`
      : '';

    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

    if (anthropicKey) {
      return await callClaude(anthropicKey, message, userContext, history || []);
    } else if (openaiKey) {
      return await callGPT(openaiKey, message, userContext, history || []);
    } else {
      return jsonResp({ reply: null, fallback: true, error: 'Service temporairement indisponible. JARVIS local prend le relais.' });
    }
  } catch (err) {
    return jsonResp({ reply: null, fallback: true, error: 'Une erreur est survenue. JARVIS local prend le relais.' }, 500);
  }
}

let _corsOrigin = '*';
function jsonResp(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': _corsOrigin || '*' },
  });
}

async function callClaude(apiKey, message, userContext, history) {
  const messages = [
    ...history.slice(-6).map(h => ({ role: h.role, content: h.content })),
    { role: 'user', content: message }
  ];

  const body = {
    model: 'claude-sonnet-4-6',
    max_tokens: 800,
    system: SYSTEM_PROMPT + userContext,
    messages,
  };

  let res;
  try {
    res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });
  } catch (fetchErr) {
    return jsonResp({ reply: null, fallback: true, error: 'Connexion au mentor IA impossible. JARVIS local prend le relais.' });
  }

  const data = await res.json();

  if (data.error) {
    return jsonResp({ reply: null, fallback: true, error: 'Le mentor IA est temporairement indisponible. JARVIS local prend le relais.' });
  }

  const reply = data.content?.[0]?.text || null;
  return jsonResp({ reply, fallback: !reply });
}

async function callGPT(apiKey, message, userContext, history) {
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT + userContext },
    ...history.slice(-6).map(h => ({ role: h.role, content: h.content })),
    { role: 'user', content: message }
  ];

  let res;
  try {
    res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model: 'gpt-4o', max_tokens: 800, messages }),
    });
  } catch (fetchErr) {
    return jsonResp({ reply: null, fallback: true, error: 'Connexion au mentor IA impossible. JARVIS local prend le relais.' });
  }

  const data = await res.json();

  if (data.error) {
    return jsonResp({ reply: null, fallback: true, error: 'Le mentor IA est temporairement indisponible. JARVIS local prend le relais.' });
  }

  const reply = data.choices?.[0]?.message?.content || null;
  return jsonResp({ reply, fallback: !reply });
      }
