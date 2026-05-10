---
name: decomd
description: Create and edit decomd Markdown that uses `<!-- decomd: ... -->` comment annotations to decorate preview HTML. Use when Codex needs to write decomd documents, choose between flex, column, grid, accordion, carousel, tabs, form, and hero annotations, or explain typical decomd usage patterns.
---

# decomd

Use decomd annotations to turn plain Markdown sections into decorated preview HTML while keeping the source document readable.

## Workflow

1. Keep normal Markdown as the source of truth.
2. Add a decomd annotation immediately before the target structure.
3. Choose the smallest annotation that matches the intent.
4. Read the matching reference file only when the feature details are needed.

## Features

- `flex`: Use below a heading to lay out direct child heading sections as wrapping blocks. See [references/feat-flex.md](references/feat-flex.md).
- `column`: Use below a heading to lay out direct child heading sections as side-by-side columns. See [references/feat-column.md](references/feat-column.md).
- `grid(size_x)`: Use below a heading to lay out direct child heading sections in a responsive grid with a minimum item width. See [references/feat-grid.md](references/feat-grid.md).
- `accordion`: Use below a heading to turn direct child heading sections into collapsible disclosure items. See [references/feat-accordion.md](references/feat-accordion.md).
- `carousel`: Use below a heading to turn direct child heading sections into horizontally scrollable carousel items. See [references/feat-carousel.md](references/feat-carousel.md).
- `tabs`: Use below a heading to turn direct child heading sections into tabs. See [references/feat-tabs.md](references/feat-tabs.md).
- `form`: Use immediately before a table with `label`, `name`, `type`, and `default` columns to replace the table with form fields. See [references/feat-form.md](references/feat-form.md).
- `hero`: Use below a heading to replace the heading and leading text content with a hero section. See [references/feat-hero.md](references/feat-hero.md).

## Authoring Notes

- Place `flex`, `column`, `grid(size_x)`, `accordion`, `carousel`, `tabs`, and `hero` directly under the heading they decorate.
- For heading-based layouts, only direct child heading sections are grouped.
- Place `form` directly before the table it replaces.
- Add separate inline HTML or JavaScript when form buttons, clipboard behavior, or submission behavior are required.
