// Vercel Edge Function — Stripe Webhook Handler
// Set STRIPE_WEBHOOK_SECRET in Vercel environment variables

export const config = { runtime: 'edge' };

async function verifyStripeSignature(body, sig, secret) {
  const parts = Object.fromEntries(sig.split(',').map(p => { const [k, v] = p.split('='); return [k, v]; }));
  const timestamp = parts.t;
  const v1 = parts.v1;
  if (!timestamp || !v1) throw new Error('Invalid signature format');
  // Reject timestamps older than 5 minutes to prevent replay attacks
  if (Math.abs(Date.now() / 1000 - parseInt(timestamp)) > 300) throw new Error('Timestamp too old');
  const payload = `${timestamp}.${body}`;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  const expected = Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('');
  if (expected !== v1) throw new Error('Signature mismatch');
}

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
  if (!WEBHOOK_SECRET) {
    return new Response('Webhook not configured', { status: 503 });
  }

  try {
    const body = await req.text();
    const sig = req.headers.get('stripe-signature');

    if (!sig) {
      return new Response('Missing stripe-signature header', { status: 400 });
    }

    await verifyStripeSignature(body, sig, WEBHOOK_SECRET);

    const event = JSON.parse(body);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        // User completed checkout — plan activated client-side via success_url
        console.log('Checkout completed:', session.client_reference_id, session.metadata?.plan);
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object;
        console.log('Subscription updated:', sub.id, 'status:', sub.status);
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        console.log('Subscription cancelled:', sub.id);
        // Could trigger win-back email here via email service API
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        console.log('Payment failed:', invoice.customer);
        // Could trigger dunning email here
        break;
      }

      default:
        console.log('Unhandled event:', event.type);
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 });
  } catch (err) {
    return new Response('Webhook error', { status: 400 });
  }
}
