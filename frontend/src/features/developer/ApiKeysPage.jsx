import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/api/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { getStatusVariant } from "@/lib/statusVariant";
import { Plus, Copy, Check, BarChart3 } from "lucide-react";

function NewKeyForm({ onCreated, onCancel }) {
  const [label, setLabel] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!label.trim()) {
      setError("Please give this key a label.");
      return;
    }
    setIsSubmitting(true);
    try {
      const { data } = await apiClient.post("/developer/api-keys", { label });
      onCreated(data.data);
    } catch (err) {
      setError(err.response?.data?.message || "Could not create key.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {error && <Alert variant="destructive">{error}</Alert>}
      <div className="space-y-2">
        <Label htmlFor="label">Label</Label>
        <Input
          id="label"
          placeholder="e.g. My Integration"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Spinner className="mr-2 h-4 w-4" />}
          Generate Key
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function NewKeyReveal({ newKey, onDone }) {
  const [copied, setCopied] = useState(false);
  const credential = `${newKey.apiKey}.${newKey.apiSecret}`;

  function handleCopy() {
    navigator.clipboard.writeText(credential);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-3">
      <Alert variant="destructive">This secret is shown only once. Copy it now — it cannot be retrieved again.</Alert>
      <div className="rounded-lg bg-secondary p-3">
        <p className="break-all font-mono text-sm text-foreground">{credential}</p>
      </div>
      <p className="text-xs text-muted-foreground">
        Use it as: <code className="font-mono">Authorization: Bearer {"{this value}"}</code>
      </p>
      <div className="flex gap-2">
        <Button onClick={handleCopy}>
          {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
          {copied ? "Copied" : "Copy"}
        </Button>
        <Button variant="secondary" onClick={onDone}>
          Done
        </Button>
      </div>
    </div>
  );
}

export default function ApiKeysPage() {
  const queryClient = useQueryClient();
  const [showNewForm, setShowNewForm] = useState(false);
  const [revealedKey, setRevealedKey] = useState(null);
  const [webhookEditingId, setWebhookEditingId] = useState(null);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [actionError, setActionError] = useState("");

  const { data: keys, isLoading } = useQuery({
    queryKey: ["api-keys"],
    queryFn: async () => {
      const { data } = await apiClient.get("/developer/api-keys");
      return data.data;
    },
  });

  function handleCreated(newKey) {
    setShowNewForm(false);
    setRevealedKey(newKey);
    queryClient.invalidateQueries({ queryKey: ["api-keys"] });
  }

  async function handleRevoke(id) {
    setActionError("");
    try {
      await apiClient.patch(`/developer/api-keys/${id}/revoke`);
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
    } catch (err) {
      setActionError(err.response?.data?.message || "Could not revoke this key.");
    }
  }

  async function handleSaveWebhook(id) {
    setActionError("");
    try {
      await apiClient.patch(`/developer/api-keys/${id}/webhook`, { webhookUrl });
      setWebhookEditingId(null);
      setWebhookUrl("");
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
    } catch (err) {
      setActionError(err.response?.data?.message || "Could not save webhook URL.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-foreground">API Keys</h1>
          <p className="text-muted-foreground">Generate keys to call the public Elite Hub API.</p>
        </div>
        {!showNewForm && !revealedKey && (
          <Button onClick={() => setShowNewForm(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Key
          </Button>
        )}
      </div>

      {actionError && <Alert variant="destructive">{actionError}</Alert>}

      {showNewForm && (
        <Card>
          <CardHeader>
            <CardTitle>Generate New Key</CardTitle>
          </CardHeader>
          <CardContent>
            <NewKeyForm onCreated={handleCreated} onCancel={() => setShowNewForm(false)} />
          </CardContent>
        </Card>
      )}

      {revealedKey && (
        <Card>
          <CardHeader>
            <CardTitle>New Key Created</CardTitle>
          </CardHeader>
          <CardContent>
            <NewKeyReveal newKey={revealedKey} onDone={() => setRevealedKey(null)} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Spinner className="h-8 w-8 text-primary" />
            </div>
          ) : keys?.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Label</TableHead>
                  <TableHead>Key</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Used</TableHead>
                  <TableHead>Webhook</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {keys.map((key) => (
                  <TableRow key={key.id}>
                    <TableCell className="font-medium">{key.label}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{key.apiKey}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(key.status)}>{key.status}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleString() : "Never"}
                    </TableCell>
                    <TableCell>
                      {webhookEditingId === key.id ? (
                        <div className="flex gap-1">
                          <Input
                            value={webhookUrl}
                            onChange={(e) => setWebhookUrl(e.target.value)}
                            placeholder="https://..."
                            className="h-8 w-40 text-xs"
                          />
                          <Button size="sm" onClick={() => handleSaveWebhook(key.id)}>
                            Save
                          </Button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setWebhookEditingId(key.id);
                            setWebhookUrl(key.webhookUrl || "");
                          }}
                          className="text-xs text-primary hover:underline"
                        >
                          {key.webhookUrl ? "Edit" : "Set webhook"}
                        </button>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Link
                          to={`/dashboard/api/keys/${key.id}/usage`}
                          className="text-muted-foreground hover:text-foreground"
                          title="View usage"
                        >
                          <BarChart3 className="h-4 w-4" />
                        </Link>
                        {key.status === "ACTIVE" && (
                          <Button variant="destructive" size="sm" onClick={() => handleRevoke(key.id)}>
                            Revoke
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="px-6 py-16 text-center text-muted-foreground">
              No API keys yet. Generate one to start integrating.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
