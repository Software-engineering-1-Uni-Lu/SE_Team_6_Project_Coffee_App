/**
 * Purpose: Checkout page for completing purchases.
 * Allows customers to finalize their order and make payment.
 */

"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCart } from "@/src/hooks/use-cart";
import { formatPrice } from "@/src/lib/cart-utils";
import { createClient } from "@/src/integrations/supabase/client";
import { toast } from "sonner";

const TAX_RATE = 0.1; // 10% tax rate

export default function CheckoutPage() {
  const router = useRouter();
  const { items, totalPrice, isLoading: cartLoading, clearCart } = useCart();
  const supabase = createClient();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [user, setUser] = useState<{ email?: string; id?: string } | null>(
    null
  );

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    email: "",
  });

  // Payment state
  const [paymentMethod, setPaymentMethod] = useState<"card" | "cash">("card");
  const [cardDetails, setCardDetails] = useState({
    number: "",
    name: "",
    expiry: "",
    cvc: "",
  });

  // Calculate totals (EU VAT logic - prices include tax)
  const total = totalPrice; // Total stays the same as cart
  const netPrice = Math.round(total / (1 + TAX_RATE)); // Price without VAT
  const tax = total - netPrice; // VAT amount included in the price

  // Check authentication status
  useEffect(() => {
    async function checkAuth() {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      setUser(authUser);

      // Pre-fill email if authenticated
      if (authUser?.email) {
        setFormData((prev) => ({ ...prev, email: authUser.email! }));
      }
    }
    checkAuth();
  }, []);

  // Redirect if cart is empty
  useEffect(() => {
    if (!cartLoading && items.length === 0) {
      router.push("/menu");
    }
  }, [cartLoading, items.length, router]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCardInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let formattedValue = value;

    // Format card number with spaces
    if (name === "number") {
      formattedValue = value
        .replace(/\s/g, "")
        .replace(/(\d{4})/g, "$1 ")
        .trim();
      formattedValue = formattedValue.slice(0, 19); // Limit to 16 digits + 3 spaces
    }

    // Format expiry as MM/YY
    if (name === "expiry") {
      formattedValue = value.replace(/\D/g, "");
      if (formattedValue.length >= 2) {
        formattedValue =
          formattedValue.slice(0, 2) + "/" + formattedValue.slice(2, 4);
      }
      formattedValue = formattedValue.slice(0, 5); // Limit to MM/YY
    }

    // Limit CVC to 3 digits
    if (name === "cvc") {
      formattedValue = value.replace(/\D/g, "").slice(0, 3);
    }

    setCardDetails((prev) => ({ ...prev, [name]: formattedValue }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation - Contact Information
    if (!formData.name.trim()) {
      toast.error("Please enter your name");
      return;
    }
    if (!formData.email.trim()) {
      toast.error("Please enter your email");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    // Validation - Payment Method
    if (paymentMethod === "card") {
      // Card number validation (16 digits)
      const cardNumberDigits = cardDetails.number.replace(/\s/g, "");
      if (!cardNumberDigits || cardNumberDigits.length !== 16) {
        toast.error("Please enter a valid 16-digit card number");
        return;
      }

      // Cardholder name validation
      if (!cardDetails.name.trim()) {
        toast.error("Please enter the cardholder name");
        return;
      }

      // Expiry validation (MM/YY format and not expired)
      const expiryRegex = /^(0[1-9]|1[0-2])\/\d{2}$/;
      if (!expiryRegex.test(cardDetails.expiry)) {
        toast.error("Please enter a valid expiry date (MM/YY)");
        return;
      }

      // Check if card is not expired
      const [month, year] = cardDetails.expiry.split("/");
      const expiryDate = new Date(2000 + parseInt(year), parseInt(month) - 1);
      const now = new Date();
      if (expiryDate < now) {
        toast.error("Card has expired");
        return;
      }

      // CVC validation (3 digits)
      if (!cardDetails.cvc || cardDetails.cvc.length !== 3) {
        toast.error("Please enter a valid 3-digit CVC");
        return;
      }
    }

    setIsSubmitting(true);

    try {
      // TODO: Implement order creation and payment processing
      console.log("Order details:", {
        contact: formData,
        paymentMethod,
        ...(paymentMethod === "card" && { cardDetails }),
        items,
        total,
      });

      toast.success("Order placed successfully!");

      // Clear cart and redirect
      await clearCart();
      router.push("/");
    } catch (error) {
      console.error("Error placing order:", error);
      toast.error("Failed to place order. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (cartLoading) {
    return (
      <main className="container mx-auto px-4 py-8">
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="text-center">
            <div className="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-[hsl(25,35%,25%)] border-r-transparent"></div>
            <p className="text-[hsl(25,35%,25%)]">Loading checkout...</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="container mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="mb-4 text-4xl font-bold text-[hsl(25,35%,25%)]">
          Checkout
        </h1>
      </header>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Checkout Form */}
          <section className="lg:col-span-2">
            <div className="overflow-hidden rounded-lg border border-[hsl(35,20%,90%)] bg-white shadow-sm">
              <div className="p-6">
                <h2 className="mb-6 text-2xl font-bold text-[hsl(25,35%,25%)]">
                  Contact Information
                </h2>

                <div className="space-y-4">
                  <div>
                    <label
                      htmlFor="name"
                      className="mb-2 block text-sm font-medium text-[hsl(25,35%,25%)]"
                    >
                      Full Name
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                      className="w-full rounded-md border border-[hsl(35,20%,90%)] px-4 py-2 text-[hsl(25,35%,25%)] transition-colors focus:border-[hsl(25,35%,25%)] focus:outline-none focus:ring-2 focus:ring-[hsl(25,35%,25%)] focus:ring-opacity-20"
                      placeholder="John Doe"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="email"
                      className="mb-2 block text-sm font-medium text-[hsl(25,35%,25%)]"
                    >
                      Email Address
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      disabled={!!user?.email}
                      className="w-full rounded-md border border-[hsl(35,20%,90%)] px-4 py-2 text-[hsl(25,35%,25%)] transition-colors focus:border-[hsl(25,35%,25%)] focus:outline-none focus:ring-2 focus:ring-[hsl(25,35%,25%)] focus:ring-opacity-20 disabled:cursor-not-allowed disabled:bg-[hsl(35,20%,95%)]"
                      placeholder="john@example.com"
                    />
                    {user?.email && (
                      <p className="mt-1 text-xs text-[hsl(25,35%,45%)]">
                        Using email from your account
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Method */}
            <div className="mt-6 overflow-hidden rounded-lg border border-[hsl(35,20%,90%)] bg-white shadow-sm">
              <div className="p-6">
                <h2 className="mb-6 text-2xl font-bold text-[hsl(25,35%,25%)]">
                  Payment Method
                </h2>

                {/* Payment method selection */}
                <div className="mb-6 flex gap-4">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("card")}
                    className={`flex-1 rounded-md border-2 px-4 py-3 text-sm font-medium transition-colors ${
                      paymentMethod === "card"
                        ? "border-[hsl(25,35%,25%)] bg-[hsl(25,35%,25%)] text-white"
                        : "border-[hsl(35,20%,90%)] bg-white text-[hsl(25,35%,25%)] hover:bg-[hsl(35,20%,95%)]"
                    }`}
                  >
                    💳 Card
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("cash")}
                    className={`flex-1 rounded-md border-2 px-4 py-3 text-sm font-medium transition-colors ${
                      paymentMethod === "cash"
                        ? "border-[hsl(25,35%,25%)] bg-[hsl(25,35%,25%)] text-white"
                        : "border-[hsl(35,20%,90%)] bg-white text-[hsl(25,35%,25%)] hover:bg-[hsl(35,20%,95%)]"
                    }`}
                  >
                    💵 Cash
                  </button>
                </div>

                {/* Card Payment Form */}
                {paymentMethod === "card" && (
                  <div className="space-y-4">
                    <div>
                      <label
                        htmlFor="cardNumber"
                        className="mb-2 block text-sm font-medium text-[hsl(25,35%,25%)]"
                      >
                        Card Number
                      </label>
                      <input
                        type="text"
                        id="cardNumber"
                        name="number"
                        value={cardDetails.number}
                        onChange={handleCardInputChange}
                        required
                        className="w-full rounded-md border border-[hsl(35,20%,90%)] px-4 py-2 text-[hsl(25,35%,25%)] transition-colors focus:border-[hsl(25,35%,25%)] focus:outline-none focus:ring-2 focus:ring-[hsl(25,35%,25%)] focus:ring-opacity-20"
                        placeholder="1234 5678 9012 3456"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="cardName"
                        className="mb-2 block text-sm font-medium text-[hsl(25,35%,25%)]"
                      >
                        Cardholder Name
                      </label>
                      <input
                        type="text"
                        id="cardName"
                        name="name"
                        value={cardDetails.name}
                        onChange={handleCardInputChange}
                        required
                        className="w-full rounded-md border border-[hsl(35,20%,90%)] px-4 py-2 text-[hsl(25,35%,25%)] transition-colors focus:border-[hsl(25,35%,25%)] focus:outline-none focus:ring-2 focus:ring-[hsl(25,35%,25%)] focus:ring-opacity-20"
                        placeholder="John Doe"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label
                          htmlFor="expiry"
                          className="mb-2 block text-sm font-medium text-[hsl(25,35%,25%)]"
                        >
                          Expiry Date
                        </label>
                        <input
                          type="text"
                          id="expiry"
                          name="expiry"
                          value={cardDetails.expiry}
                          onChange={handleCardInputChange}
                          required
                          className="w-full rounded-md border border-[hsl(35,20%,90%)] px-4 py-2 text-[hsl(25,35%,25%)] transition-colors focus:border-[hsl(25,35%,25%)] focus:outline-none focus:ring-2 focus:ring-[hsl(25,35%,25%)] focus:ring-opacity-20"
                          placeholder="MM/YY"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="cvc"
                          className="mb-2 block text-sm font-medium text-[hsl(25,35%,25%)]"
                        >
                          CVC
                        </label>
                        <input
                          type="text"
                          id="cvc"
                          name="cvc"
                          value={cardDetails.cvc}
                          onChange={handleCardInputChange}
                          required
                          className="w-full rounded-md border border-[hsl(35,20%,90%)] px-4 py-2 text-[hsl(25,35%,25%)] transition-colors focus:border-[hsl(25,35%,25%)] focus:outline-none focus:ring-2 focus:ring-[hsl(25,35%,25%)] focus:ring-opacity-20"
                          placeholder="123"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Cash Payment Info */}
                {paymentMethod === "cash" && (
                  <div className="rounded-lg bg-[hsl(35,20%,95%)] p-4">
                    <p className="text-sm text-[hsl(25,35%,25%)]">
                      Please prepare exact change or the total amount.
                    </p>
                    <p className="mt-2 text-sm font-medium text-[hsl(25,35%,25%)]">
                      Payment will be collected when you pick up your order.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Order Summary */}
          <aside className="lg:col-span-1">
            <div className="overflow-hidden rounded-lg border border-[hsl(35,20%,90%)] bg-white shadow-sm">
              <div className="p-6">
                <h2 className="mb-4 text-xl font-bold text-[hsl(25,35%,25%)]">
                  Order Summary
                </h2>

                {/* Cart Items */}
                <div className="mb-4 space-y-4">
                  {items.map((item) => (
                    <div
                      key={item.cartItemId}
                      className="flex gap-3 border-b border-[hsl(35,20%,90%)] pb-4 last:border-b-0"
                    >
                      {/* Item image */}
                      <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-md bg-[hsl(35,20%,95%)]">
                        {item.imageUrl ? (
                          <Image
                            src={item.imageUrl}
                            alt={item.name}
                            fill
                            className="object-cover"
                            sizes="64px"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-2xl text-[hsl(25,35%,45%)]">
                            ☕
                          </div>
                        )}
                      </div>

                      {/* Item details */}
                      <div className="flex flex-1 flex-col justify-between">
                        <div>
                          <h3 className="text-sm font-semibold text-[hsl(25,35%,25%)]">
                            {item.name}
                          </h3>
                          {item.modifiers && item.modifiers.length > 0 && (
                            <div className="mt-1">
                              {item.modifiers.map((mod, idx) => (
                                <p
                                  key={idx}
                                  className="text-xs text-[hsl(25,35%,45%)]"
                                >
                                  + {mod.label}
                                </p>
                              ))}
                            </div>
                          )}
                          <p className="mt-1 text-xs text-[hsl(25,35%,45%)]">
                            Qty: {item.quantity}
                          </p>
                        </div>
                        <p className="text-sm font-medium text-[hsl(25,35%,25%)]">
                          {formatPrice(item.price * item.quantity)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Price breakdown */}
                <div className="space-y-2 border-t border-[hsl(35,20%,90%)] pt-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-[hsl(25,35%,45%)]">
                      Subtotal (excl. VAT)
                    </span>
                    <span className="font-medium text-[hsl(25,35%,25%)]">
                      {formatPrice(netPrice)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[hsl(25,35%,45%)]">VAT (10%)</span>
                    <span className="font-medium text-[hsl(25,35%,25%)]">
                      {formatPrice(tax)}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-[hsl(35,20%,90%)] pt-2 text-base font-bold">
                    <span className="text-[hsl(25,35%,25%)]">
                      Total (incl. VAT)
                    </span>
                    <span className="text-[hsl(25,35%,25%)]">
                      {formatPrice(total)}
                    </span>
                  </div>
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={isSubmitting || items.length === 0}
                  className="mt-6 w-full rounded-md bg-[hsl(25,35%,25%)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[hsl(25,40%,15%)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSubmitting ? "Processing..." : "Place Order"}
                </button>
              </div>
            </div>
          </aside>
        </div>
      </form>
    </main>
  );
}
