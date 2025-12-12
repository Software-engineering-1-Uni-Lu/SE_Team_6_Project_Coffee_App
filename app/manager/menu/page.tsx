/**
 * Purpose: Manager menu management page for adding and editing menu items.
 * Allows managers to manage the complete menu catalog.
 */

"use client";

import { useState } from "react";
import { ManagerMenuItemModal } from "@/src/components/manager-menu-item-modal";

export default function ManagerMenuPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <main className="container mx-auto px-4 py-8">
        <header className="mb-8 flex items-center justify-between">
          <h1 className="text-4xl font-bold text-[hsl(25,35%,25%)]">
            Menu Management
          </h1>
          <button
            onClick={() => setIsModalOpen(true)}
            className="rounded-md bg-[hsl(25,35%,25%)] px-4 py-2 text-white transition-colors hover:bg-[hsl(25,40%,15%)]"
          >
            Add Item
          </button>
        </header>

        <section>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Empty menu items grid */}
          </div>
        </section>
      </main>

      <ManagerMenuItemModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}
