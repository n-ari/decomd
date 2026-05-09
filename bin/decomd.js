#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { render } from "../src/index.js";

const args = process.argv.slice(2);
let css = true;
let output = "full";
let markdown = null;
let file = null;

for (let i = 0; i < args.length; i += 1) {
  const arg = args[i];
  if (arg === "--full") {
    output = "full";
  } else if (arg === "--body-only") {
    output = "body";
  } else if (arg === "--no-css") {
    css = false;
  } else if (arg === "--markdown") {
    markdown = args[++i] ?? "";
  } else if (arg === "--file") {
    file = args[++i];
  } else if (arg === "--help" || arg === "-h") {
    printHelp();
    process.exit(0);
  } else if (!file) {
    file = arg;
  } else {
    fail(`Unexpected argument: ${arg}`);
  }
}

try {
  const input = markdown ?? await readInput(file);
  const html = render(input, { css, output });
  process.stdout.write(html);
} catch (error) {
  fail(error.message);
}

async function readInput(filePath) {
  if (filePath) {
    return readFile(filePath, "utf8");
  }

  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

function printHelp() {
  process.stdout.write(`Usage:
  decomd [--full] [--file path.md]
  decomd --markdown "# Title..."
  decomd --body-only --file path.md
  decomd --no-css --file path.md

Options:
  --full                 Render the whole markdown document to HTML.
  --body-only            Render only HTML suitable for inserting inside another body.
  --no-css               Do not include the bundled decomd CSS.
  --file <path>          Read markdown from a file.
  --markdown <markdown>  Read markdown from an argument.
`);
}

function fail(message) {
  process.stderr.write(`decomd: ${message}\n`);
  process.exit(1);
}
