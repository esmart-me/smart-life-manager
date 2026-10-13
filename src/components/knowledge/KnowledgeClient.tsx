"use client";

import { useState, useEffect } from "react";
import {
  BookOpen,
  Plus,
  Search,
  Star,
  Pin,
  Archive,
  Download,
  FolderPlus,
  Trash2,
  Edit2,
  Folder,
  Tag,
  Link2,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  FileText,
  Clock,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

interface CollectionItem {
  id: string;
  name: string;
  description: string | null;
  color: string;
  icon: string | null;
  _count?: { notes: number };
}

interface NoteItem {
  id: string;
  title: string;
  content: string;
  tags: string | null;
  isPinned: boolean;
  isFavorite: boolean;
  isArchived: boolean;
  sourceUrl: string | null;
  attachmentName: string | null;
  collectionId: string | null;
  collection?: { id: string; name: string; color: string } | null;
  createdAt: string;
  updatedAt: string;
}

export function KnowledgeClient() {
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [collections, setCollections] = useState<CollectionItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCollectionId, setActiveCollectionId] = useState<string>("all");
  const [viewFilter, setViewFilter] = useState<"all" | "favorites" | "pinned" | "archived">("all");

  // Quick Capture State
  const [quickTitle, setQuickTitle] = useState("");
  const [quickContent, setQuickContent] = useState("");
  const [quickCapturing, setQuickCapturing] = useState(false);

  // Modals
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [editingNote, setEditingNote] = useState<NoteItem | null>(null);
  const [noteFormData, setNoteFormData] = useState({
    title: "",
    content: "",
    collectionId: "",
    tags: "",
    isPinned: false,
    isFavorite: false,
    sourceUrl: "",
  });

  const [showCollectionModal, setShowCollectionModal] = useState(false);
  const [collectionFormData, setCollectionFormData] = useState({
    name: "",
    description: "",
    color: "indigo",
  });

  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const fetchNotesAndCollections = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchQuery) params.set("q", searchQuery);
      if (activeCollectionId && activeCollectionId !== "all") params.set("collectionId", activeCollectionId);
      if (viewFilter === "favorites") params.set("favorite", "true");
      if (viewFilter === "pinned") params.set("pinned", "true");
      if (viewFilter === "archived") params.set("archived", "true");

      const [notesRes, collsRes] = await Promise.all([
        fetch(`/api/knowledge/notes?${params.toString()}`),
        fetch("/api/knowledge/collections"),
      ]);

      const notesData = await notesRes.json();
      const collsData = await collsRes.json();

      if (notesData.success) setNotes(notesData.data || []);
      if (collsData.success) setCollections(collsData.data || []);
    } catch (err) {
      console.error("Failed to load knowledge data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotesAndCollections();
  }, [activeCollectionId, viewFilter, searchQuery]);

  const handleQuickCapture = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitle.trim()) return;

    try {
      setQuickCapturing(true);
      const res = await fetch("/api/knowledge/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: quickTitle,
          content: quickContent,
          collectionId: activeCollectionId !== "all" ? activeCollectionId : null,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setQuickTitle("");
        setQuickContent("");
        setNotification({ type: "success", message: "Quick note captured!" });
        fetchNotesAndCollections();
      }
    } catch (err) {
      console.error("Quick capture error:", err);
    } finally {
      setQuickCapturing(false);
    }
  };

  const openCreateNoteModal = () => {
    setEditingNote(null);
    setNoteFormData({
      title: "",
      content: "",
      collectionId: activeCollectionId !== "all" ? activeCollectionId : "",
      tags: "",
      isPinned: false,
      isFavorite: false,
      sourceUrl: "",
    });
    setShowNoteModal(true);
  };

  const openEditNoteModal = (note: NoteItem) => {
    setEditingNote(note);
    setNoteFormData({
      title: note.title,
      content: note.content,
      collectionId: note.collectionId || "",
      tags: note.tags || "",
      isPinned: note.isPinned,
      isFavorite: note.isFavorite,
      sourceUrl: note.sourceUrl || "",
    });
    setShowNoteModal(true);
  };

  const handleNoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteFormData.title.trim()) return;

    try {
      setSubmitting(true);
      const url = editingNote
        ? `/api/knowledge/notes/${editingNote.id}`
        : "/api/knowledge/notes";
      const method = editingNote ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(noteFormData),
      });

      const data = await res.json();
      if (data.success) {
        setNotification({
          type: "success",
          message: editingNote ? "Note updated!" : "Note saved to Knowledge Wallet!",
        });
        setShowNoteModal(false);
        fetchNotesAndCollections();
      }
    } catch (err) {
      console.error("Save note error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteNote = async (id: string, title: string) => {
    if (!confirm(`Delete note "${title}"?`)) return;

    try {
      const res = await fetch(`/api/knowledge/notes/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        fetchNotesAndCollections();
      }
    } catch (err) {
      console.error("Delete note error:", err);
    }
  };

  const handleTogglePin = async (note: NoteItem) => {
    try {
      await fetch(`/api/knowledge/notes/${note.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPinned: !note.isPinned }),
      });
      fetchNotesAndCollections();
    } catch (err) {
      console.error("Toggle pin error:", err);
    }
  };

  const handleToggleFavorite = async (note: NoteItem) => {
    try {
      await fetch(`/api/knowledge/notes/${note.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isFavorite: !note.isFavorite }),
      });
      fetchNotesAndCollections();
    } catch (err) {
      console.error("Toggle favorite error:", err);
    }
  };

  const handleToggleArchive = async (note: NoteItem) => {
    try {
      await fetch(`/api/knowledge/notes/${note.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isArchived: !note.isArchived }),
      });
      fetchNotesAndCollections();
    } catch (err) {
      console.error("Toggle archive error:", err);
    }
  };

  const handleCollectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!collectionFormData.name.trim()) return;

    try {
      setSubmitting(true);
      const res = await fetch("/api/knowledge/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(collectionFormData),
      });

      const data = await res.json();
      if (data.success) {
        setShowCollectionModal(false);
        setCollectionFormData({ name: "", description: "", color: "indigo" });
        fetchNotesAndCollections();
      }
    } catch (err) {
      console.error("Create collection error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Personal Knowledge Wallet
            </h1>
            <Badge variant="info">Local Markdown & Docs</Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Capture personal ideas, codes, recipes, procedures, and links in an encrypted, searchable offline vault.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/api/knowledge/export"
            download
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            title="Export all notes and collections"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Notes</span>
          </a>
          <Button
            variant="primary"
            size="sm"
            onClick={openCreateNoteModal}
            className="text-xs font-semibold gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Note</span>
          </Button>
        </div>
      </div>

      {notification && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center justify-between gap-3 ${
            notification.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
              : "bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300"
          }`}
        >
          <span>{notification.message}</span>
          <button
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-slate-600 font-bold"
          >
            ×
          </button>
        </div>
      )}

      {/* Quick Capture Bar */}
      <form
        onSubmit={handleQuickCapture}
        className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs flex flex-col sm:flex-row items-center gap-3"
      >
        <div className="relative flex-1 w-full">
          <input
            type="text"
            value={quickTitle}
            onChange={(e) => setQuickTitle(e.target.value)}
            placeholder="Quick capture note or thought... (Press Enter to save)"
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div className="w-full sm:w-auto flex items-center gap-2 shrink-0">
          <input
            type="text"
            value={quickContent}
            onChange={(e) => setQuickContent(e.target.value)}
            placeholder="Details or URL..."
            className="flex-1 sm:w-48 px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          />
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={quickCapturing || !quickTitle.trim()}
            className="text-xs"
          >
            Capture
          </Button>
        </div>
      </form>

      {/* Collections & Filter Controls */}
      <div className="space-y-3">
        {/* Collection Pill Bar */}
        <div className="flex items-center justify-between gap-3 overflow-x-auto pb-1">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveCollectionId("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-all ${
                activeCollectionId === "all"
                  ? "bg-brand-600 text-white shadow-xs"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
              }`}
            >
              All Notes
            </button>

            {collections.map((col) => (
              <button
                key={col.id}
                type="button"
                onClick={() => setActiveCollectionId(col.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-all flex items-center gap-1.5 ${
                  activeCollectionId === col.id
                    ? "bg-brand-600 text-white shadow-xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                }`}
              >
                <Folder className="w-3.5 h-3.5" />
                <span>{col.name}</span>
                {col._count && (
                  <span className="opacity-70 text-[10px]">({col._count.notes})</span>
                )}
              </button>
            ))}

            <button
              type="button"
              onClick={() => setShowCollectionModal(true)}
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-brand-600 dark:text-brand-400 border border-dashed border-brand-300 hover:bg-brand-50 dark:hover:bg-brand-950/40 shrink-0 flex items-center gap-1"
            >
              <FolderPlus className="w-3.5 h-3.5" />
              <span>New Collection</span>
            </button>
          </div>
        </div>

        {/* Search & Status Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notes by title, content, or tags..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          <div className="flex items-center gap-1 text-xs">
            {(["all", "pinned", "favorites", "archived"] as const).map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setViewFilter(filter)}
                className={`px-2.5 py-1 rounded-lg font-semibold capitalize transition-all ${
                  viewFilter === filter
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Notes Grid */}
      {loading ? (
        <div className="py-12 text-center text-sm text-slate-400 animate-pulse">
          Loading knowledge notes...
        </div>
      ) : notes.length === 0 ? (
        <div className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-md rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 p-12 text-center">
          <BookOpen className="w-10 h-10 mx-auto text-slate-400 mb-3" />
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            No notes found
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            Organize instructions, Wi-Fi keys, account setup procedures, book quotes, and project blueprints.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={openCreateNoteModal}
            className="mt-4 text-xs"
          >
            Create Note
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {notes.map((note) => {
            const tagList = note.tags ? note.tags.split(",").map((t) => t.trim()) : [];

            return (
              <div
                key={note.id}
                className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {note.collection && (
                        <Badge variant="outline">{note.collection.name}</Badge>
                      )}
                      {note.isPinned && (
                        <span className="text-[10px] bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded font-bold flex items-center gap-0.5">
                          <Pin className="w-3 h-3" /> Pinned
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleTogglePin(note)}
                        className={`p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 ${
                          note.isPinned ? "text-amber-500" : "text-slate-400"
                        }`}
                        title="Pin note"
                      >
                        <Pin className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleToggleFavorite(note)}
                        className={`p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 ${
                          note.isFavorite ? "text-amber-400 fill-amber-400" : "text-slate-400"
                        }`}
                        title="Favorite"
                      >
                        <Star className={`w-3.5 h-3.5 ${note.isFavorite ? "fill-current" : ""}`} />
                      </button>
                    </div>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1">
                    {note.title}
                  </h3>

                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 line-clamp-4 whitespace-pre-wrap">
                    {note.content}
                  </p>

                  {note.sourceUrl && (
                    <a
                      href={note.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-1 text-[11px] text-brand-600 hover:underline truncate max-w-full"
                    >
                      <ExternalLink className="w-3 h-3 shrink-0" />
                      <span className="truncate">{note.sourceUrl}</span>
                    </a>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {tagList.map((tag) => (
                      <span
                        key={tag}
                        className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 text-[10px]"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => openEditNoteModal(note)}
                      className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      title="Edit note"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleToggleArchive(note)}
                      className="p-1 text-slate-400 hover:text-amber-600"
                      title={note.isArchived ? "Unarchive" : "Archive"}
                    >
                      <Archive className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteNote(note.id, note.title)}
                      className="p-1 text-slate-400 hover:text-rose-600"
                      title="Delete note"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Note Create/Edit Modal */}
      {showNoteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">
              {editingNote ? "Edit Note" : "New Note"}
            </h3>

            <form onSubmit={handleNoteSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  required
                  value={noteFormData.title}
                  onChange={(e) =>
                    setNoteFormData({ ...noteFormData, title: e.target.value })
                  }
                  placeholder="e.g. Home Wi-Fi Configuration or Investment Checklist"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Collection
                  </label>
                  <select
                    value={noteFormData.collectionId}
                    onChange={(e) =>
                      setNoteFormData({
                        ...noteFormData,
                        collectionId: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="">No Collection</option>
                    {collections.map((col) => (
                      <option key={col.id} value={col.id}>
                        {col.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Tags (Comma-separated)
                  </label>
                  <input
                    type="text"
                    value={noteFormData.tags}
                    onChange={(e) =>
                      setNoteFormData({ ...noteFormData, tags: e.target.value })
                    }
                    placeholder="e.g. personal, setup, finance"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Source / Reference URL (Optional)
                </label>
                <input
                  type="url"
                  value={noteFormData.sourceUrl}
                  onChange={(e) =>
                    setNoteFormData({ ...noteFormData, sourceUrl: e.target.value })
                  }
                  placeholder="https://..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Content (Markdown / Text)
                </label>
                <textarea
                  rows={6}
                  value={noteFormData.content}
                  onChange={(e) =>
                    setNoteFormData({ ...noteFormData, content: e.target.value })
                  }
                  placeholder="Write your note, instructions, checklist..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div className="flex items-center gap-4 pt-1">
                <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={noteFormData.isPinned}
                    onChange={(e) =>
                      setNoteFormData({
                        ...noteFormData,
                        isPinned: e.target.checked,
                      })
                    }
                    className="rounded border-slate-300 text-brand-600"
                  />
                  <span>Pin to Top</span>
                </label>

                <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={noteFormData.isFavorite}
                    onChange={(e) =>
                      setNoteFormData({
                        ...noteFormData,
                        isFavorite: e.target.checked,
                      })
                    }
                    className="rounded border-slate-300 text-brand-600"
                  />
                  <span>Favorite</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowNoteModal(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={submitting}
                  className="text-xs font-semibold"
                >
                  {submitting ? "Saving..." : editingNote ? "Save Changes" : "Save Note"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Collection Create Modal */}
      {showCollectionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">
              New Collection
            </h3>

            <form onSubmit={handleCollectionSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Collection Name *
                </label>
                <input
                  type="text"
                  required
                  value={collectionFormData.name}
                  onChange={(e) =>
                    setCollectionFormData({
                      ...collectionFormData,
                      name: e.target.value,
                    })
                  }
                  placeholder="e.g. Work, House Maintenance, Tech"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={collectionFormData.description}
                  onChange={(e) =>
                    setCollectionFormData({
                      ...collectionFormData,
                      description: e.target.value,
                    })
                  }
                  placeholder="Brief description..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCollectionModal(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={submitting}
                  className="text-xs font-semibold"
                >
                  {submitting ? "Creating..." : "Create Collection"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
