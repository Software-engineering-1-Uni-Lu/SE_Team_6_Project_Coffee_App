"use client";

/**
 * Staff Management Client Component
 *
 * PURPOSE:
 * Interactive UI for managing staff accounts, including:
 * - Viewing staff list with search/filter
 * - Editing staff details (email, name, role)
 * - Blocking/unblocking users
 * - Generating invite codes
 * - Managing invite codes
 *
 * USER STORIES:
 * - CSA-132: Browse staff accounts
 * - CSA-133: View & edit staff account details
 * - CSA-134: Add or remove staff accounts
 */

import { useState, useEffect } from "react";
import { useUser } from "@/src/hooks/useUser";

// Types
interface Staff {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  role: "staff" | "manager" | "admin";
  blocked: boolean;
  created_at: string;
}

interface Invite {
  id: string;
  code: string;
  role: string;
  created_by: string | null;
  created_at: string;
  expires_at: string;
  used: boolean;
  used_by: string | null;
  used_at: string | null;
  notes: string | null;
}

// =============================================================================
// ROLE BADGE COMPONENT
// =============================================================================
function RoleBadge({ role }: { role: string }) {
  const colors = {
    staff: "bg-blue-100 text-blue-800 border-blue-200",
    manager: "bg-purple-100 text-purple-800 border-purple-200",
    admin: "bg-red-100 text-red-800 border-red-200",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${colors[role as keyof typeof colors] || "border-gray-200 bg-gray-100 text-gray-800"}`}
    >
      {role.toUpperCase()}
    </span>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================
export default function StaffManagementClient() {
  // Get user role from hook
  const { user, role: userRole, loading: userLoading } = useUser();
  const modalRole: "manager" | "admin" =
    userRole === "admin" ? "admin" : "manager";

  // State
  const [staff, setStaff] = useState<Staff[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [showInviteGenerator, setShowInviteGenerator] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [blockingStaff, setBlockingStaff] = useState<Staff | null>(null);
  const [deletingStaffId, setDeletingStaffId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Fetch initial data on mount
  useEffect(() => {
    if (userLoading) return; // Wait for user data

    async function fetchData() {
      try {
        setDataLoading(true);

        // Fetch staff list
        const staffRes = await fetch("/api/admin/staff");
        if (staffRes.ok) {
          const staffData = await staffRes.json();
          setStaff(staffData.staff || []);
        }

        // Fetch invites
        const invitesRes = await fetch("/api/admin/invites");
        if (invitesRes.ok) {
          const invitesData = await invitesRes.json();
          setInvites(invitesData.invites || []);
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setDataLoading(false);
      }
    }

    fetchData();
  }, [userLoading]);

  // Filter staff based on search and role
  const filteredStaff = staff.filter((member) => {
    const matchesSearch =
      member.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole = roleFilter === "all" || member.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  // Show message
  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  // Refresh staff list
  const refreshStaffList = async () => {
    try {
      const response = await fetch("/api/admin/staff");
      if (response.ok) {
        const data = await response.json();
        setStaff(data.staff);
      }
    } catch (error) {
      console.error("Failed to refresh staff list:", error);
    }
  };

  // Handle staff edit
  const handleEditStaff = async (staffId: string, updates: Partial<Staff>) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/staff/${staffId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        const data = await response.json();
        setStaff((prev) =>
          prev.map((s) => (s.id === staffId ? data.staff : s))
        );
        setEditingStaff(null);
        showMessage("success", "Staff updated successfully");
      } else {
        const error = await response.json();
        showMessage("error", error.error || "Failed to update staff");
      }
    } catch (error) {
      showMessage("error", "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  // Handle block/unblock
  const handleBlockStaff = async (staffId: string, blocked: boolean) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/staff/${staffId}/block`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blocked }),
      });

      if (response.ok) {
        setStaff((prev) =>
          prev.map((s) => (s.id === staffId ? { ...s, blocked } : s))
        );
        setBlockingStaff(null);
        showMessage(
          "success",
          `User ${blocked ? "blocked" : "unblocked"} successfully`
        );
      } else {
        const error = await response.json();
        showMessage("error", error.error || "Failed to update blocked status");
      }
    } catch (error) {
      showMessage("error", "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  // Handle delete (admins only)
  const handleDeleteStaff = async (staffId: string) => {
    const target = staff.find((s) => s.id === staffId);
    if (!target) return;

    if (
      !confirm(
        `Delete ${target.email}? This will permanently remove their account.`
      )
    ) {
      return;
    }

    setDeletingStaffId(staffId);
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/staff/${staffId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setStaff((prev) => prev.filter((s) => s.id !== staffId));
        showMessage("success", "User deleted successfully");
      } else {
        const error = await response.json();
        showMessage("error", error.error || "Failed to delete user");
      }
    } catch (error) {
      showMessage("error", "An unexpected error occurred");
    } finally {
      setLoading(false);
      setDeletingStaffId(null);
    }
  };

  // Handle generate invite
  const handleGenerateInvite = async (inviteData: {
    role: string;
    prefix: string;
    expiresInDays: number;
    notes?: string;
  }) => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(inviteData),
      });

      if (response.ok) {
        const data = await response.json();
        showMessage("success", `Invite code generated: ${data.inviteCode}`);
        setShowInviteGenerator(false);

        // Refresh invites list
        const invitesResponse = await fetch("/api/admin/invites");
        if (invitesResponse.ok) {
          const invitesData = await invitesResponse.json();
          setInvites(invitesData.invites);
        }
      } else {
        const error = await response.json();
        showMessage("error", error.error || "Failed to generate invite code");
      }
    } catch (error) {
      showMessage("error", "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  // Handle revoke invite
  const handleRevokeInvite = async (inviteId: string) => {
    if (!confirm("Are you sure you want to revoke this invite code?")) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/admin/invites/${inviteId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setInvites((prev) => prev.filter((i) => i.id !== inviteId));
        showMessage("success", "Invite code revoked successfully");
      } else {
        const error = await response.json();
        showMessage("error", error.error || "Failed to revoke invite code");
      }
    } catch (error) {
      showMessage("error", "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  // Show loading state while fetching data
  if (userLoading || dataLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-medium">Loading staff management...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                Staff Management
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {userRole === "manager"
                  ? "Manage staff accounts and invite codes"
                  : "Manage staff, managers, and administrators"}
              </p>
            </div>
            <button
              onClick={() => setShowInviteGenerator(true)}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Generate Invite Code
            </button>
          </div>
        </div>
      </header>

      {/* Message Banner */}
      {message && (
        <div
          className={`${message.type === "success" ? "border-green-200 bg-green-50 text-green-800" : "border-red-200 bg-red-50 text-red-800"} border-b px-4 py-3`}
        >
          <div className="container mx-auto">{message.text}</div>
        </div>
      )}

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Filters and Search */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full max-w-md rounded-md border border-border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="rounded-md border border-border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">All Roles</option>
            <option value="staff">Staff</option>
            {userRole === "admin" && <option value="manager">Manager</option>}
            {userRole === "admin" && <option value="admin">Admin</option>}
          </select>
        </div>

        {/* Staff Table */}
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <table className="w-full">
            <thead className="border-b border-border bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Email
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Role
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredStaff.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-sm text-muted-foreground"
                  >
                    No staff members found
                  </td>
                </tr>
              ) : (
                filteredStaff.map((member) => (
                  <tr key={member.id} className="hover:bg-muted/50">
                    <td className="px-4 py-4 text-sm font-medium text-foreground">
                      {member.full_name || "—"}
                    </td>
                    <td className="px-4 py-4 text-sm text-muted-foreground">
                      {member.email}
                    </td>
                    <td className="px-4 py-4">
                      <RoleBadge role={member.role} />
                    </td>
                    <td className="px-4 py-4">
                      {member.blocked ? (
                        <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
                          Blocked
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-right text-sm">
                      <button
                        onClick={() => setEditingStaff(member)}
                        className="text-primary hover:text-primary/80"
                      >
                        Edit
                      </button>
                      <span className="mx-2 text-muted-foreground">|</span>
                      {member.id === user?.id ? (
                        <span className="text-muted-foreground">You</span>
                      ) : (
                        <button
                          onClick={() => setBlockingStaff(member)}
                          className="text-red-600 hover:text-red-800"
                        >
                          {member.blocked ? "Unblock" : "Block"}
                        </button>
                      )}
                      {userRole === "admin" && member.role !== "admin" && (
                        <>
                          <span className="mx-2 text-muted-foreground">|</span>
                          <button
                            onClick={() => handleDeleteStaff(member.id)}
                            className="text-red-700 hover:text-red-900"
                            disabled={deletingStaffId === member.id || loading}
                          >
                            {deletingStaffId === member.id
                              ? "Deleting..."
                              : "Delete"}
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Invite Codes Section */}
        <div className="mt-12">
          <h2 className="mb-4 text-2xl font-semibold text-foreground">
            Invite Codes
          </h2>
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <table className="w-full">
              <thead className="border-b border-border bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Code
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Role
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Expires
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {invites.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-8 text-center text-sm text-muted-foreground"
                    >
                      No invite codes found
                    </td>
                  </tr>
                ) : (
                  invites.map((invite) => (
                    <tr key={invite.id} className="hover:bg-muted/50">
                      <td className="px-4 py-4 font-mono text-sm font-medium text-foreground">
                        {invite.code}
                      </td>
                      <td className="px-4 py-4">
                        <RoleBadge role={invite.role} />
                      </td>
                      <td className="px-4 py-4 text-sm text-muted-foreground">
                        {new Date(invite.expires_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-4">
                        {invite.used ? (
                          <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">
                            Used
                          </span>
                        ) : new Date(invite.expires_at) < new Date() ? (
                          <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800">
                            Expired
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                            Valid
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-right">
                        {!invite.used && (
                          <button
                            onClick={() => handleRevokeInvite(invite.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            Revoke
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Edit Staff Modal */}
      {editingStaff && (
        <EditStaffModal
          staff={editingStaff}
          userRole={modalRole}
          onClose={() => setEditingStaff(null)}
          onSave={handleEditStaff}
          loading={loading}
        />
      )}

      {/* Block Confirmation Dialog */}
      {blockingStaff && (
        <BlockConfirmDialog
          staff={blockingStaff}
          onConfirm={(blocked) => handleBlockStaff(blockingStaff.id, blocked)}
          onCancel={() => setBlockingStaff(null)}
          loading={loading}
        />
      )}

      {/* Invite Generator Modal */}
      {showInviteGenerator && (
        <InviteGeneratorModal
          userRole={modalRole}
          onClose={() => setShowInviteGenerator(false)}
          onGenerate={handleGenerateInvite}
          loading={loading}
        />
      )}
    </div>
  );
}

// =============================================================================
// EDIT STAFF MODAL
// =============================================================================
function EditStaffModal({
  staff,
  userRole,
  onClose,
  onSave,
  loading,
}: {
  staff: Staff;
  userRole: "manager" | "admin";
  onClose: () => void;
  onSave: (staffId: string, updates: Partial<Staff>) => void;
  loading: boolean;
}) {
  const [formData, setFormData] = useState({
    email: staff.email,
    full_name: staff.full_name || "",
    phone: staff.phone || "",
    role: staff.role,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(staff.id, formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-2xl font-bold text-gray-900">
          Edit Staff Member
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              className="w-full rounded-md border border-gray-300 px-3 py-2"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Full Name
            </label>
            <input
              type="text"
              value={formData.full_name}
              onChange={(e) =>
                setFormData({ ...formData, full_name: e.target.value })
              }
              className="w-full rounded-md border border-gray-300 px-3 py-2"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Phone
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
              className="w-full rounded-md border border-gray-300 px-3 py-2"
            />
          </div>
          {userRole === "admin" && staff.role !== "admin" && (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Role
              </label>
              <select
                value={formData.role}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    role: e.target.value as "staff" | "manager",
                  })
                }
                className="w-full rounded-md border border-gray-300 px-3 py-2"
              >
                <option value="staff">Staff</option>
                <option value="manager">Manager</option>
              </select>
            </div>
          )}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
              disabled={loading}
            >
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// =============================================================================
// BLOCK CONFIRM DIALOG
// =============================================================================
function BlockConfirmDialog({
  staff,
  onConfirm,
  onCancel,
  loading,
}: {
  staff: Staff;
  onConfirm: (blocked: boolean) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const action = staff.blocked ? "unblock" : "block";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-xl font-bold text-gray-900">
          {action === "block" ? "Block" : "Unblock"} User
        </h2>
        <p className="mb-6 text-sm text-gray-600">
          Are you sure you want to {action}{" "}
          <span className="font-semibold">{staff.email}</span>?
          {action === "block" &&
            " They will be immediately logged out and unable to access the system."}
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(!staff.blocked)}
            className={`rounded-md px-4 py-2 text-sm font-medium text-white ${action === "block" ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"}`}
            disabled={loading}
          >
            {loading
              ? "Processing..."
              : action === "block"
                ? "Block User"
                : "Unblock User"}
          </button>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// INVITE GENERATOR MODAL
// =============================================================================
function InviteGeneratorModal({
  userRole,
  onClose,
  onGenerate,
  loading,
}: {
  userRole: "manager" | "admin";
  onClose: () => void;
  onGenerate: (data: {
    role: string;
    prefix: string;
    expiresInDays: number;
    notes?: string;
  }) => void;
  loading: boolean;
}) {
  const [formData, setFormData] = useState({
    role: "staff",
    prefix: "CAFE",
    expiresInDays: 30,
    notes: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onGenerate(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-2xl font-bold text-gray-900">
          Generate Invite Code
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Role
            </label>
            <select
              value={formData.role}
              onChange={(e) =>
                setFormData({ ...formData, role: e.target.value })
              }
              className="w-full rounded-md border border-gray-300 px-3 py-2"
            >
              <option value="staff">Staff</option>
              {userRole === "admin" && <option value="manager">Manager</option>}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Prefix (optional)
            </label>
            <input
              type="text"
              value={formData.prefix}
              onChange={(e) =>
                setFormData({ ...formData, prefix: e.target.value })
              }
              className="w-full rounded-md border border-gray-300 px-3 py-2"
              placeholder="CAFE"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Expires in (days)
            </label>
            <input
              type="number"
              value={formData.expiresInDays}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  expiresInDays: parseInt(e.target.value),
                })
              }
              className="w-full rounded-md border border-gray-300 px-3 py-2"
              min="1"
              max="365"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Notes (optional)
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              className="w-full rounded-md border border-gray-300 px-3 py-2"
              rows={3}
              placeholder="e.g., For new hire John Doe"
            />
          </div>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
              disabled={loading}
            >
              {loading ? "Generating..." : "Generate Code"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
