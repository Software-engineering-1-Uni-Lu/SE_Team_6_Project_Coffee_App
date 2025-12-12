/**
 * Purpose: Staff management page for viewing and managing employees.
 * Allows managers to add, edit, and remove staff members.
 */

export default function ManagerStaffManagementPage() {
  return (
    <main className="container mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="text-4xl font-bold text-[hsl(25,35%,25%)]">
          Staff Management
        </h1>
      </header>

      <section>
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b">
              <th className="px-4 py-3 text-left text-[hsl(25,35%,25%)]">
                Name
              </th>
              <th className="px-4 py-3 text-left text-[hsl(25,35%,25%)]">
                Role
              </th>
              <th className="px-4 py-3 text-left text-[hsl(25,35%,25%)]">
                Status
              </th>
              <th className="px-4 py-3 text-left text-[hsl(25,35%,25%)]">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>{/* Empty staff table rows */}</tbody>
        </table>
      </section>
    </main>
  );
}
