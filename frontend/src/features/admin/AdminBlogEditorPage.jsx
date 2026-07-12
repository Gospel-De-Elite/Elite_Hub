/**
 * AdminBlogEditorPage — /admin/blog/new and /admin/blog/:id/edit
 *
 * Split-pane markdown editor:
 *   Left  → write (textarea)
 *   Right → live preview (rendered markdown)
 *
 * Features:
 *   - Title, slug (auto-generated, editable), excerpt, cover image URL
 *   - Live preview tab / split-pane on desktop
 *   - Auto-save to draft every 30 seconds while content changes
 *   - Publish / Unpublish toggle
 *   - Responsive — single pane on mobile, split on md+
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate, Link }              from "react-router-dom";
import { useQuery, useMutation, useQueryClient }     from "@tanstack/react-query";
import apiClient         from "@/api/client";
import { markdownToHtml } from "@/lib/markdown";
import { Card, CardContent } from "@/components/ui/card";
import { Button }   from "@/components/ui/button";
import { Input }    from "@/components/ui/input";
import { Label }    from "@/components/ui/label";
import { Alert }    from "@/components/ui/alert";
import { Badge }    from "@/components/ui/badge";
import { Spinner }  from "@/components/ui/spinner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Save, Eye, EyeOff, ArrowLeft, RefreshCw } from "lucide-react";

const AUTOSAVE_INTERVAL = 30_000; // 30 seconds

function generateSlugLocal(title) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 200);
}

export default function AdminBlogEditorPage() {
  const { id }   = useParams(); // undefined = new post
  const navigate = useNavigate();
  const qc       = useQueryClient();
  const isEdit   = Boolean(id);

  const [form, setForm] = useState({
    title: "", slug: "", excerpt: "", coverImageUrl: "", content: "",
  });
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [status, setStatus]   = useState("DRAFT");
  const [saved, setSaved]     = useState(true);
  const [saveMsg, setSaveMsg] = useState("");
  const [error, setError]     = useState("");
  const [preview, setPreview] = useState(false); // mobile preview toggle
  const lastSavedContent      = useRef("");
  const postIdRef             = useRef(id || null);

  // Load existing post when editing
  const { isLoading } = useQuery({
    queryKey: ["admin-blog-edit", id],
    enabled:  isEdit,
    queryFn:  async () => {
      const { data } = await apiClient.get(`/blog/admin/posts/${id}`);
      return data.data;
    },
    onSuccess: (post) => {
      setForm({
        title:        post.title,
        slug:         post.slug,
        excerpt:      post.excerpt,
        coverImageUrl: post.coverImageUrl || "",
        content:      post.content,
      });
      setStatus(post.status);
      setSlugManuallyEdited(true); // don't auto-rewrite slug on load
      lastSavedContent.current = post.content;
    },
  });

  // Save (create or update) mutation
  const saveMutation = useMutation({
    mutationFn: async (payload) => {
      if (postIdRef.current) {
        return apiClient.patch(`/blog/admin/posts/${postIdRef.current}`, payload);
      } else {
        return apiClient.post("/blog/admin/posts", payload);
      }
    },
    onSuccess: (res) => {
      const post = res.data.data;
      postIdRef.current        = post.id;
      lastSavedContent.current = form.content;
      setSaved(true);
      setSaveMsg("Saved");
      setTimeout(() => setSaveMsg(""), 2000);
      qc.invalidateQueries({ queryKey: ["admin-blog-posts"] });
    },
    onError: (e) => {
      setError(e.response?.data?.message || "Save failed.");
    },
  });

  // Publish / Unpublish mutation
  const publishMutation = useMutation({
    mutationFn: async () => {
      const pid = postIdRef.current;
      if (!pid) throw new Error("Save the post before publishing.");
      const endpoint = status === "PUBLISHED"
        ? `/blog/admin/posts/${pid}/unpublish`
        : `/blog/admin/posts/${pid}/publish`;
      return apiClient.patch(endpoint);
    },
    onSuccess: (res) => {
      setStatus(res.data.data.status);
      qc.invalidateQueries({ queryKey: ["admin-blog-posts"] });
    },
    onError: (e) => setError(e.response?.data?.message || "Action failed."),
  });

  // Auto-generate slug from title
  useEffect(() => {
    if (slugManuallyEdited) return;
    setForm((f) => ({ ...f, slug: generateSlugLocal(f.title) }));
  }, [form.title, slugManuallyEdited]);

  // Mark unsaved on content change
  useEffect(() => {
    setSaved(form.content === lastSavedContent.current);
  }, [form.content]);

  // Autosave every 30s when unsaved
  useEffect(() => {
    const interval = setInterval(() => {
      if (!saved && form.title && form.content) {
        saveMutation.mutate(form);
      }
    }, AUTOSAVE_INTERVAL);
    return () => clearInterval(interval);
  }, [saved, form]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    if (name === "slug") setSlugManuallyEdited(true);
  }, []);

  function handleSave() {
    if (!form.title.trim()) { setError("Title is required."); return; }
    if (!form.content.trim()) { setError("Content is required."); return; }
    if (!form.excerpt.trim()) { setError("Excerpt is required."); return; }
    setError("");
    saveMutation.mutate(form);
  }

  const previewHtml = markdownToHtml(form.content);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner className="h-8 w-8 text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            to="/admin/blog"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Blog Posts
          </Link>
          <h1 className="mt-1 font-display text-xl font-semibold text-foreground">
            {isEdit ? "Edit Post" : "New Post"}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {/* Status badge */}
          <Badge variant={status === "PUBLISHED" ? "success" : "default"}>
            {status}
          </Badge>

          {/* Saved indicator */}
          {!saved && (
            <span className="text-xs text-muted-foreground">Unsaved changes</span>
          )}
          {saveMsg && (
            <span className="text-xs text-green-600 dark:text-green-400">✓ {saveMsg}</span>
          )}

          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            disabled={saveMutation.isPending}
            onClick={handleSave}
          >
            {saveMutation.isPending ? <Spinner className="h-4 w-4" /> : <Save className="h-4 w-4" />}
            Save draft
          </Button>

          <Button
            size="sm"
            className="gap-1.5"
            variant={status === "PUBLISHED" ? "secondary" : "default"}
            disabled={publishMutation.isPending || !postIdRef.current}
            onClick={() => publishMutation.mutate()}
          >
            {publishMutation.isPending
              ? <Spinner className="h-4 w-4" />
              : status === "PUBLISHED"
              ? <EyeOff className="h-4 w-4" />
              : <Eye className="h-4 w-4" />}
            {status === "PUBLISHED" ? "Unpublish" : "Publish"}
          </Button>
        </div>
      </div>

      {error && <Alert variant="destructive">{error}</Alert>}

      {/* Meta fields */}
      <Card>
        <CardContent className="grid gap-4 p-4 sm:grid-cols-2 sm:p-6">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              name="title"
              value={form.title}
              onChange={handleChange}
              placeholder="Your post title…"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="slug">
              Slug{" "}
              <span className="text-xs text-muted-foreground">(auto-generated)</span>
            </Label>
            <div className="flex gap-2">
              <Input
                id="slug"
                name="slug"
                value={form.slug}
                onChange={handleChange}
                placeholder="your-post-slug"
                className="font-mono text-sm"
              />
              <Button
                variant="ghost"
                size="sm"
                className="shrink-0"
                title="Reset to auto-generated"
                onClick={() => {
                  setSlugManuallyEdited(false);
                  setForm((f) => ({ ...f, slug: generateSlugLocal(f.title) }));
                }}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">/blog/{form.slug || "…"}</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="coverImageUrl">Cover Image URL</Label>
            <Input
              id="coverImageUrl"
              name="coverImageUrl"
              value={form.coverImageUrl}
              onChange={handleChange}
              placeholder="https://…"
              type="url"
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="excerpt">
              Excerpt{" "}
              <span className="text-xs text-muted-foreground">
                ({form.excerpt.length}/500 chars)
              </span>
            </Label>
            <textarea
              id="excerpt"
              name="excerpt"
              value={form.excerpt}
              onChange={handleChange}
              rows={2}
              maxLength={500}
              placeholder="A short summary shown on the blog listing page…"
              className={
                "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm " +
                "placeholder:text-muted-foreground focus-visible:outline-none " +
                "focus-visible:ring-2 focus-visible:ring-ring resize-none"
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Editor / Preview — tabs on mobile, split on md+ */}
      <Card>
        <CardContent className="p-0">
          {/* Mobile: tabs */}
          <div className="md:hidden">
            <Tabs defaultValue="write">
              <TabsList className="w-full rounded-b-none">
                <TabsTrigger value="write"  className="flex-1">Write</TabsTrigger>
                <TabsTrigger value="preview" className="flex-1">Preview</TabsTrigger>
              </TabsList>
              <TabsContent value="write" className="p-0">
                <textarea
                  name="content"
                  value={form.content}
                  onChange={handleChange}
                  rows={24}
                  placeholder="Write your post in Markdown…"
                  className={
                    "w-full rounded-b-xl border-0 bg-background px-4 py-3 font-mono text-sm " +
                    "placeholder:text-muted-foreground focus-visible:outline-none resize-none"
                  }
                />
              </TabsContent>
              <TabsContent value="preview" className="p-4 min-h-[400px]">
                {form.content
                  ? <div className="prose-blog" dangerouslySetInnerHTML={{ __html: previewHtml }} />
                  : <p className="text-muted-foreground text-sm">Nothing to preview yet.</p>
                }
              </TabsContent>
            </Tabs>
          </div>

          {/* Desktop: split pane */}
          <div className="hidden md:grid md:grid-cols-2 md:divide-x md:divide-border">
            <div className="flex flex-col">
              <div className="border-b border-border px-4 py-2">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Markdown
                </span>
              </div>
              <textarea
                name="content"
                value={form.content}
                onChange={handleChange}
                rows={32}
                placeholder="Write your post in Markdown…

# Heading 1
## Heading 2

**Bold**, *italic*, `code`

- Bullet list
1. Numbered list

> Blockquote

```js
// Code block
const hello = 'world';
```"
                className={
                  "flex-1 w-full bg-background px-4 py-3 font-mono text-sm " +
                  "placeholder:text-muted-foreground focus-visible:outline-none resize-none"
                }
              />
            </div>

            <div className="flex flex-col overflow-hidden">
              <div className="border-b border-border px-4 py-2">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Preview
                </span>
              </div>
              <div className="flex-1 overflow-y-auto px-4 py-3">
                {form.content
                  ? <div className="prose-blog" dangerouslySetInnerHTML={{ __html: previewHtml }} />
                  : <p className="text-muted-foreground text-sm">Nothing to preview yet.</p>
                }
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
