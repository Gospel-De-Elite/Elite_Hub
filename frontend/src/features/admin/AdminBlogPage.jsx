/**
 * AdminBlogPage — /admin/blog
 * Lists all blog posts (drafts + published) with status badges.
 * Admins can create new posts, edit, publish/unpublish, and delete drafts.
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import apiClient from "@/api/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button }  from "@/components/ui/button";
import { Badge }   from "@/components/ui/badge";
import { Alert }   from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { PlusCircle, Pencil, Eye, EyeOff, Trash2, ExternalLink } from "lucide-react";

function statusVariant(status) {
  return status === "PUBLISHED" ? "success" : "default";
}

export default function AdminBlogPage() {
  const qc             = useQueryClient();
  const [filter, setFilter] = useState(""); // "" | "DRAFT" | "PUBLISHED"
  const [msg, setMsg]  = useState({ type: "", text: "" });

  const { data, isLoading } = useQuery({
    queryKey: ["admin-blog-posts", filter],
    queryFn:  async () => {
      const params = filter ? `?status=${filter}` : "";
      const { data } = await apiClient.get(`/blog/admin/posts${params}`);
      return data.data;
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin-blog-posts"] });

  const publishMutation = useMutation({
    mutationFn: (id) => apiClient.patch(`/blog/admin/posts/${id}/publish`),
    onSuccess:  () => { setMsg({ type: "ok", text: "Post published." }); invalidate(); },
    onError:    (e) => setMsg({ type: "error", text: e.response?.data?.message || "Failed." }),
  });

  const unpublishMutation = useMutation({
    mutationFn: (id) => apiClient.patch(`/blog/admin/posts/${id}/unpublish`),
    onSuccess:  () => { setMsg({ type: "ok", text: "Post unpublished." }); invalidate(); },
    onError:    (e) => setMsg({ type: "error", text: e.response?.data?.message || "Failed." }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => apiClient.delete(`/blog/admin/posts/${id}`),
    onSuccess:  () => { setMsg({ type: "ok", text: "Post deleted." }); invalidate(); },
    onError:    (e) => setMsg({ type: "error", text: e.response?.data?.message || "Failed." }),
  });

  function handleDelete(post) {
    if (!window.confirm(`Delete "${post.title}"? This cannot be undone.`)) return;
    deleteMutation.mutate(post.id);
  }

  const filterBtnCls = (val) =>
    `text-sm px-3 py-1.5 rounded-lg transition-colors ${
      filter === val
        ? "bg-primary text-primary-foreground"
        : "text-muted-foreground hover:bg-secondary"
    }`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-xl font-semibold text-foreground sm:text-2xl">
            Blog Posts
          </h1>
          <p className="text-sm text-muted-foreground">
            Write and publish posts that appear on the public blog.
          </p>
        </div>
        <Link to="/admin/blog/new">
          <Button className="gap-2">
            <PlusCircle className="h-4 w-4" /> New Post
          </Button>
        </Link>
      </div>

      {/* Filter bar */}
      <div className="flex gap-2">
        <button className={filterBtnCls("")}  onClick={() => setFilter("")}>All</button>
        <button className={filterBtnCls("DRAFT")} onClick={() => setFilter("DRAFT")}>Drafts</button>
        <button className={filterBtnCls("PUBLISHED")} onClick={() => setFilter("PUBLISHED")}>Published</button>
      </div>

      {msg.text && (
        <Alert variant={msg.type === "error" ? "destructive" : "default"}>
          {msg.text}
        </Alert>
      )}

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Spinner className="h-8 w-8 text-primary" />
            </div>
          ) : data?.posts?.length ? (
            <div className="divide-y divide-border">
              {data.posts.map((post) => (
                <div
                  key={post.id}
                  className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:gap-4"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-foreground truncate">
                        {post.title}
                      </span>
                      <Badge variant={statusVariant(post.status)}>
                        {post.status}
                      </Badge>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span>/{post.slug}</span>
                      <span>
                        {post.author?.firstName} {post.author?.lastName}
                      </span>
                      {post.publishedAt && (
                        <span>
                          Published {new Date(post.publishedAt).toLocaleDateString()}
                        </span>
                      )}
                      {!post.publishedAt && (
                        <span>
                          Created {new Date(post.createdAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-1">
                      {post.excerpt}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex shrink-0 items-center gap-1.5">
                    <Link to={`/admin/blog/${post.id}/edit`}>
                      <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </Button>
                    </Link>

                    {post.status === "DRAFT" ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1.5 text-xs text-primary"
                        disabled={publishMutation.isPending}
                        onClick={() => publishMutation.mutate(post.id)}
                      >
                        <Eye className="h-3.5 w-3.5" /> Publish
                      </Button>
                    ) : (
                      <>
                        <a
                          href={`/blog/${post.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
                            <ExternalLink className="h-3.5 w-3.5" /> View
                          </Button>
                        </a>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1.5 text-xs text-muted-foreground"
                          disabled={unpublishMutation.isPending}
                          onClick={() => unpublishMutation.mutate(post.id)}
                        >
                          <EyeOff className="h-3.5 w-3.5" /> Unpublish
                        </Button>
                      </>
                    )}

                    {post.status === "DRAFT" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1.5 text-xs text-destructive hover:bg-destructive/10"
                        disabled={deleteMutation.isPending}
                        onClick={() => handleDelete(post)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="px-6 py-16 text-center text-muted-foreground">
              No posts yet.{" "}
              <Link to="/admin/blog/new" className="text-primary hover:underline">
                Create your first post →
              </Link>
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
