/**
 * POST /api/payments/create-intent
 *
 * PURPOSE:
 * Create a payment intent for card/digital wallet payments.
 * Currently uses mock implementation; ready for real Stripe swap-in.
 */

import { NextRequest, NextResponse } from "next/server";
import { paymentService } from "@/src/lib/payment";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { amount, currency } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: "Valid amount is required" },
        { status: 400 }
      );
    }

    const paymentIntent = await paymentService.createPaymentIntent(
      amount,
      currency || "eur"
    );

    return NextResponse.json(
      {
        clientSecret: paymentIntent.clientSecret,
        paymentIntentId: paymentIntent.id,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error creating payment intent:", error);
    return NextResponse.json(
      { error: "Failed to create payment intent" },
      { status: 500 }
    );
  }
}
