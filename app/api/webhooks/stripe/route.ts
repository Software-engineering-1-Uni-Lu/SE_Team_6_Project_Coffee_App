/**
 * POST /api/webhooks/stripe
 *
 * PURPOSE:
 * Handle Stripe webhook events for payment status updates.
 * Currently uses mock implementation; ready for real Stripe swap-in.
 *
 * TODO: When integrating real Stripe:
 * 1. Set STRIPE_WEBHOOK_SECRET env var
 * 2. Verify webhook signature using stripe.webhooks.constructEvent()
 * 3. Remove the mock payload parsing
 */

import { NextRequest, NextResponse } from "next/server";
import { paymentService } from "@/src/lib/payment";
import { createClient } from "@/src/integrations/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const payload = await request.text();
    const signature = request.headers.get("stripe-signature") || "";

    // TODO: In production, verify webhook signature:
    // const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

    const event = await paymentService.handleWebhook(payload, signature);

    if (event.type === "payment_intent.succeeded") {
      const supabase = await createClient();

      // Idempotent: update order payment status by payment_intent_id
      const { error } = await supabase
        .from("orders")
        .update({
          payment_status: "paid",
          updated_at: new Date().toISOString(),
        })
        .eq("payment_intent_id", event.paymentIntentId);

      if (error) {
        console.error("Error updating order payment status:", error);
      }
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error: any) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 400 }
    );
  }
}
