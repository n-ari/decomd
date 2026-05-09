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

test("rejects unsafe control-character parser trigger", () => {
  assert.throws(() => render("\t\v\n"), /control-character sequence/);
});
