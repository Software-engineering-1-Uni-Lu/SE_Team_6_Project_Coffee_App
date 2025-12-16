const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = "https://quroofukofojobzgocsu.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF1cm9vZnVrb2Zvam9iemdvY3N1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxMjI1NDAsImV4cCI6MjA3NTY5ODU0MH0.s1T3AaKNV1Ckj0Dyhg2yGqUsd04pzrtYH6sQWQD6E6Y";

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTestOrder() {
  console.log("\n🛒 Creating test order...\n");

  // First, get an item from the database
  const { data: items, error: itemsError } = await supabase
    .from("items")
    .select("*")
    .limit(1)
    .single();

  if (itemsError) {
    console.log("❌ Error fetching item:", itemsError.message);
    return;
  }

  console.log("✅ Found item:", items.name);

  // Create a sample order
  const testOrder = {
    customer_id: null, // Guest order
    guest_email: "test@example.com", // Required for guest orders
    status: "confirmed",
    items: [
      {
        id: items.id,
        name: items.name,
        quantity: 2,
        price_cents: items.price_cents,
        modifiers: [
          { name: "Extra Shot", price_cents: 50 },
          { name: "Oat Milk", price_cents: 30 },
        ],
      },
      {
        id: items.id,
        name: items.name + " (Second item)",
        quantity: 1,
        price_cents: items.price_cents,
        modifiers: [],
      },
    ],
    subtotal_cents: items.price_cents * 2 + 80 + items.price_cents, // 2 items + modifiers + 1 item
    tax_cents: Math.round(
      (items.price_cents * 2 + 80 + items.price_cents) * 0.1
    ), // 10% tax
    total_cents: 0, // Will calculate
    payment_method: "card",
    payment_status: "paid",
    pickup_time: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes from now
    notes: "Please make it extra hot!",
    points_earned: 15,
    points_redeemed: 0,
  };

  // Calculate total
  testOrder.total_cents = testOrder.subtotal_cents + testOrder.tax_cents;

  // Insert the order
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert(testOrder)
    .select()
    .single();

  if (orderError) {
    console.log("❌ Error creating order:", orderError.message);
    return;
  }

  console.log("\n✅ Test order created successfully!");
  console.log("\n📋 Order Details:");
  console.log(`   Order ID: ${order.id}`);
  console.log(`   Status: ${order.status}`);
  console.log(`   Total: €${(order.total_cents / 100).toFixed(2)}`);
  console.log(`   Items: ${order.items.length}`);
  console.log("\n🔗 Test the order confirmation page at:");
  console.log(`   http://localhost:3000/order-confirmation/${order.id}`);
  console.log("\n");
}

createTestOrder();
