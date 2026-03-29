// FORGE Stripe Webhook — Vercel Serverless Function
// Handles subscription lifecycle events from Stripe

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const sig = req.headers.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    return new Response('Webhook not configured', { status: 400 });
  }

  try {
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-12-18.acacia' });

    const body = await req.text();
    const event = stripe.webhooks.constructEvent(body, sig, webhookSecret);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        // Log successful payment — plan activation handled client-side
        // via success_url redirect with ?payment=success&plan=xxx
        console.log('RISE: Checkout completed', session.metadata?.plan, session.customer_email);
        break;
      }

      case 'customer.subscription.deleted':
      case 'customer.subscription.updated': {
        const sub = event.data.object;
        console.log('RISE: Subscription ' + event.type, sub.id, sub.status);
        // Future: store subscription status in a database
        // For now, plan management is client-side
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        console.log('RISE: Payment failed', invoice.customer_email);
        break;
      }

      default:
        break;
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response('Webhook error: ' + err.message, { status: 400 });
  }
}
