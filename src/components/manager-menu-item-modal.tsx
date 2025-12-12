/**
 * Purpose: Modal for creating/editing menu items in manager interface.
 * Provides empty form shell for menu item management.
 */

"use client";

interface ManagerMenuItemModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ManagerMenuItemModal({
  isOpen,
  onClose,
}: ManagerMenuItemModalProps) {
  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black bg-opacity-50"
        onClick={onClose}
      />
      <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white shadow-xl">
        <div className="flex max-h-[90vh] flex-col">
          <div className="flex items-center justify-between border-b p-6">
            <h2 className="text-2xl font-bold text-[hsl(25,35%,25%)]">
              Menu Item Editor
            </h2>
            <button
              onClick={onClose}
              className="text-2xl text-[hsl(25,35%,25%)] transition-colors hover:text-[hsl(25,40%,15%)]"
            >
              ✕
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            <form className="space-y-4">
              {/* Empty form inputs container */}
              <div>
                <label className="mb-1 block text-sm font-medium text-[hsl(25,35%,25%)]">
                  Item Name
                </label>
                <input
                  type="text"
                  className="w-full rounded-md border border-[hsl(35,20%,85%)] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[hsl(25,35%,25%)]"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-[hsl(25,35%,25%)]">
                  Description
                </label>
                <textarea
                  className="w-full rounded-md border border-[hsl(35,20%,85%)] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[hsl(25,35%,25%)]"
                  rows={3}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-[hsl(25,35%,25%)]">
                  Price
                </label>
                <input
                  type="number"
                  step="0.01"
                  className="w-full rounded-md border border-[hsl(35,20%,85%)] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[hsl(25,35%,25%)]"
                />
              </div>
            </form>
          </div>

          <div className="flex justify-end gap-3 border-t p-6">
            <button
              onClick={onClose}
              className="rounded-md border border-[hsl(35,20%,85%)] px-4 py-2 text-sm font-medium text-[hsl(25,35%,25%)] transition-colors hover:bg-[hsl(35,20%,95%)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-md bg-[hsl(25,35%,25%)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[hsl(25,40%,15%)]"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
