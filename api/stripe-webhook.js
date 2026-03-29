// Vercel Edge Function — Stripe Webhook Handler
// Set STRIPE_WEBHOOK_SECRET in Vercel environment variables

export const config = { runtime: 'edge' };

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

    // In production, verify the webhook signature here using Stripe's crypto
    // For now, we parse and handle the event types

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
