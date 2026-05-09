# decomd
<!-- decomd: hero -->
**Deco**rate **M**ark**d**own previews with small HTML comment annotations while keeping the source readable.

---

View the rendered HTML on GitHub Pages:
[README.html](https://n-ari.github.io/decomd/README.html)

## Usage
<!-- decomd: column -->

### Library

```sh
npm install decomd
```

Use the library when another Node.js tool or preview pipeline already has Markdown content in memory, or when it should read Markdown from a file path.

```js
import {
  render,
  renderFile,
  decomdCss
} from "decomd";

const html = render(markdown);
const fileHtml = await renderFile("README.md");
const bodyHtml = render(markdown, { output: "body" });
const htmlWithoutCss = render(markdown, { css: false });
```

`render` and `renderFile` return a full HTML document by default. Use `output: "body"` to return HTML that can be inserted inside another document body. Bundled CSS is included by default: full output places it in the document head, and body output places it before the rendered content. Set `css: false` to exclude it. `decomdCss` exposes the same CSS string for custom bundling.

### CLI

Use the CLI from `npx` when converting files, piping Markdown, or checking what a decomd annotation produces.

```sh
npx decomd --file example.md
npx decomd --markdown "# Title"
npx decomd --body-only --file example.md
npx decomd --no-css --file example.md
```

`--full` is the default and emits a standalone HTML document. Use `--body-only` to emit HTML suitable for embedding inside another document body. Use `--no-css` to exclude the bundled CSS.

## Annotations
<!-- decomd: flex -->

### `flex`

Place `<!-- decomd: flex -->` directly below a heading to group its direct child heading sections into wrapping blocks. This is useful for feature lists, service menus, or any section where the number of items should adapt to the available width.

Generated HTML uses a wrapper with `decomd decomd-flex`. Each grouped child heading section is wrapped in `decomd-item`, so customize layout with selectors such as `.decomd-flex` and `.decomd-flex > .decomd-item`.

### `column`

Place `<!-- decomd: column -->` directly below a heading to arrange its direct child heading sections as columns. This is useful for comparing a small number of related options side by side.

Generated HTML uses a wrapper with `decomd decomd-column`. Each column is wrapped in `decomd-item`, so customize widths, gaps, and responsive behavior with selectors such as `.decomd-column` and `.decomd-column > .decomd-item`.

### `grid(size_x)`

Place `<!-- decomd: grid(3) -->` directly below a heading to arrange its direct child heading sections in a grid with 3 columns. The argument is the number of columns.

Generated HTML uses a wrapper with `decomd decomd-grid decomd-grid-${size_x}`. When bundled CSS is enabled, decomd adds the matching column style for the grid classes used in the rendered document. Each grid cell is wrapped in `decomd-item`, so customize the grid with selectors such as `.decomd-grid`, `.decomd-grid-3`, and `.decomd-grid > .decomd-item`.

Sample: [grid.md](samples/grid.md), [grid.html](https://n-ari.github.io/decomd/samples/grid.html)

### `form`

Place `<!-- decomd: form -->` immediately before a Markdown table with `label`, `name`, `type`, and `default` columns. decomd replaces that table with form fields. Add separate inline HTML or JavaScript for buttons, clipboard behavior, or submit handling.

Generated HTML uses `form.decomd.decomd-form`. Each field is wrapped in `label.decomd-field`, with a `span` for the label text and either an `input` or `textarea` for the control. Customize form spacing and controls with selectors such as `.decomd-form`, `.decomd-field`, `.decomd-field input`, and `.decomd-field textarea`.

Sample: [form.md](samples/form.md), [form.html](https://n-ari.github.io/decomd/samples/form.html)

### `hero`

Place `<!-- decomd: hero -->` directly below a heading to turn that heading and the following text content into a hero section. The heading becomes the main text, and the leading paragraph text becomes the subtitle.

Generated HTML uses `section.decomd.decomd-hero`. The original heading level is preserved inside the hero, and the subtitle is rendered as a `p` when leading text exists. Customize the presentation with selectors such as `.decomd-hero`, `.decomd-hero h1`, `.decomd-hero h2`, and `.decomd-hero p`.

## License

MIT
