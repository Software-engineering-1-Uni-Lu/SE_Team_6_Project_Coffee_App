/**
 * Payment service abstraction.
 *
 * Currently uses a mock implementation that simulates payment processing.
 * Structured so real Stripe can be swapped in by implementing the
 * PaymentService interface with the Stripe SDK.
 *
 * TODO: To integrate real Stripe:
 * 1. npm install stripe @stripe/stripe-js @stripe/react-stripe-js
 * 2. Replace MockPaymentService with StripePaymentService
 * 3. Set STRIPE_SECRET_KEY and NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY env vars
 * 4. Enable the webhook signature verification in handleWebhook()
 */

export interface PaymentIntent {
  id: string;
  clientSecret: string;
  amount: number;
  currency: string;
  status:
    | "requires_payment_method"
    | "requires_confirmation"
    | "succeeded"
    | "canceled";
}

export interface PaymentService {
  createPaymentIntent(
    amount: number,
    currency?: string
  ): Promise<PaymentIntent>;
  confirmPayment(paymentIntentId: string): Promise<PaymentIntent>;
  handleWebhook(
    payload: string,
    signature: string
  ): Promise<{ type: string; paymentIntentId: string }>;
}

/**
 * Mock payment service for development/testing.
 * Simulates Stripe-like behavior with a small delay.
 */
class MockPaymentService implements PaymentService {
  async createPaymentIntent(
    amount: number,
    currency = "eur"
  ): Promise<PaymentIntent> {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 300));

    const id = `pi_mock_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const clientSecret = `${id}_secret_${Math.random().toString(36).slice(2, 15)}`;

    return {
      id,
      clientSecret,
      amount,
      currency,
      status: "requires_confirmation",
    };
  }

  async confirmPayment(paymentIntentId: string): Promise<PaymentIntent> {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    return {
      id: paymentIntentId,
      clientSecret: `${paymentIntentId}_secret_confirmed`,
      amount: 0,
      currency: "eur",
      status: "succeeded",
    };
  }

  async handleWebhook(
    payload: string,
    _signature: string
  ): Promise<{ type: string; paymentIntentId: string }> {
    // TODO: When using real Stripe, verify signature with:
    // const event = stripe.webhooks.constructEvent(payload, signature, endpointSecret);

    const event = JSON.parse(payload);
    return {
      type: event.type || "payment_intent.succeeded",
      paymentIntentId: event.data?.object?.id || "",
    };
  }
}

// Export a singleton instance - swap MockPaymentService for real Stripe here
export const paymentService: PaymentService = new MockPaymentService();
