import { redirect } from "next/navigation";

export default function CustomerOrdersPage() {
  // Keep legacy path working but delegate to unified /orders experience
  redirect("/orders");
}
