/**
 * Purpose: Staff shift handover notes page.
 * Allows staff to create, view, filter, and resolve shift notes.
 */

"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";

interface ShiftNote {
  id: string;
  shift_date: string;
  shift_type: string;
  created_by: string;
  category: string;
  priority: string;
  title: string;
  note: string;
  resolved: boolean;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

const CATEGORIES = [
  { value: "prep_status", label: "Prep Status" },
  { value: "inventory", label: "Inventory" },
  { value: "equipment", label: "Equipment" },
  { value: "customers", label: "Customers" },
  { value: "general", label: "General" },
  { value: "urgent", label: "Urgent" },
];

const PRIORITIES = [
  { value: "low", label: "Low" },
  { value: "normal", label: "Normal" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

const SHIFT_TYPES = [
  { value: "morning", label: "Morning (6am-12pm)" },
  { value: "afternoon", label: "Afternoon (12pm-6pm)" },
  { value: "evening", label: "Evening (6pm-12am)" },
  { value: "night", label: "Night (12am-6am)" },
];

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-gray-100 text-gray-700 border-gray-300",
  normal: "bg-blue-100 text-blue-700 border-blue-300",
  high: "bg-orange-100 text-orange-700 border-orange-300",
  urgent: "bg-red-100 text-red-700 border-red-300",
};

const CATEGORY_LABELS: Record<string, string> = {
  prep_status: "Prep Status",
  inventory: "Inventory",
  equipment: "Equipment",
  customers: "Customers",
  general: "General",
  urgent: "Urgent",
};

export default function ShiftNotesPage() {
  const [notes, setNotes] = useState<ShiftNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [filterResolved, setFilterResolved] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Form state
  const [formShiftType, setFormShiftType] = useState("morning");
  const [formCategory, setFormCategory] = useState("general");
  const [formPriority, setFormPriority] = useState("normal");
  const [formTitle, setFormTitle] = useState("");
  const [formNote, setFormNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchNotes = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filterCategory) params.set("category", filterCategory);
      if (filterPriority) params.set("priority", filterPriority);
      if (filterResolved !== "") params.set("resolved", filterResolved);

      const response = await fetch(
        `/api/staff/shift-notes?${params.toString()}`,
        { credentials: "include" }
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch notes");
      }

      setNotes(data.notes || []);
    } catch (err) {
      console.error("Error fetching shift notes:", err);
      toast.error("Failed to load shift notes");
    } finally {
      setLoading(false);
    }
  }, [filterCategory, filterPriority, filterResolved]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formNote.trim()) {
      toast.error("Title and note are required");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/staff/shift-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          shift_type: formShiftType,
          category: formCategory,
          priority: formPriority,
          title: formTitle.trim(),
          note: formNote.trim(),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to create note");
      }

      toast.success("Shift note created");
      setFormTitle("");
      setFormNote("");
      setShowCreateForm(false);
      fetchNotes();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create note");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResolve = async (noteId: string, resolved: boolean) => {
    try {
      const response = await fetch(`/api/staff/shift-notes/${noteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ resolved }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to update note");
      }

      toast.success(resolved ? "Note resolved" : "Note reopened");
      fetchNotes();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update note");
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <main className="container mx-auto px-4 py-8">
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[hsl(25,35%,25%)] border-r-transparent"></div>
            <p className="mt-4 text-[hsl(25,35%,45%)]">
              Loading shift notes...
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="container mx-auto px-4 py-8">
      {/* Header */}
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[hsl(25,35%,25%)]">
            Shift Notes
          </h1>
          <p className="mt-1 text-[hsl(25,35%,55%)]">
            Handover notes between shifts
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="rounded-md bg-[hsl(25,35%,25%)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[hsl(25,40%,15%)]"
        >
          {showCreateForm ? "Cancel" : "+ New Note"}
        </button>
      </header>

      {/* Create Form */}
      {showCreateForm && (
        <form
          onSubmit={handleCreateNote}
          className="mb-6 rounded-lg border border-[hsl(35,20%,90%)] bg-white p-6 shadow-sm"
        >
          <h2 className="mb-4 text-lg font-semibold text-[hsl(25,35%,25%)]">
            Create Shift Note
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label
                htmlFor="shift-type"
                className="mb-1 block text-sm font-medium text-[hsl(25,35%,25%)]"
              >
                Shift Type
              </label>
              <select
                id="shift-type"
                value={formShiftType}
                onChange={(e) => setFormShiftType(e.target.value)}
                className="w-full rounded-md border border-[hsl(35,20%,90%)] px-3 py-2 text-sm text-[hsl(25,35%,25%)]"
              >
                {SHIFT_TYPES.map((st) => (
                  <option key={st.value} value={st.value}>
                    {st.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="category"
                className="mb-1 block text-sm font-medium text-[hsl(25,35%,25%)]"
              >
                Category
              </label>
              <select
                id="category"
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value)}
                className="w-full rounded-md border border-[hsl(35,20%,90%)] px-3 py-2 text-sm text-[hsl(25,35%,25%)]"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="priority"
                className="mb-1 block text-sm font-medium text-[hsl(25,35%,25%)]"
              >
                Priority
              </label>
              <select
                id="priority"
                value={formPriority}
                onChange={(e) => setFormPriority(e.target.value)}
                className="w-full rounded-md border border-[hsl(35,20%,90%)] px-3 py-2 text-sm text-[hsl(25,35%,25%)]"
              >
                {PRIORITIES.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-4">
            <label
              htmlFor="title"
              className="mb-1 block text-sm font-medium text-[hsl(25,35%,25%)]"
            >
              Title
            </label>
            <input
              id="title"
              type="text"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="Brief summary of the note"
              className="w-full rounded-md border border-[hsl(35,20%,90%)] px-3 py-2 text-sm text-[hsl(25,35%,25%)]"
              required
            />
          </div>
          <div className="mt-4">
            <label
              htmlFor="note-content"
              className="mb-1 block text-sm font-medium text-[hsl(25,35%,25%)]"
            >
              Note
            </label>
            <textarea
              id="note-content"
              value={formNote}
              onChange={(e) => setFormNote(e.target.value)}
              placeholder="Detailed note for the next shift..."
              rows={3}
              className="w-full rounded-md border border-[hsl(35,20%,90%)] px-3 py-2 text-sm text-[hsl(25,35%,25%)]"
              required
            />
          </div>
          <div className="mt-4 flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-md bg-[hsl(25,35%,25%)] px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-[hsl(25,40%,15%)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Creating..." : "Create Note"}
            </button>
          </div>
        </form>
      )}

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-4">
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="rounded-md border border-[hsl(35,20%,90%)] px-3 py-2 text-sm text-[hsl(25,35%,25%)]"
          aria-label="Filter by category"
        >
          <option value="">All Categories</option>
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
        <select
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value)}
          className="rounded-md border border-[hsl(35,20%,90%)] px-3 py-2 text-sm text-[hsl(25,35%,25%)]"
          aria-label="Filter by priority"
        >
          <option value="">All Priorities</option>
          {PRIORITIES.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
        <select
          value={filterResolved}
          onChange={(e) => setFilterResolved(e.target.value)}
          className="rounded-md border border-[hsl(35,20%,90%)] px-3 py-2 text-sm text-[hsl(25,35%,25%)]"
          aria-label="Filter by status"
        >
          <option value="">All Status</option>
          <option value="false">Unresolved</option>
          <option value="true">Resolved</option>
        </select>
      </div>

      {/* Notes List */}
      {notes.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-[hsl(35,20%,85%)] p-12 text-center">
          <h2 className="text-xl font-semibold text-[hsl(25,35%,25%)]">
            No shift notes
          </h2>
          <p className="mt-2 text-[hsl(25,35%,55%)]">
            Create a note to pass information to the next shift.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {notes.map((note) => (
            <div
              key={note.id}
              className={`rounded-lg border bg-white p-4 shadow-sm ${
                note.resolved
                  ? "border-[hsl(35,20%,90%)] opacity-75"
                  : "border-[hsl(35,20%,90%)]"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${
                        PRIORITY_COLORS[note.priority] || PRIORITY_COLORS.normal
                      }`}
                    >
                      {note.priority.charAt(0).toUpperCase() +
                        note.priority.slice(1)}
                    </span>
                    <span className="inline-flex items-center rounded-full border border-[hsl(35,20%,85%)] bg-[hsl(35,20%,95%)] px-2 py-0.5 text-xs font-medium text-[hsl(25,35%,45%)]">
                      {CATEGORY_LABELS[note.category] || note.category}
                    </span>
                    <span className="text-xs text-[hsl(25,35%,55%)]">
                      {note.shift_type.charAt(0).toUpperCase() +
                        note.shift_type.slice(1)}{" "}
                      shift
                    </span>
                    {note.resolved && (
                      <span className="inline-flex items-center rounded-full border border-green-300 bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
                        Resolved
                      </span>
                    )}
                  </div>
                  <h3
                    className={`font-semibold text-[hsl(25,35%,25%)] ${note.resolved ? "line-through" : ""}`}
                  >
                    {note.title}
                  </h3>
                  <p className="mt-1 text-sm text-[hsl(25,35%,45%)]">
                    {note.note}
                  </p>
                  <p className="mt-2 text-xs text-[hsl(25,35%,55%)]">
                    {formatDate(note.shift_date)} at{" "}
                    {formatTime(note.created_at)}
                    {note.resolved_at &&
                      ` | Resolved ${formatDate(note.resolved_at)}`}
                  </p>
                </div>
                <button
                  onClick={() => handleResolve(note.id, !note.resolved)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    note.resolved
                      ? "border border-[hsl(35,20%,85%)] bg-white text-[hsl(25,35%,45%)] hover:bg-[hsl(35,20%,95%)]"
                      : "bg-green-600 text-white hover:bg-green-700"
                  }`}
                >
                  {note.resolved ? "Reopen" : "Resolve"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
