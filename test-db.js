const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = "https://quroofukofojobzgocsu.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF1cm9vZnVrb2Zvam9iemdvY3N1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxMjI1NDAsImV4cCI6MjA3NTY5ODU0MH0.s1T3AaKNV1Ckj0Dyhg2yGqUsd04pzrtYH6sQWQD6E6Y";

const supabase = createClient(supabaseUrl, supabaseKey);

async function testDatabase() {
  console.log("\n🔍 Checking database...\n");

  // Check orders table
  const { data: orders, error: ordersError } = await supabase
    .from("orders")
    .select("id")
    .limit(1);

  if (ordersError) {
    console.log("❌ Orders table error:", ordersError.message);
    console.log("\n⚠️  Your migrations may not have been run yet.");
    console.log("📝 You need to run your Supabase migrations.");
  } else {
    console.log("✅ Orders table exists");
    console.log(`   Found ${orders.length} orders`);
  }

  // Check items table
  const { data: items, error: itemsError } = await supabase
    .from("items")
    .select("id")
    .limit(1);

  if (itemsError) {
    console.log("❌ Items table error:", itemsError.message);
  } else {
    console.log("✅ Items table exists");
    console.log(`   Found ${items.length} items`);
  }

  // Check categories table
  const { data: categories, error: categoriesError } = await supabase
    .from("categories")
    .select("id")
    .limit(1);

  if (categoriesError) {
    console.log("❌ Categories table error:", categoriesError.message);
  } else {
    console.log("✅ Categories table exists");
    console.log(`   Found ${categories.length} categories`);
  }

  console.log("\n");
}

testDatabase();
