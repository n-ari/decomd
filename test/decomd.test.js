import assert from "node:assert/strict";
import test from "node:test";
import { render } from "../src/index.js";

test("flex decorates direct child headings", () => {
  const html = render(`# A
<!-- decomd: flex -->
intro
## B
body
## C
body`);

  assert.match(html, /<h1>A<\/h1>/);
  assert.match(html, /decomd-flex/);
  assert.match(html, /<section class="decomd-item"><h2>B<\/h2>/);
  assert.match(html, /<head>[\s\S]*<style>/);
});

test("form replaces an annotated table", () => {
  const html = render(`<!-- decomd: form -->
| label | name | type | default |
| --- | --- | --- | --- |
| Email | email | email | a@example.com |`);

  assert.match(html, /<form class="decomd decomd-form">/);
  assert.match(html, /<input name="email" type="email" value="a@example.com">/);
  assert.doesNotMatch(html, /<table>/);
});

test("hero replaces heading and leading text", () => {
  const html = render(`# Product
<!-- decomd: hero -->
Fast markdown previews.

- next`);

  assert.match(html, /decomd-hero/);
  assert.match(html, /<h1>Product<\/h1>/);
  assert.match(html, /Fast markdown previews\./);
  assert.match(html, /<ul>/);
});

test("hero preserves inline markdown in title and subtitle", () => {
  const html = render(`# **Product**
<!-- decomd: hero -->
Fast **markdown** previews with [docs](https://example.com).`);

  assert.match(html, /<h1><strong>Product<\/strong><\/h1>/);
  assert.match(html, /Fast <strong>markdown<\/strong> previews/);
  assert.match(html, /<a href="https:\/\/example.com">docs<\/a>/);
});

test("grid size creates a column class and bundled css", () => {
  const html = render(`# Languages
<!-- decomd: grid(3) -->

## C
Hello.

## JavaScript
Hello.

## Ruby
Hello.`);

  assert.match(html, /class="decomd decomd-grid decomd-grid-3"/);
  assert.match(html, /\.decomd-grid-3\{grid-template-columns:repeat\(3,minmax\(0,1fr\)\)\}/);
  assert.doesNotMatch(html, /--decomd-grid-min/);
});

test("grid dynamic css is omitted when css is disabled", () => {
  const html = render(`# Languages
<!-- decomd: grid(3) -->

## C
Hello.`, { css: false });

  assert.match(html, /class="decomd decomd-grid decomd-grid-3"/);
  assert.doesNotMatch(html, /\.decomd-grid-3/);
});

test("full render can omit bundled css", () => {
  const html = render("# A", { css: false });

  assert.match(html, /<head><\/head>/);
  assert.doesNotMatch(html, /<style>/);
});

test("body output returns embeddable html with bundled css by default", () => {
  const html = render("# A", { output: "body" });

  assert.match(html, /^<style>/);
  assert.match(html, /<h1>A<\/h1>/);
  assert.doesNotMatch(html, /<!doctype html>/);
  assert.doesNotMatch(html, /<body>/);
});

test("body output can omit bundled css", () => {
  const html = render("# A", { output: "body", css: false });

  assert.equal(html, "<h1>A</h1>\n");
});

test("html input decorates simple markdown-generated sections", () => {
  const html = render(`<h1>A</h1>
<!-- decomd: flex -->
<p>intro</p>
<h2>B</h2>
<p>body</p>
<h2>C</h2>
<p>body</p>`, { input: "html" });

  assert.match(html, /<h1>A<\/h1>/);
  assert.match(html, /decomd-flex/);
  assert.match(html, /<p>intro<\/p>/);
  assert.match(html, /<section class="decomd-item"><h2>B<\/h2>/);
});

test("html input can use a full document body", () => {
  const html = render(`<!doctype html>
<html>
<head><style>body{color:red}</style></head>
<body>
<h1>Product</h1>
<!-- decomd: hero -->
<p>Fast <strong>markdown</strong> previews.</p>
</body>
</html>`, { input: "html", output: "body", css: false });

  assert.match(html, /<section class="decomd decomd-hero">/);
  assert.match(html, /<h1>Product<\/h1>/);
  assert.match(html, /Fast <strong>markdown<\/strong> previews\./);
  assert.doesNotMatch(html, /body\{color:red\}/);
});

test("html input converts markdown tables for form annotations", () => {
  const html = render(`<!-- decomd: form -->
<table>
<thead><tr><th>label</th><th>name</th><th>type</th><th>default</th></tr></thead>
<tbody><tr><td>Email</td><td>email</td><td>email</td><td>a@example.com</td></tr></tbody>
</table>`, { input: "html" });

  assert.match(html, /<form class="decomd decomd-form">/);
  assert.match(html, /<input name="email" type="email" value="a@example.com">/);
  assert.doesNotMatch(html, /<table>/);
});

test("rejects unsafe control-character parser trigger", () => {
  assert.throws(() => render("\t\v\n"), /control-character sequence/);
});
