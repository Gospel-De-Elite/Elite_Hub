/**
 * AdminBlogEditorPage — /admin/blog/new  and  /admin/blog/:id/edit
 *
 * BUGS FIXED from v1:
 *   1. markdownToHtml called on every keystroke → now debounced 300ms
 *      so the preview only rerenders after the user pauses typing,
 *      instead of blocking the main thread on every character.
 *   2. Autosave useEffect had `form` in its dependency array, causing
 *      the interval to be torn down and recreated on every keystroke —
 *      it never actually fired. Fixed with a ref-based approach.
 *
 * NEW in v2:
 *   - Markdown toolbar (H, B, I, ordered list, unordered list, code block,
 *     link) — wraps/inserts syntax around the current selection or at the
 *     cursor, so the user never has to guess what characters to type.
 *   - Word count displayed in the footer of the editor pane.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate, Link }              from "react-router-dom";
import { useQuery, useMutation, useQueryClient }     from "@tanstack/react-query";
import apiClient          from "@/api/client";
import { markdownToHtml } from "@/lib/markdown";
import { Card, CardContent } from "@/components/ui/card";
import { Button }  from "@/components/ui/button";
import { Input }   from "@/components/ui/input";
import { Label }   from "@/components/ui/label";
import { Alert }   from "@/components/ui/alert";
import { Badge }   from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Save, Eye, EyeOff, ArrowLeft, RefreshCw,
  Heading2, Bold, Italic, List, ListOrdered,
  Code, Link as LinkIcon, Quote, Minus, Upload, Image as ImageIcon, Table,
} from "lucide-react";

const AUTOSAVE_INTERVAL = 30_000;
const PREVIEW_DEBOUNCE  = 300;

function generateSlugLocal(title) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 200);
}

// Upload an image file and return the server-side URL
async function uploadBlogImage(file) {
  const formData = new FormData();
  formData.append("image", file);
  const { data } = await apiClient.post("/blog/admin/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data.data.url;
}

// ─── Markdown Toolbar ─────────────────────────────────────────────────────────
/**
 * Inserts or wraps markdown syntax in the textarea.
 * Works with the current selection: if text is selected, it wraps it.
 * If nothing is selected, it inserts a placeholder at the cursor.
 */
function applyFormat(textareaRef, type, onChange) {
  const el    = textareaRef.current;
  if (!el) return;

  const start = el.selectionStart;
  const end   = el.selectionEnd;
  const value = el.value;
  const sel   = value.slice(start, end);

  let before = "";
  let after  = "";
  let placeholder = "";
  let newCursorOffset = null; // where to place cursor after insert

  switch (type) {
    case "h2":
      // Insert heading at the start of the current line
      before = "## ";
      placeholder = sel || "Heading";
      after  = "";
      break;
    case "h3":
      before = "### ";
      placeholder = sel || "Heading";
      after  = "";
      break;
    case "bold":
      before = "**";
      after  = "**";
      placeholder = sel || "bold text";
      break;
    case "italic":
      before = "*";
      after  = "*";
      placeholder = sel || "italic text";
      break;
    case "code":
      if (sel.includes("\n") || !sel) {
        // Block code
        before = "```\n";
        after  = "\n```";
        placeholder = sel || "code here";
      } else {
        // Inline code
        before = "`";
        after  = "`";
        placeholder = sel || "code";
      }
      break;
    case "link":
      before = "[";
      after  = "](url)";
      placeholder = sel || "link text";
      break;
    case "ul":
      // Prefix each selected line with "- "
      if (sel) {
        const wrapped = sel.split("\n").map((l) => `- ${l}`).join("\n");
        const newVal  = value.slice(0, start) + wrapped + value.slice(end);
        onChange({ target: { name: "content", value: newVal } });
        setTimeout(() => {
          el.focus();
          el.setSelectionRange(start, start + wrapped.length);
        }, 0);
        return;
      }
      before = "- ";
      placeholder = "List item";
      break;
    case "ol":
      if (sel) {
        const wrapped = sel.split("\n").map((l, idx) => `${idx + 1}. ${l}`).join("\n");
        const newVal  = value.slice(0, start) + wrapped + value.slice(end);
        onChange({ target: { name: "content", value: newVal } });
        setTimeout(() => {
          el.focus();
          el.setSelectionRange(start, start + wrapped.length);
        }, 0);
        return;
      }
      before = "1. ";
      placeholder = "List item";
      break;
    case "quote":
      if (sel) {
        const wrapped = sel.split("\n").map((l) => `> ${l}`).join("\n");
        const newVal  = value.slice(0, start) + wrapped + value.slice(end);
        onChange({ target: { name: "content", value: newVal } });
        setTimeout(() => {
          el.focus();
          el.setSelectionRange(start, start + wrapped.length);
        }, 0);
        return;
      }
      before = "> ";
      placeholder = "Quoted text";
      break;
    case "hr":
      before = "\n---\n";
      placeholder = "";
      break;
    case "table":
      before = "\n| Header 1 | Header 2 | Header 3 |\n| --- | --- | --- |\n| Cell 1   | Cell 2   | Cell 3   |\n| Cell 4   | Cell 5   | Cell 6   |\n";
      placeholder = "";
      break;
    default:
      return;
  }

  const insert  = before + (sel || placeholder) + after;
  const newVal  = value.slice(0, start) + insert + value.slice(end);

  onChange({ target: { name: "content", value: newVal } });

  // Restore focus and select the inserted placeholder text
  setTimeout(() => {
    el.focus();
    if (sel) {
      // Had a selection — select the whole wrapped result
      el.setSelectionRange(start, start + insert.length);
    } else {
      // No selection — select just the placeholder so the user can
      // immediately type to replace it
      const selStart = start + before.length;
      const selEnd   = selStart + placeholder.length;
      el.setSelectionRange(selStart, selEnd);
    }
  }, 0);
}

function ToolbarButton({ title, onClick, children }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={
        "flex h-7 w-7 items-center justify-center rounded text-muted-foreground " +
        "hover:bg-secondary hover:text-foreground transition-colors"
      }
    >
      {children}
    </button>
  );
}

function Toolbar({ textareaRef, onChange, onUploadInlineImage, isUploadingInline }) {
  const fmt = (type) => applyFormat(textareaRef, type, onChange);

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-border bg-background px-2 py-1.5">
      {/* Headings */}
      <ToolbarButton title="Heading 2  (## )" onClick={() => fmt("h2")}>
        <span className="text-xs font-bold">H2</span>
      </ToolbarButton>
      <ToolbarButton title="Heading 3  (### )" onClick={() => fmt("h3")}>
        <span className="text-xs font-bold">H3</span>
      </ToolbarButton>

      <div className="mx-1 h-4 w-px bg-border" />

      {/* Inline */}
      <ToolbarButton title="Bold  (**text**)" onClick={() => fmt("bold")}>
        <Bold className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton title="Italic  (*text*)" onClick={() => fmt("italic")}>
        <Italic className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton title="Inline / block code  (`code`)" onClick={() => fmt("code")}>
        <Code className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton title="Link  ([text](url))" onClick={() => fmt("link")}>
        <LinkIcon className="h-3.5 w-3.5" />
      </ToolbarButton>

      {/* Inline image upload */}
      <ToolbarButton title="Upload & insert image" onClick={onUploadInlineImage}>
        {isUploadingInline
          ? <Spinner className="h-3.5 w-3.5" />
          : <ImageIcon className="h-3.5 w-3.5 text-primary" />}
      </ToolbarButton>

      <div className="mx-1 h-4 w-px bg-border" />

      {/* Block */}
      <ToolbarButton title="Unordered list  (- item)" onClick={() => fmt("ul")}>
        <List className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton title="Ordered list  (1. item)" onClick={() => fmt("ol")}>
        <ListOrdered className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton title="Blockquote  (> text)" onClick={() => fmt("quote")}>
        <Quote className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton title="Horizontal rule  (--)" onClick={() => fmt("hr")}>
        <Minus className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton title="Insert table" onClick={() => fmt("table")}>
        <Table className="h-3.5 w-3.5" />
      </ToolbarButton>
    </div>
  );
}

// ─── Main Editor Page ─────────────────────────────────────────────────────────

export default function AdminBlogEditorPage() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const qc       = useQueryClient();
  const isEdit   = Boolean(id);

  const [form, setForm] = useState({
    title: "", slug: "", excerpt: "", coverImageUrl: "", content: "",
  });
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [status,  setStatus]  = useState("DRAFT");
  const [saved,   setSaved]   = useState(true);
  const [saveMsg, setSaveMsg] = useState("");
  const [error,   setError]   = useState("");

  // Debounced HTML for the preview pane — avoids running the parser
  // on every single keystroke which was blocking the main thread.
  const [previewHtml, setPreviewHtml] = useState("");

  const textareaRef       = useRef(null);
  const coverFileRef      = useRef(null);
  const inlineFileRef     = useRef(null);
  const lastSavedContent  = useRef("");
  const postIdRef         = useRef(id || null);
  const savedRef          = useRef(true);
  const formRef           = useRef(form);

  // Upload state
  const [isUploadingCover,  setIsUploadingCover]  = useState(false);
  const [isUploadingInline, setIsUploadingInline] = useState(false);

  // Insert image markdown at cursor
  const insertImageMarkdown = useCallback((url, alt = "image") => {
    const el = textareaRef.current;
    if (!el) return;
    const start    = el.selectionStart;
    const end      = el.selectionEnd;
    const markdown = `\n![${alt}](${url})\n`;
    const newVal   = el.value.slice(0, start) + markdown + el.value.slice(end);
    setForm((f) => ({ ...f, content: newVal }));
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + markdown.length, start + markdown.length);
    }, 0);
  }, []);

  async function handleCoverUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploadingCover(true);
      const url = await uploadBlogImage(file);
      setForm((f) => ({ ...f, coverImageUrl: url }));
    } catch {
      setError("Cover image upload failed.");
    } finally {
      setIsUploadingCover(false);
      e.target.value = "";
    }
  }

  async function handleInlineUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploadingInline(true);
      const url = await uploadBlogImage(file);
      insertImageMarkdown(url, file.name.replace(/\.[^.]+$/, ""));
    } catch {
      setError("Image upload failed.");
    } finally {
      setIsUploadingInline(false);
      e.target.value = "";
    }
  }

  async function handlePaste(e) {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        const file = item.getAsFile();
        if (!file) continue;
        try {
          setIsUploadingInline(true);
          const url = await uploadBlogImage(file);
          insertImageMarkdown(url, "pasted-image");
        } catch {
          setError("Pasted image upload failed.");
        } finally {
          setIsUploadingInline(false);
        }
      }
    }
  }

  // Keep refs in sync
  useEffect(() => { savedRef.current = saved; },   [saved]);
  useEffect(() => { formRef.current  = form;  },   [form]);

  // Debounce preview updates — 300ms after the user stops typing
  useEffect(() => {
    const timer = setTimeout(() => {
      setPreviewHtml(markdownToHtml(form.content));
    }, PREVIEW_DEBOUNCE);
    return () => clearTimeout(timer);
  }, [form.content]);

  // Load existing post when editing
  const { isLoading } = useQuery({
    queryKey: ["admin-blog-edit", id],
    enabled:  isEdit,
    queryFn:  async () => {
      const { data } = await apiClient.get(`/blog/admin/posts/${id}`);
      return data.data;
    },
    onSuccess: (post) => {
      const loaded = {
        title:        post.title,
        slug:         post.slug,
        excerpt:      post.excerpt,
        coverImageUrl: post.coverImageUrl || "",
        content:      post.content,
      };
      setForm(loaded);
      setStatus(post.status);
      setSlugManuallyEdited(true);
      lastSavedContent.current = post.content;
      setSaved(true);
    },
  });

  const saveMutation = useMutation({
    mutationFn: (payload) => {
      // Send null for optional fields left blank so express-validator's
      // checkFalsy treats them as absent rather than failing isURL() on "".
      const sanitized = {
        ...payload,
        coverImageUrl: payload.coverImageUrl?.trim() || null,
        slug:          payload.slug?.trim()          || null,
      };
      return postIdRef.current
        ? apiClient.patch(`/blog/admin/posts/${postIdRef.current}`, sanitized)
        : apiClient.post("/blog/admin/posts", sanitized);
    },
    onSuccess: (res) => {
      const post = res.data.data;
      postIdRef.current        = post.id;
      lastSavedContent.current = formRef.current.content;
      setSaved(true);
      setSaveMsg("Saved");
      setTimeout(() => setSaveMsg(""), 2000);
      qc.invalidateQueries({ queryKey: ["admin-blog-posts"] });
    },
    onError: (e) => setError(e.response?.data?.message || "Save failed."),
  });

  const publishMutation = useMutation({
    mutationFn: () => {
      const pid = postIdRef.current;
      if (!pid) throw new Error("Save the post before publishing.");
      const ep = status === "PUBLISHED"
        ? `/blog/admin/posts/${pid}/unpublish`
        : `/blog/admin/posts/${pid}/publish`;
      return apiClient.patch(ep);
    },
    onSuccess: (res) => {
      setStatus(res.data.data.status);
      qc.invalidateQueries({ queryKey: ["admin-blog-posts"] });
    },
    onError: (e) => setError(e.response?.data?.message || "Action failed."),
  });

  // Auto-slug from title (only while slug hasn't been manually edited)
  useEffect(() => {
    if (slugManuallyEdited) return;
    setForm((f) => ({ ...f, slug: generateSlugLocal(f.title) }));
  }, [form.title, slugManuallyEdited]);

  // Mark unsaved when content diverges from last save
  useEffect(() => {
    setSaved(form.content === lastSavedContent.current);
  }, [form.content]);

  // Autosave — uses refs so interval doesn't need to be recreated each render.
  // Requires excerpt too, so we don't trigger a save that will fail backend
  // notEmpty() validation when the excerpt field is still blank.
  useEffect(() => {
    const interval = setInterval(() => {
      const f = formRef.current;
      if (!savedRef.current && f.title?.trim() && f.content?.trim() && f.excerpt?.trim()) {
        saveMutation.mutate(f);
      }
    }, AUTOSAVE_INTERVAL);
    return () => clearInterval(interval);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    if (name === "slug") setSlugManuallyEdited(true);
    if (name === "content") setSaved(false);
  }, []);

  function handleSave() {
    if (!form.title.trim())   { setError("Title is required.");   return; }
    if (!form.content.trim()) { setError("Content is required."); return; }
    if (!form.excerpt.trim()) { setError("Excerpt is required."); return; }
    setError("");
    saveMutation.mutate(form);
  }

  const wordCount = form.content.trim()
    ? form.content.trim().split(/\s+/).length
    : 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner className="h-8 w-8 text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── Page header ───────────────────────────────────────────────── */}
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

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={status === "PUBLISHED" ? "success" : "default"}>
            {status}
          </Badge>

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
            {saveMutation.isPending
              ? <Spinner className="h-4 w-4" />
              : <Save className="h-4 w-4" />}
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

      {/* ── Meta fields ───────────────────────────────────────────────── */}
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
                type="button"
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
            <Label htmlFor="coverImageUrl">Cover Image</Label>
            <div className="flex gap-2">
              <Input
                id="coverImageUrl"
                name="coverImageUrl"
                value={form.coverImageUrl}
                onChange={handleChange}
                placeholder="https://… or upload →"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0 gap-1.5"
                disabled={isUploadingCover}
                onClick={() => coverFileRef.current?.click()}
              >
                {isUploadingCover ? <Spinner className="h-4 w-4" /> : <Upload className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="excerpt">
              Excerpt{" "}
              <span className="text-xs text-muted-foreground">
                ({form.excerpt.length}/500)
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

      {/* Hidden file inputs */}
      <input ref={coverFileRef}  type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />
      <input ref={inlineFileRef} type="file" accept="image/*" className="hidden" onChange={handleInlineUpload} />

      {/* ── Editor / Preview ──────────────────────────────────────────── */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">

          {/* Mobile: tabs */}
          <div className="md:hidden">
            <Tabs defaultValue="write">
              <TabsList className="w-full rounded-none border-b border-border">
                <TabsTrigger value="write"   className="flex-1">Write</TabsTrigger>
                <TabsTrigger value="preview" className="flex-1">Preview</TabsTrigger>
              </TabsList>
              <TabsContent value="write" className="p-0 mt-0">
                <Toolbar
                  textareaRef={textareaRef}
                  onChange={handleChange}
                  onUploadInlineImage={() => inlineFileRef.current?.click()}
                  isUploadingInline={isUploadingInline}
                />
                <textarea
                  ref={textareaRef}
                  name="content"
                  value={form.content}
                  onChange={handleChange}
                  onPaste={handlePaste}
                  rows={24}
                  placeholder="Start writing…"
                  spellCheck
                  className={
                    "w-full bg-background px-4 py-3 font-mono text-sm " +
                    "placeholder:text-muted-foreground focus-visible:outline-none resize-none"
                  }
                />
                <div className="border-t border-border px-4 py-2">
                  <span className="text-xs text-muted-foreground">
                    {wordCount.toLocaleString()} {wordCount === 1 ? "word" : "words"}
                  </span>
                </div>
              </TabsContent>
              <TabsContent value="preview" className="p-4 mt-0 min-h-[400px]">
                {previewHtml
                  ? <div className="prose-blog" dangerouslySetInnerHTML={{ __html: previewHtml }} />
                  : <p className="text-muted-foreground text-sm">Nothing to preview yet.</p>
                }
              </TabsContent>
            </Tabs>
          </div>

          {/* Desktop: split pane */}
          <div className="hidden md:grid md:grid-cols-2 md:divide-x md:divide-border">

            {/* Write pane */}
            <div className="flex flex-col">
              <div className="border-b border-border px-4 py-2 flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Markdown
                </span>
                <span className="text-xs text-muted-foreground">
                  {wordCount.toLocaleString()} {wordCount === 1 ? "word" : "words"}
                </span>
              </div>
              <Toolbar
                textareaRef={textareaRef}
                onChange={handleChange}
                onUploadInlineImage={() => inlineFileRef.current?.click()}
                isUploadingInline={isUploadingInline}
              />
              <textarea
                ref={textareaRef}
                name="content"
                value={form.content}
                onChange={handleChange}
                onPaste={handlePaste}
                rows={28}
                placeholder={
                  "Start writing your post…\n\n" +
                  "Use the toolbar above or type Markdown directly:\n" +
                  "  ## Heading 2\n" +
                  "  **bold**  *italic*  `code`\n" +
                  "  - Bullet list\n" +
                  "  1. Numbered list\n" +
                  "  > Blockquote"
                }
                spellCheck
                className={
                  "flex-1 w-full bg-background px-4 py-3 font-mono text-sm " +
                  "placeholder:text-muted-foreground focus-visible:outline-none resize-none"
                }
              />
            </div>

            {/* Preview pane */}
            <div className="flex flex-col">
              <div className="border-b border-border px-4 py-2">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Preview
                </span>
              </div>
              <div className="flex-1 overflow-y-auto px-4 py-3">
                {previewHtml
                  ? <div className="prose-blog" dangerouslySetInnerHTML={{ __html: previewHtml }} />
                  : (
                    <div className="flex h-full flex-col items-center justify-center gap-2 py-16 text-center">
                      <p className="text-muted-foreground text-sm">Preview will appear here.</p>
                      <p className="text-xs text-muted-foreground">
                        Updates 300ms after you stop typing.
                      </p>
                    </div>
                  )
                }
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
