import { mkdir, readdir, writeFile } from "node:fs/promises";
import { basename, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { renderFile } from "../src/index.js";

const samplesDir = fileURLToPath(new URL("../samples/", import.meta.url));

await mkdir(samplesDir, { recursive: true });

const entries = await readdir(samplesDir);
const markdownFiles = entries.filter((entry) => extname(entry) === ".md").sort();

await Promise.all(markdownFiles.map(async (fileName) => {
  const inputPath = join(samplesDir, fileName);
  const outputPath = join(samplesDir, `${basename(fileName, ".md")}.html`);
  const html = await renderFile(inputPath);
  await writeFile(outputPath, html);
}));

console.log(`Built ${markdownFiles.length} sample HTML file(s).`);
