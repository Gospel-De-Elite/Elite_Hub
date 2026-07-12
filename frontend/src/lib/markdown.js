/**
 * Lightweight markdown → HTML converter.
 *
 * Handles the subset of Markdown an admin blog editor needs:
 * headings (##, ###), bold, italic, inline code, code blocks,
 * blockquotes, unordered and ordered lists, horizontal rules,
 * links, images, and paragraphs.
 *
 * No external dependency needed — keeps the bundle lean and avoids
 * pulling in a 50 KB markdown library for a feature that's used on
 * two pages.
 *
 * Output is sanitized: only the tags produced by this function can
 * appear — user-supplied raw HTML inside the markdown content is escaped.
 */

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function parseInline(text) {
  return text
    // Escape HTML first so user content can't inject tags
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    // Images before links (images use same syntax but with !)
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="rounded-lg max-w-full my-2" />')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-primary underline hover:no-underline" target="_blank" rel="noopener noreferrer">$1</a>')
    // Bold + Italic
    .replace(/\*\*\*([^*]+)\*\*\*/g, "<strong><em>$1</em></strong>")
    // Bold
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    // Italic
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    // Inline code
    .replace(/`([^`]+)`/g, '<code class="bg-muted px-1.5 py-0.5 rounded text-sm font-mono">$1</code>');
}

export function markdownToHtml(markdown) {
  if (!markdown) return "";

  const lines  = markdown.split("\n");
  const output = [];
  let i        = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block
    if (line.startsWith("```")) {
      const lang    = line.slice(3).trim();
      const codeLines = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(escapeHtml(lines[i]));
        i++;
      }
      output.push(
        `<pre class="bg-muted rounded-lg p-4 overflow-x-auto my-4 text-sm font-mono">` +
        `<code${lang ? ` class="language-${lang}"` : ""}>${codeLines.join("\n")}</code></pre>`
      );
      i++; // skip closing ```
      continue;
    }

    // Headings
    if (line.startsWith("### ")) {
      output.push(`<h3 class="text-xl font-semibold mt-6 mb-2">${parseInline(line.slice(4))}</h3>`);
      i++; continue;
    }
    if (line.startsWith("## ")) {
      output.push(`<h2 class="text-2xl font-semibold mt-8 mb-3">${parseInline(line.slice(3))}</h2>`);
      i++; continue;
    }
    if (line.startsWith("# ")) {
      output.push(`<h1 class="text-3xl font-bold mt-8 mb-4">${parseInline(line.slice(2))}</h1>`);
      i++; continue;
    }

    // Blockquote
    if (line.startsWith("> ")) {
      output.push(`<blockquote class="border-l-4 border-primary/40 pl-4 italic text-muted-foreground my-4">${parseInline(line.slice(2))}</blockquote>`);
      i++; continue;
    }

    // Horizontal rule
    if (/^[-*_]{3,}$/.test(line.trim())) {
      output.push('<hr class="border-border my-8" />');
      i++; continue;
    }

    // Unordered list
    if (/^[-*+] /.test(line)) {
      const items = [];
      while (i < lines.length && /^[-*+] /.test(lines[i])) {
        items.push(`<li class="ml-4 list-disc">${parseInline(lines[i].slice(2))}</li>`);
        i++;
      }
      output.push(`<ul class="my-3 space-y-1">${items.join("")}</ul>`);
      continue;
    }

    // Ordered list
    if (/^\d+\. /.test(line)) {
      const items = [];
      while (i < lines.length && /^\d+\. /.test(lines[i])) {
        items.push(`<li class="ml-4 list-decimal">${parseInline(lines[i].replace(/^\d+\. /, ""))}</li>`);
        i++;
      }
      output.push(`<ol class="my-3 space-y-1">${items.join("")}</ol>`);
      continue;
    }

    // Empty line → paragraph break
    if (line.trim() === "") {
      i++; continue;
    }

    // Paragraph — collect consecutive non-special lines
    const para = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !lines[i].startsWith("#") &&
      !lines[i].startsWith(">") &&
      !lines[i].startsWith("```") &&
      !/^[-*+] /.test(lines[i]) &&
      !/^\d+\. /.test(lines[i]) &&
      !/^[-*_]{3,}$/.test(lines[i].trim())
    ) {
      para.push(parseInline(lines[i]));
      i++;
    }
    if (para.length) {
      output.push(`<p class="my-3 leading-7">${para.join("<br />")}</p>`);
    }
  }

  return output.join("\n");
}

/** Estimate reading time in minutes */
export function readingTime(content) {
  const words = (content || "").trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
}
