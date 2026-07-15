import { useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/api/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import {
  ArrowLeft,
  Plus,
  Upload,
  Trash2,
  Megaphone,
  CheckCircle2,
  Search,
} from "lucide-react";

const NG_PHONE_REGEX = /^(\+234|0)[789][01]\d{8}$/;

// ── Add contacts manually ─────────────────────────────────────────────────────

function AddContactsForm({ phonebookId, onAdded }) {
  const [raw, setRaw] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    const lines = raw
      .split(/[\n,]/)
      .map((l) => l.trim())
      .filter(Boolean);

    if (!lines.length) { setError("Enter at least one phone number."); return; }

    // Basic client-side shape — server validates properly
    const contacts = lines.map((l) => {
      const parts = l.split(/\s+/);
      if (parts.length > 1) {
        return { name: parts.slice(0, -1).join(" "), phone: parts[parts.length - 1] };
      }
      return { phone: l };
    });

    setSaving(true);
    setError("");
    try {
      const { data } = await apiClient.post(`/sms/phonebooks/${phonebookId}/contacts`, { contacts });
      onAdded(data.data);
      setRaw("");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to add contacts.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {error && <Alert variant="destructive">{error}</Alert>}
      <div className="space-y-1.5">
        <Label htmlFor="contacts-raw">Phone numbers</Label>
        <textarea
          id="contacts-raw"
          rows={4}
          className="flex w-full rounded-lg border border-input bg-secondary px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          placeholder={"08012345678\nJohn Doe 08087654321\n..."}
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          One number per line. Optionally prefix with a name: <code>John Doe 08012345678</code>
        </p>
      </div>
      <Button type="submit" size="sm" disabled={saving}>
        {saving && <Spinner className="mr-2 h-4 w-4" />}
        Add Contacts
      </Button>
    </form>
  );
}

// ── CSV import ────────────────────────────────────────────────────────────────

function CsvImportForm({ phonebookId, onImported }) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  async function handleFile(file) {
    if (!file) return;
    setError("");
    setResult(null);
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const { data } = await apiClient.post(
        `/sms/phonebooks/${phonebookId}/import-csv`,
        form,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      setResult(data.data);
      onImported();
    } catch (err) {
      setError(err.response?.data?.message || "Import failed. Check the file and try again.");
    } finally {
      setUploading(false);
    }
  }

  if (result) {
    return (
      <div className="flex items-start gap-3 rounded-lg bg-emerald-500/10 p-4">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
        <div className="text-sm">
          <p className="font-medium text-foreground">
            {result.added} contact{result.added !== 1 ? "s" : ""} imported
          </p>
          {result.skipped > 0 && (
            <p className="text-muted-foreground">{result.skipped} duplicates skipped</p>
          )}
          {result.invalidCount > 0 && (
            <p className="text-muted-foreground">{result.invalidCount} invalid rows ignored</p>
          )}
          <button
            className="mt-2 text-xs text-primary hover:underline"
            onClick={() => setResult(null)}
          >
            Import another file
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && <Alert variant="destructive">{error}</Alert>}
      <div
        className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-secondary p-8 transition-colors hover:border-primary/50"
        onClick={() => fileRef.current?.click()}
        onDrop={(e) => { e.preventDefault(); handleFile(e.dataTransfer.files?.[0]); }}
        onDragOver={(e) => e.preventDefault()}
      >
        {uploading ? (
          <Spinner className="h-7 w-7 text-primary" />
        ) : (
          <>
            <Upload className="h-7 w-7 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">Drop a CSV or click to browse</p>
            <p className="text-xs text-muted-foreground">
              Column named "phone", "mobile", or "number" auto-detected
            </p>
          </>
        )}
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function PhonebookDetailPage() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [msg, setMsg] = useState({ type: "", text: "" });

  const { data: phonebook, isLoading } = useQuery({
    queryKey: ["phonebook", id],
    queryFn: async () => {
      const { data } = await apiClient.get(`/sms/phonebooks/${id}`);
      return data.data;
    },
  });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["phonebook", id] });
    queryClient.invalidateQueries({ queryKey: ["phonebooks"] });
    queryClient.invalidateQueries({ queryKey: ["phonebooks-summary"] });
  }

  function handleAdded(result) {
    setMsg({ type: "ok", text: `${result.added} contact${result.added !== 1 ? "s" : ""} added${result.skipped ? `, ${result.skipped} duplicates skipped` : ""}.` });
    setShowAdd(false);
    invalidate();
  }

  async function handleDelete(contactId) {
    setDeletingId(contactId);
    setMsg({ type: "", text: "" });
    try {
      await apiClient.delete(`/sms/phonebooks/${id}/contacts/${contactId}`);
      invalidate();
    } catch (err) {
      setMsg({ type: "error", text: err.response?.data?.message || "Delete failed." });
    } finally {
      setDeletingId(null);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner className="h-8 w-8 text-primary" />
      </div>
    );
  }

  if (!phonebook) return <p className="text-muted-foreground">Phonebook not found.</p>;

  const filtered = search
    ? phonebook.contacts.filter(
        (c) =>
          c.phone.includes(search) ||
          (c.name && c.name.toLowerCase().includes(search.toLowerCase()))
      )
    : phonebook.contacts;

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/dashboard/sms/phonebooks"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Phonebooks
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-semibold text-foreground">{phonebook.name}</h1>
            {phonebook.description && (
              <p className="text-muted-foreground">{phonebook.description}</p>
            )}
            <p className="text-sm text-muted-foreground">
              {phonebook.contactCount} contact{phonebook.contactCount !== 1 ? "s" : ""}
            </p>
          </div>
          <Button asChild>
            <Link to={`/dashboard/sms/campaigns/new?phonebookId=${id}`}>
              <Megaphone className="mr-2 h-4 w-4" />
              Use in Campaign
            </Link>
          </Button>
        </div>
      </div>

      {msg.text && (
        <Alert variant={msg.type === "error" ? "destructive" : "default"}>{msg.text}</Alert>
      )}

      {/* Action cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Plus className="h-4 w-4 text-primary" />
              Add Manually
            </CardTitle>
          </CardHeader>
          <CardContent>
            {showAdd ? (
              <AddContactsForm phonebookId={id} onAdded={handleAdded} />
            ) : (
              <Button size="sm" variant="secondary" onClick={() => { setShowAdd(true); setShowImport(false); }}>
                Enter numbers
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Upload className="h-4 w-4 text-primary" />
              Import from CSV
            </CardTitle>
          </CardHeader>
          <CardContent>
            {showImport ? (
              <CsvImportForm
                phonebookId={id}
                onImported={() => { invalidate(); setShowImport(false); setMsg({ type: "ok", text: "Import complete." }); }}
              />
            ) : (
              <Button size="sm" variant="secondary" onClick={() => { setShowImport(true); setShowAdd(false); }}>
                Upload CSV
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Contact list */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <CardTitle>Contacts</CardTitle>
            <div className="relative ml-auto">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search…"
                className="h-8 w-48 pl-9 text-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filtered.length ? (
            <div className="divide-y divide-border">
              {filtered.map((c) => (
                <div key={c.id} className="flex items-center justify-between px-6 py-3">
                  <div>
                    {c.name && (
                      <p className="text-sm font-medium text-foreground">{c.name}</p>
                    )}
                    <p className={c.name ? "text-xs text-muted-foreground" : "text-sm text-foreground"}>
                      {c.phone}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(c.id)}
                    disabled={deletingId === c.id}
                    className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    {deletingId === c.id
                      ? <Spinner className="h-4 w-4" />
                      : <Trash2 className="h-4 w-4" />}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="px-6 py-12 text-center text-sm text-muted-foreground">
              {search ? "No contacts match your search." : "No contacts yet — add some above."}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
