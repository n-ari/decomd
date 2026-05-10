import { render } from "../src/index.js";

const source = document.querySelector("#source");
const preview = document.querySelector("#preview");
const status = document.querySelector("#status");

const initialMarkdown = `# Product Overview
<!-- decomd: hero -->
Decorate Markdown previews with readable HTML comment annotations.

## Feature Cards
<!-- decomd: grid(3) -->

### Markdown first
Keep source text easy to review in pull requests.

### Small comments
Add layout behavior with \`<!-- decomd: ... -->\` annotations.

### Static output
Generate plain HTML and CSS for docs, samples, and previews.

## FAQ
<!-- decomd: accordion -->

### Does it need client JavaScript?
No. The generated content uses HTML and CSS.

### Can I use tabs?
Yes. Try changing \`accordion\` to \`tabs\` above.`;

let renderTimer = 0;

source.value = initialMarkdown;
source.addEventListener("input", scheduleRender);

renderNow();

function scheduleRender() {
  status.textContent = "Waiting...";
  window.clearTimeout(renderTimer);
  renderTimer = window.setTimeout(renderNow, 180);
}

function renderNow() {
  try {
    preview.innerHTML = render(source.value, { output: "body" });
    status.textContent = "Rendered";
  } catch (error) {
    preview.replaceChildren(renderError(error));
    status.textContent = "Error";
  }
}

function renderError(error) {
  const message = document.createElement("pre");
  message.className = "render-error";
  message.textContent = error instanceof Error ? error.message : String(error);
  return message;
}
