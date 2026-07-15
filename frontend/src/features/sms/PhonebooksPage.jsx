import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import apiClient from "@/api/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { BookUser, Plus, Trash2, ChevronRight } from "lucide-react";

function CreatePhonebookForm({ onCreated, onCancel }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) { setError("Name is required."); return; }
    setSaving(true);
    setError("");
    try {
      const { data } = await apiClient.post("/sms/phonebooks", { name, description });
      onCreated(data.data);
    } catch (err) {
      setError(err.response?.data?.message || "Could not create phonebook.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardContent className="p-5">
        <form onSubmit={handleSubmit} className="space-y-3">
          {error && <Alert variant="destructive">{error}</Alert>}
          <div className="space-y-1.5">
            <Label htmlFor="pb-name">Name</Label>
            <Input
              id="pb-name"
              placeholder="e.g. VIP Customers"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pb-desc">Description (optional)</Label>
            <Input
              id="pb-desc"
              placeholder="e.g. Top 500 customers from Q1"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={saving}>
              {saving && <Spinner className="mr-2 h-4 w-4" />}
              Create
            </Button>
            <Button type="button" variant="secondary" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export default function PhonebooksPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [msg, setMsg] = useState({ type: "", text: "" });

  const { data: phonebooks, isLoading } = useQuery({
    queryKey: ["phonebooks"],
    queryFn: async () => {
      const { data } = await apiClient.get("/sms/phonebooks");
      return data.data;
    },
  });

  function handleCreated() {
    setShowForm(false);
    queryClient.invalidateQueries({ queryKey: ["phonebooks"] });
    queryClient.invalidateQueries({ queryKey: ["phonebooks-summary"] });
  }

  async function handleDelete(e, id) {
    e.preventDefault(); // prevent Link navigation
    e.stopPropagation();
    if (!window.confirm("Delete this phonebook and all its contacts?")) return;
    setDeletingId(id);
    setMsg({ type: "", text: "" });
    try {
      await apiClient.delete(`/sms/phonebooks/${id}`);
      queryClient.invalidateQueries({ queryKey: ["phonebooks"] });
      queryClient.invalidateQueries({ queryKey: ["phonebooks-summary"] });
      setMsg({ type: "ok", text: "Phonebook deleted." });
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-foreground">Phonebooks</h1>
          <p className="text-muted-foreground">
            Save contact groups and reuse them across campaigns.
          </p>
        </div>
        {!showForm && (
          <Button onClick={() => setShowForm(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Phonebook
          </Button>
        )}
      </div>

      {msg.text && (
        <Alert variant={msg.type === "error" ? "destructive" : "default"}>{msg.text}</Alert>
      )}

      {showForm && (
        <CreatePhonebookForm
          onCreated={handleCreated}
          onCancel={() => setShowForm(false)}
        />
      )}

      {phonebooks?.length ? (
        <div className="space-y-3">
          {phonebooks.map((pb) => (
            <Link
              key={pb.id}
              to={`/dashboard/sms/phonebooks/${pb.id}`}
              className="flex items-center justify-between rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/50 hover:bg-secondary"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <BookUser className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{pb.name}</p>
                  {pb.description && (
                    <p className="text-xs text-muted-foreground">{pb.description}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {pb.contactCount} contact{pb.contactCount !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => handleDelete(e, pb.id)}
                  disabled={deletingId === pb.id}
                  className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  title="Delete phonebook"
                >
                  {deletingId === pb.id
                    ? <Spinner className="h-4 w-4" />
                    : <Trash2 className="h-4 w-4" />}
                </button>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </Link>
          ))}
        </div>
      ) : (
        !showForm && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-20 text-center">
            <BookUser className="h-10 w-10 text-muted-foreground" />
            <p className="mt-3 text-sm font-medium text-foreground">No phonebooks yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Create one to save contact groups you use regularly.
            </p>
            <Button className="mt-4" onClick={() => setShowForm(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New Phonebook
            </Button>
          </div>
        )
      )}
    </div>
  );
}
