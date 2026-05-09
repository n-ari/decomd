import { readFile } from "node:fs/promises";
import { marked } from "marked";

const DECOMD_RE = /^<!--\s*decomd:\s*([a-z][a-z0-9_-]*)(?:\((.*?)\))?\s*-->\s*$/i;

export async function renderFile(filePath, options = {}) {
  const markdown = await readFile(filePath, "utf8");
  return render(markdown, options);
}

export function render(markdown, options = {}) {
  const renderOptions = normalizeRenderOptions(options);
  const { tokens, dynamicCss } = transform(markdown, options);
  const body = marked.parser(tokens);
  if (renderOptions.output === "body") {
    return renderBodyContent(body, renderOptions, dynamicCss);
  }
  return renderFullDocument(body, renderOptions, dynamicCss);
}

export function transform(markdown, options = {}) {
  assertSafeMarkdown(markdown);
  const tokens = marked.lexer(markdown, options.marked);
  const context = { gridColumns: new Set() };
  const transformed = transformTokens(tokens, context);
  return { tokens: transformed, dynamicCss: renderDynamicCss(context) };
}

function transformTokens(tokens, context) {
  const output = [];

  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    const annotation = readAnnotation(token);

    if (annotation?.name === "form" && tokens[i + 1]?.type === "table") {
      const html = renderForm(tokens[i + 1]);
      output.push(htmlToken(html));
      i += 1;
      continue;
    }

    if (
      token.type === "heading" &&
      ["flex", "column", "grid", "hero"].includes(readAnnotation(tokens[i + 1])?.name)
    ) {
      const heading = token;
      const nextAnnotation = readAnnotation(tokens[i + 1]);
      const sectionEnd = findSectionEnd(tokens, i + 2, heading.depth);
      const sectionBody = tokens.slice(i + 2, sectionEnd);

      if (nextAnnotation.name === "hero") {
        const { html, rest } = renderHero(heading, sectionBody);
        output.push(htmlToken(html), ...transformTokens(rest, context));
      } else {
        const html = renderLayout(heading, sectionBody, nextAnnotation, context);
        output.push(token, htmlToken(html));
      }

      i = sectionEnd - 1;
      continue;
    }

    output.push(token);
  }

  return output;
}

function readAnnotation(token) {
  if (token?.type !== "html") return null;
  const match = token.raw.trim().match(DECOMD_RE);
  if (!match) return null;
  return {
    name: match[1].toLowerCase(),
    args: match[2] ? match[2].split(",").map((arg) => arg.trim()).filter(Boolean) : []
  };
}

function findSectionEnd(tokens, start, depth) {
  for (let i = start; i < tokens.length; i += 1) {
    if (tokens[i].type === "heading" && tokens[i].depth <= depth) {
      return i;
    }
  }
  return tokens.length;
}

function renderLayout(heading, sectionBody, annotation, context) {
  const childDepth = heading.depth + 1;
  const chunks = [];
  let prefix = [];
  let current = null;

  for (const token of sectionBody) {
    if (token.type === "heading" && token.depth === childDepth) {
      if (current) chunks.push(current);
      current = [token];
    } else if (current) {
      current.push(token);
    } else {
      prefix.push(token);
    }
  }

  if (current) chunks.push(current);

  const prefixHtml = prefix.length ? marked.parser(prefix) : "";
  const classNames = ["decomd", `decomd-${annotation.name}`];
  if (annotation.name === "grid") {
    const columns = normalizeGridColumns(annotation.args[0]);
    classNames.push(`decomd-grid-${columns}`);
    context.gridColumns.add(columns);
  }
  const className = classNames.join(" ");
  const items = chunks
    .map((chunk) => `<section class="decomd-item">${marked.parser(chunk)}</section>`)
    .join("");

  return `${prefixHtml}<div class="${className}">${items}</div>`;
}

function normalizeGridColumns(value) {
  const columns = Number.parseInt(value ?? "", 10);
  return Number.isFinite(columns) && columns > 0 ? columns : 1;
}

function renderHero(heading, sectionBody) {
  const subtitleTokens = [];
  let restStart = 0;

  for (; restStart < sectionBody.length; restStart += 1) {
    const token = sectionBody[restStart];
    if (token.type !== "paragraph" && token.type !== "space" && token.type !== "text") {
      break;
    }
    if (token.type !== "space") subtitleTokens.push(token);
  }

  const title = renderInline(heading);
  const subtitle = subtitleTokens.map(renderInline).join("\n").trim();
  const subtitleHtml = subtitle ? `<p>${subtitle}</p>` : "";
  const html = `<section class="decomd decomd-hero"><h${heading.depth}>${title}</h${heading.depth}>${subtitleHtml}</section>`;
  return { html, rest: sectionBody.slice(restStart) };
}

function renderForm(table) {
  const headers = table.header.map((cell) => normalizeHeader(cell.text));
  const rows = table.rows.map((row) => {
    const record = {};
    row.forEach((cell, index) => {
      record[headers[index]] = cell.text.trim();
    });

    const label = record.label || record.name || "";
    const name = record.name || record.label || "";
    const type = record.type || "text";
    const value = record.default || "";
    return { label, name, type, value };
  }).filter((field) => field.label || field.name);

  const fields = rows.map(renderField).join("");
  return `<form class="decomd decomd-form">${fields}</form>`;
}

function renderField(field) {
  const label = escapeHtml(field.label);
  const name = escapeHtml(field.name);
  const type = normalizeInputType(field.type);
  const value = escapeHtml(field.value);

  if (type === "textarea") {
    return `<label class="decomd-field"><span>${label}</span><textarea name="${name}">${value}</textarea></label>`;
  }

  return `<label class="decomd-field"><span>${label}</span><input name="${name}" type="${type}" value="${value}"></label>`;
}

function normalizeHeader(value) {
  const text = value.trim().toLowerCase();
  return ["label", "name", "type", "default"].includes(text) ? text : text;
}

function normalizeInputType(value) {
  const type = String(value || "text").trim().toLowerCase();
  if (type === "textarea") return "textarea";
  return /^[a-z][a-z0-9-]*$/.test(type) ? type : "text";
}

function renderInline(token) {
  if (Array.isArray(token.tokens)) {
    return marked.Parser.parseInline(token.tokens);
  }
  return marked.parseInline(String(token.text ?? ""));
}

function htmlToken(text) {
  return {
    type: "html",
    raw: text,
    text,
    block: true
  };
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function assertSafeMarkdown(markdown) {
  if (String(markdown).includes("\t\v\n")) {
    throw new Error("Input contains a control-character sequence rejected before Markdown parsing.");
  }
}

function normalizeRenderOptions(options) {
  const output = options.output ?? "full";
  if (!["full", "body"].includes(output)) {
    throw new Error(`Unknown output type: ${output}`);
  }

  return {
    output,
    css: options.css ?? true
  };
}

function renderBodyContent(body, options, dynamicCss) {
  return options.css ? `${styleTag(dynamicCss)}\n${body}` : body;
}

function renderFullDocument(body, options, dynamicCss) {
  const css = options.css ? `\n    ${styleTag(dynamicCss).replaceAll("\n", "\n    ")}\n  ` : "";
  return `<!doctype html>
<html>
<head>${css}</head>
<body>
${body}</body>
</html>`;
}

function styleTag(dynamicCss = "") {
  const css = [decomdCss, dynamicCss].filter(Boolean).join("\n");
  return `<style>
${css}
</style>`;
}

function renderDynamicCss(context) {
  return [...context.gridColumns]
    .sort((a, b) => a - b)
    .map((columns) => `.decomd-grid-${columns}{grid-template-columns:repeat(${columns},minmax(0,1fr))}`)
    .join("\n");
}

export const decomdCss = `
.decomd-flex{display:flex;flex-wrap:wrap;gap:1rem;align-items:stretch}
.decomd-flex>.decomd-item{flex:1 1 18rem}
.decomd-column{display:flex;gap:1rem;align-items:flex-start}
.decomd-column>.decomd-item{flex:1 1 0}
.decomd-grid{display:grid;gap:1rem}
.decomd-item{min-width:0}
.decomd-form{display:grid;gap:.75rem}
.decomd-field{display:grid;gap:.25rem}
.decomd-field input,.decomd-field textarea{font:inherit;padding:.5rem;border:1px solid #bbb;border-radius:4px}
.decomd-hero{text-align:center;margin:6rem auto;max-width:56rem;padding:2rem}
.decomd-hero h1,.decomd-hero h2,.decomd-hero h3,.decomd-hero h4,.decomd-hero h5,.decomd-hero h6{font-size:clamp(2.5rem,8vw,5rem);line-height:1.05;margin:0 0 1rem}
.decomd-hero p{font-size:1.25rem;margin:0;color:#555}
`.trim();
