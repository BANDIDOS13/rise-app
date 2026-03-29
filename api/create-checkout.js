// Vercel Edge Function — Stripe Checkout Session Creator
// Set STRIPE_SECRET_KEY in Vercel environment variables to activate

export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  const STRIPE_KEY = process.env.STRIPE_SECRET_KEY;
  if (!STRIPE_KEY) {
    return new Response(JSON.stringify({ error: 'Stripe not configured' }), { status: 503 });
  }

  try {
    const { priceId, email, userId, planId } = await req.json();

    if (!priceId) {
      return new Response(JSON.stringify({ error: 'Missing priceId' }), { status: 400 });
    }

    const origin = req.headers.get('origin') || 'https://rise.app';

    // Create Stripe Checkout Session via API
    const params = new URLSearchParams();
    params.append('mode', 'subscription');
    params.append('payment_method_types[0]', 'card');
    params.append('line_items[0][price]', priceId);
    params.append('line_items[0][quantity]', '1');
    params.append('success_url', `${origin}/?payment=success&plan=${planId}`);
    params.append('cancel_url', `${origin}/?payment=cancelled`);
    params.append('allow_promotion_codes', 'true');
    params.append('billing_address_collection', 'auto');
    params.append('subscription_data[trial_period_days]', '7');
    if (email) params.append('customer_email', email);
    if (userId) params.append('client_reference_id', userId);
    params.append('metadata[plan]', planId || '');
    params.append('metadata[source]', 'rise-app-v9');

    const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${STRIPE_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const session = await response.json();

    if (session.error) {
      return new Response(JSON.stringify({ error: session.error.message }), { status: 400 });
    }

    return new Response(JSON.stringify({ sessionId: session.id }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Internal error' }), { status: 500 });
  }
}
