import { readFile } from "node:fs/promises";
import { marked } from "marked";

const DECOMD_RE = /^<!--\s*decomd:\s*([a-z][a-z0-9_-]*)(?:\((.*?)\))?\s*-->\s*$/i;

export async function renderFile(filePath, options = {}) {
  const input = await readFile(filePath, "utf8");
  return render(input, options);
}

export function render(input, options = {}) {
  const renderOptions = normalizeRenderOptions(options);
  const { tokens, dynamicCss } = transform(input, renderOptions);
  const body = marked.parser(tokens);
  if (renderOptions.output === "body") {
    return renderBodyContent(body, renderOptions, dynamicCss);
  }
  return renderFullDocument(body, renderOptions, dynamicCss);
}

export function transform(input, options = {}) {
  const transformOptions = normalizeRenderOptions(options);
  assertSafeMarkdown(input);
  const markdown = transformOptions.input === "html" ? markdownFromHtml(input) : input;
  const tokens = marked.lexer(markdown, transformOptions.marked);
  const context = { gridColumns: new Set(), tabGroups: [], nextWidgetId: 0 };
  const transformed = transformTokens(tokens, context);
  return { tokens: transformed, dynamicCss: renderDynamicCss(context) };
}

function transformTokens(tokens, context) {
  const output = [];

  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    const annotation = readAnnotation(token);
    const nextIndex = nextContentIndex(tokens, i + 1);

    if (annotation?.name === "form" && tokens[nextIndex]?.type === "table") {
      const html = renderForm(tokens[nextIndex]);
      output.push(htmlToken(html));
      i = nextIndex;
      continue;
    }

    const nextAnnotationIndex = nextContentIndex(tokens, i + 1);
    const nextAnnotation = readAnnotation(tokens[nextAnnotationIndex]);
    if (
      token.type === "heading" &&
      ["flex", "column", "grid", "hero", "accordion", "carousel", "tabs"].includes(nextAnnotation?.name)
    ) {
      const heading = token;
      const sectionStart = nextAnnotationIndex + 1;
      const sectionEnd = findSectionEnd(tokens, sectionStart, heading.depth);
      const sectionBody = tokens.slice(sectionStart, sectionEnd);

      if (nextAnnotation.name === "hero") {
        const { html, rest } = renderHero(heading, sectionBody);
        output.push(htmlToken(html), ...transformTokens(rest, context));
      } else if (nextAnnotation.name === "accordion") {
        const html = renderAccordion(heading, sectionBody);
        output.push(token, htmlToken(html));
      } else if (nextAnnotation.name === "tabs") {
        const html = renderTabs(heading, sectionBody, context);
        output.push(token, htmlToken(html));
      } else if (nextAnnotation.name === "carousel") {
        const html = renderCarousel(heading, sectionBody, context);
        output.push(token, htmlToken(html));
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

function nextContentIndex(tokens, start) {
  let index = start;
  while (tokens[index]?.type === "space") index += 1;
  return index;
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
  const { prefix, chunks } = collectChildSections(heading, sectionBody);

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

function collectChildSections(heading, sectionBody) {
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
  return { prefix, chunks };
}

function renderAccordion(heading, sectionBody) {
  const { prefix, chunks } = collectChildSections(heading, sectionBody);
  const prefixHtml = prefix.length ? marked.parser(prefix) : "";
  const items = chunks
    .map((chunk) => {
      const [childHeading, ...body] = chunk;
      const title = renderInline(childHeading);
      const content = marked.parser(body);
      return `<details class="decomd-item decomd-accordion-item"><summary><span class="decomd-accordion-title">${title}</span></summary><div class="decomd-accordion-content">${content}</div></details>`;
    })
    .join("");

  return `${prefixHtml}<div class="decomd decomd-accordion">${items}</div>`;
}

function renderCarousel(heading, sectionBody, context) {
  const { prefix, chunks } = collectChildSections(heading, sectionBody);
  const prefixHtml = prefix.length ? marked.parser(prefix) : "";
  const groupId = nextWidgetId(context, "carousel");
  const items = chunks
    .map((chunk, index) => {
      const slideId = `${groupId}-${index}`;
      return `<section class="decomd-item decomd-carousel-slide" id="${slideId}">${marked.parser(chunk)}</section>`;
    })
    .join("");
  const nav = chunks
    .map((chunk, index) => {
      const [childHeading] = chunk;
      const slideId = `${groupId}-${index}`;
      const title = stripHtml(renderInline(childHeading));
      return `<a class="decomd-carousel-dot" href="#${slideId}" aria-label="${escapeHtml(title)}"></a>`;
    })
    .join("");

  return `${prefixHtml}<div class="decomd decomd-carousel"><div class="decomd-carousel-viewport">${items}</div><nav class="decomd-carousel-nav" aria-label="Carousel slides">${nav}</nav></div>`;
}

function renderTabs(heading, sectionBody, context) {
  const { prefix, chunks } = collectChildSections(heading, sectionBody);
  const prefixHtml = prefix.length ? marked.parser(prefix) : "";
  const groupId = nextWidgetId(context, "tabs");
  const inputs = chunks.map((_chunk, index) => {
    const tabId = `${groupId}-${index}`;
    const checked = index === 0 ? " checked" : "";
    return `<input class="decomd-tab-input" type="radio" name="${groupId}" id="${tabId}"${checked}>`;
  }).join("");
  const triggers = chunks.map((chunk, index) => {
    const [childHeading, ...body] = chunk;
    const tabId = `${groupId}-${index}`;
    const title = renderInline(childHeading);
    return `<label class="decomd-tab-trigger" for="${tabId}">${title}</label>`;
  }).join("");
  const panels = chunks.map((chunk, index) => {
    const [, ...body] = chunk;
    const tabId = `${groupId}-${index}`;
    const content = marked.parser(body);
    return `<section class="decomd-tab-panel" id="${tabId}-panel">${content}</section>`;
  }).join("");

  context.tabGroups.push({ groupId, count: chunks.length });
  return `${prefixHtml}<div class="decomd decomd-tabs">${inputs}<div class="decomd-tab-list">${triggers}</div><div class="decomd-tab-panels">${panels}</div></div>`;
}

function nextWidgetId(context, prefix) {
  const id = `${prefix}-${context.nextWidgetId}`;
  context.nextWidgetId += 1;
  return id;
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

function stripHtml(value) {
  return String(value).replace(/<[^>]*>/g, "");
}

function markdownFromHtml(html) {
  let source = String(html);
  const comments = [];
  const body = source.match(/<body(?:\s[^>]*)?>([\s\S]*?)<\/body>/i);
  if (body) source = body[1];

  source = source
    .replace(/<style(?:\s[^>]*)?>[\s\S]*?<\/style>/gi, "")
    .replace(/<script(?:\s[^>]*)?>[\s\S]*?<\/script>/gi, "")
    .replace(/<!doctype[^>]*>/gi, "")
    .replace(/<!--\s*decomd:\s*([a-z][a-z0-9_-]*)(?:\((.*?)\))?\s*-->/gi, (_match, name, args) => {
      const suffix = args == null ? "" : `(${args})`;
      const marker = `@@DECOMD_COMMENT_${comments.length}@@`;
      comments.push(`<!-- decomd: ${name}${suffix} -->`);
      return `\n${marker}\n\n`;
    })
    .replace(/<h([1-6])(?:\s[^>]*)?>([\s\S]*?)<\/h\1>/gi, (_match, depth, text) => {
      return `\n${"#".repeat(Number(depth))} ${inlineMarkdownFromHtml(text).trim()}\n\n`;
    })
    .replace(/<p(?:\s[^>]*)?>([\s\S]*?)<\/p>/gi, (_match, text) => {
      return `\n${inlineMarkdownFromHtml(text).trim()}\n\n`;
    })
    .replace(/<hr(?:\s[^>]*)?>/gi, "\n---\n\n")
    .replace(/<pre(?:\s[^>]*)?><code(?:\s[^>]*)?>([\s\S]*?)<\/code><\/pre>/gi, (_match, text) => {
      return `\n\`\`\`\n${decodeHtml(text).replace(/\n$/, "")}\n\`\`\`\n\n`;
    })
    .replace(/<table(?:\s[^>]*)?>([\s\S]*?)<\/table>/gi, (_match, table) => {
      return `\n${markdownTableFromHtml(table)}\n\n`;
    })
    .replace(/<ul(?:\s[^>]*)?>([\s\S]*?)<\/ul>/gi, (_match, list) => {
      return `\n${markdownListFromHtml(list, "-")}\n\n`;
    })
    .replace(/<ol(?:\s[^>]*)?>([\s\S]*?)<\/ol>/gi, (_match, list) => {
      return `\n${markdownListFromHtml(list, "1.")}\n\n`;
    })
    .replace(/<blockquote(?:\s[^>]*)?>([\s\S]*?)<\/blockquote>/gi, (_match, quote) => {
      return inlineMarkdownFromHtml(quote)
        .split(/\r?\n/)
        .map((line) => `> ${line.trim()}`)
        .join("\n");
    })
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(?:section|article|main|div)>/gi, "\n\n")
    .replace(/<(?:section|article|main|div)(?:\s[^>]*)?>/gi, "\n\n")
    .replace(/<\/?[^>]+>/g, "");

  comments.forEach((comment, index) => {
    source = source.replaceAll(`@@DECOMD_COMMENT_${index}@@`, comment);
  });

  return decodeHtml(source).replace(/\n{3,}/g, "\n\n").trimStart();
}

function markdownTableFromHtml(table) {
  const rows = [...table.matchAll(/<tr(?:\s[^>]*)?>([\s\S]*?)<\/tr>/gi)]
    .map(([, row]) => [...row.matchAll(/<t[hd](?:\s[^>]*)?>([\s\S]*?)<\/t[hd]>/gi)]
      .map(([, cell]) => inlineMarkdownFromHtml(cell).trim().replaceAll("|", "\\|")))
    .filter((cells) => cells.length);

  if (!rows.length) return "";
  const [header, ...body] = rows;
  const separator = header.map(() => "---");
  return [header, separator, ...body]
    .map((cells) => `| ${cells.join(" | ")} |`)
    .join("\n");
}

function markdownListFromHtml(list, marker) {
  return [...list.matchAll(/<li(?:\s[^>]*)?>([\s\S]*?)<\/li>/gi)]
    .map(([, item]) => `${marker} ${inlineMarkdownFromHtml(item).trim()}`)
    .join("\n");
}

function inlineMarkdownFromHtml(html) {
  return decodeHtml(String(html)
    .replace(/<strong(?:\s[^>]*)?>([\s\S]*?)<\/strong>/gi, "**$1**")
    .replace(/<b(?:\s[^>]*)?>([\s\S]*?)<\/b>/gi, "**$1**")
    .replace(/<em(?:\s[^>]*)?>([\s\S]*?)<\/em>/gi, "*$1*")
    .replace(/<i(?:\s[^>]*)?>([\s\S]*?)<\/i>/gi, "*$1*")
    .replace(/<code(?:\s[^>]*)?>([\s\S]*?)<\/code>/gi, "`$1`")
    .replace(/<a\s+[^>]*href=(["'])(.*?)\1[^>]*>([\s\S]*?)<\/a>/gi, "[$3]($2)")
    .replace(/<img\s+[^>]*src=(["'])(.*?)\1[^>]*alt=(["'])(.*?)\3[^>]*>/gi, "![$4]($2)")
    .replace(/<img\s+[^>]*alt=(["'])(.*?)\1[^>]*src=(["'])(.*?)\3[^>]*>/gi, "![$2]($4)")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/?[^>]+>/g, ""));
}

function decodeHtml(value) {
  return String(value)
    .replace(/&#(\d+);/g, (_match, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_match, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
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
  const input = options.input ?? "markdown";
  if (!["markdown", "html"].includes(input)) {
    throw new Error(`Unknown input type: ${input}`);
  }

  return {
    output,
    input,
    css: options.css ?? true,
    marked: options.marked
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
  const gridCss = [...context.gridColumns]
    .sort((a, b) => a - b)
    .map((columns) => `.decomd-grid-${columns}{grid-template-columns:repeat(${columns},minmax(0,1fr))}`)
    .join("\n");
  const tabCss = context.tabGroups
    .flatMap(({ groupId, count }) => Array.from({ length: count }, (_value, index) => {
      const tabId = `${groupId}-${index}`;
      return [
        `#${tabId}:checked~.decomd-tab-list label[for="${tabId}"]{background:#111;color:#fff;border-color:#111}`,
        `#${tabId}:checked~.decomd-tab-panels>#${tabId}-panel{display:block}`
      ];
    }).flat())
    .join("\n");
  return [gridCss, tabCss].filter(Boolean).join("\n");
}

export const decomdCss = `
.decomd-flex{display:flex;flex-wrap:wrap;gap:1rem;align-items:stretch}
.decomd-flex>.decomd-item{flex:1 1 18rem}
.decomd-column{display:flex;gap:1rem;align-items:flex-start}
.decomd-column>.decomd-item{flex:1 1 0}
.decomd-grid{display:grid;gap:1rem}
.decomd-carousel{display:grid;gap:.75rem}
.decomd-carousel-viewport{display:grid;grid-auto-flow:column;grid-auto-columns:100%;overflow-x:auto;overscroll-behavior-inline:contain;scroll-snap-type:inline mandatory;scroll-behavior:smooth;border:1px solid #ddd;border-radius:6px}
.decomd-carousel-slide{scroll-snap-align:start;padding:1rem}
.decomd-carousel-nav{display:flex;justify-content:center;gap:.5rem}
.decomd-carousel-dot{inline-size:.625rem;block-size:.625rem;border-radius:999px;background:#bbb}
.decomd-carousel-dot:focus,.decomd-carousel-dot:hover{background:#111;outline:2px solid #111;outline-offset:2px}
.decomd-accordion{display:grid;gap:.5rem}
.decomd-accordion-item{border:1px solid #ddd;border-radius:6px;background:#fff}
.decomd-accordion-item summary{cursor:pointer;list-style:none;padding:.75rem 1rem;font-weight:600}
.decomd-accordion-item summary::-webkit-details-marker{display:none}
.decomd-accordion-title{display:block}
.decomd-accordion-content{padding:0 1rem 1rem}
.decomd-tabs{display:grid;gap:.5rem}
.decomd-tab-input{position:absolute;inline-size:1px;block-size:1px;overflow:hidden;clip:rect(0 0 0 0)}
.decomd-tab-list{display:flex;flex-wrap:wrap;gap:.5rem}
.decomd-tab-trigger{display:grid;place-items:center;min-height:2.5rem;padding:.5rem .75rem;border:1px solid #ddd;border-radius:6px;background:#f7f7f7;cursor:pointer;font-weight:600}
.decomd-tab-panels{border:1px solid #ddd;border-radius:6px;padding:1rem}
.decomd-tab-panel{display:none}
.decomd-item{min-width:0}
.decomd-form{display:grid;gap:.75rem}
.decomd-field{display:grid;gap:.25rem}
.decomd-field input,.decomd-field textarea{font:inherit;padding:.5rem;border:1px solid #bbb;border-radius:4px}
.decomd-hero{text-align:center;margin:6rem auto;max-width:56rem;padding:2rem}
.decomd-hero h1,.decomd-hero h2,.decomd-hero h3,.decomd-hero h4,.decomd-hero h5,.decomd-hero h6{font-size:clamp(2.5rem,8vw,5rem);line-height:1.05;margin:0 0 1rem}
.decomd-hero p{font-size:1.25rem;margin:0;color:#555}
`.trim();
