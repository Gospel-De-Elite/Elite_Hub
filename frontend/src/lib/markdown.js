/**
 * Lightweight markdown → HTML converter.
 *
 * BUGS FIXED from v1:
 *   - Infinite loop when a line starting with * or - has no space after it
 *     (paragraph collector never advanced i, spinning forever)
 *   - Horizontal rule regex matched single * or - characters, which should
 *     be treated as plain text not HR
 *   - Added explicit i++ safety guard at the bottom of the main while loop
 *     so any unhandled line can never stall the parser
 */

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function parseInline(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    // Images before links
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="rounded-lg max-w-full my-2" />')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-primary underline hover:no-underline" target="_blank" rel="noopener noreferrer">$1</a>')
    // Bold + Italic
    .replace(/\*\*\*([^*\n]+)\*\*\*/g, "<strong><em>$1</em></strong>")
    // Bold
    .replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>")
    // Italic — only match when surrounded by word chars or punctuation, NOT bare *
    .replace(/(?<!\*)\*(?!\*)([^*\n]+)(?<!\*)\*(?!\*)/g, "<em>$1</em>")
    // Inline code
    .replace(/`([^`\n]+)`/g, '<code class="bg-muted px-1.5 py-0.5 rounded text-sm font-mono">$1</code>');
}

export function markdownToHtml(markdown) {
  if (!markdown) return "";

  const lines  = markdown.split("\n");
  const output = [];
  let i = 0;

  while (i < lines.length) {
    const line    = lines[i];
    const trimmed = line.trim();

    // ── Fenced code block ─────────────────────────────────────────────────
    if (line.startsWith("```")) {
      const lang      = line.slice(3).trim();
      const codeLines = [];
      i++;
      // Safety: cap code block scan at 500 lines to prevent runaway loops
      let cap = 0;
      while (i < lines.length && !lines[i].startsWith("```") && cap < 500) {
        codeLines.push(escapeHtml(lines[i]));
        i++;
        cap++;
      }
      output.push(
        `<pre class="bg-muted rounded-lg p-4 overflow-x-auto my-4 text-sm font-mono">` +
        `<code${lang ? ` class="language-${lang}"` : ""}>${codeLines.join("\n")}</code></pre>`
      );
      i++; // skip closing ```
      continue;
    }

    // ── Headings ──────────────────────────────────────────────────────────
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

    // ── Blockquote ────────────────────────────────────────────────────────
    if (line.startsWith("> ")) {
      output.push(`<blockquote class="border-l-4 border-primary/40 pl-4 italic text-muted-foreground my-4">${parseInline(line.slice(2))}</blockquote>`);
      i++; continue;
    }

    // ── Horizontal rule — must be 3+ of ONLY the same char, nothing else ──
    // Fix: require the line to contain ONLY dashes, asterisks, or underscores
    // and be at least 3 chars. A single * or - with no space must NOT match.
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      output.push('<hr class="border-border my-8" />');
      i++; continue;
    }

    // ── Unordered list ────────────────────────────────────────────────────
    // Requires "- " or "* " or "+ " (char THEN space) — bare * or - won't match
    if (/^[-*+] /.test(line)) {
      const items = [];
      while (i < lines.length && /^[-*+] /.test(lines[i])) {
        items.push(`<li class="ml-4 list-disc">${parseInline(lines[i].slice(2))}</li>`);
        i++;
      }
      output.push(`<ul class="my-3 space-y-1 list-disc pl-4">${items.join("")}</ul>`);
      continue;
    }

    // ── Ordered list ──────────────────────────────────────────────────────
    if (/^\d+\. /.test(line)) {
      const items = [];
      while (i < lines.length && /^\d+\. /.test(lines[i])) {
        items.push(`<li class="ml-4 list-decimal">${parseInline(lines[i].replace(/^\d+\. /, ""))}</li>`);
        i++;
      }
      output.push(`<ol class="my-3 space-y-1 list-decimal pl-4">${items.join("")}</ol>`);
      continue;
    }

    // ── GFM Table ─────────────────────────────────────────────────────────
    // Detected by: current line has |, next line is a separator (|---|---| or ---)
    if (
      line.includes("|") &&
      i + 1 < lines.length &&
      /^[|\s\-:]+$/.test(lines[i + 1])
    ) {
      // Parse header
      const headerCells = line
        .split("|")
        .map((c) => c.trim())
        .filter((c) => c !== "");

      // Parse alignment from separator row
      const sepCells = lines[i + 1]
        .split("|")
        .map((c) => c.trim())
        .filter((c) => c !== "");
      const aligns = sepCells.map((s) => {
        if (/^:-+:$/.test(s)) return "center";
        if (/^-+:$/.test(s))  return "right";
        return "left";
      });

      i += 2; // skip header + separator

      // Parse body rows
      const bodyRows = [];
      while (i < lines.length && lines[i].includes("|") && lines[i].trim() !== "") {
        const cells = lines[i]
          .split("|")
          .map((c) => c.trim())
          .filter((c) => c !== "");
        bodyRows.push(cells);
        i++;
      }

      const thHtml = headerCells
        .map((cell, ci) => {
          const align = aligns[ci] || "left";
          return `<th class="px-4 py-2 text-left font-semibold border border-border bg-muted" style="text-align:${align}">${parseInline(cell)}</th>`;
        })
        .join("");

      const tbodyHtml = bodyRows
        .map((row) => {
          const tds = headerCells.map((_, ci) => {
            const align = aligns[ci] || "left";
            const val   = row[ci] ?? "";
            return `<td class="px-4 py-2 border border-border" style="text-align:${align}">${parseInline(val)}</td>`;
          }).join("");
          return `<tr class="even:bg-muted/40">${tds}</tr>`;
        })
        .join("");

      output.push(
        `<div class="overflow-x-auto my-4">` +
        `<table class="w-full border-collapse text-sm">` +
        `<thead><tr>${thHtml}</tr></thead>` +
        `<tbody>${tbodyHtml}</tbody>` +
        `</table></div>`
      );
      continue;
    }

    // ── Empty line ────────────────────────────────────────────────────────
    if (trimmed === "") {
      i++; continue;
    }

    // ── Paragraph ─────────────────────────────────────────────────────────
    // Collect consecutive lines that don't start any block-level element.
    const para     = [];
    const startI   = i;
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !lines[i].startsWith("#") &&
      !lines[i].startsWith(">") &&
      !lines[i].startsWith("```") &&
      !/^[-*+] /.test(lines[i]) &&
      !/^\d+\. /.test(lines[i]) &&
      !/^(-{3,}|\*{3,}|_{3,})$/.test(lines[i].trim()) &&
      // Stop at table rows so they aren't swallowed as paragraph text
      !(lines[i].includes("|") && i + 1 < lines.length && /^[|\s\-:]+$/.test(lines[i + 1]))
    ) {
      para.push(parseInline(lines[i]));
      i++;
    }

    // Safety guard: if nothing was consumed (shouldn't happen but just in case)
    // advance i to prevent an infinite loop.
    if (i === startI) {
      i++;
      continue;
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
