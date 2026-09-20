import fs from "node:fs/promises";

const [inputPath, outputPath, baseUrl, ...cssPaths] = process.argv.slice(2);
if (!inputPath || !outputPath || !baseUrl) {
  throw new Error("Usage: make_static_snapshot.mjs <input> <output> <base-url>");
}

let html = await fs.readFile(inputPath, "utf8");
const capturedCss = (
  await Promise.all(cssPaths.map((cssPath) => fs.readFile(cssPath, "utf8")))
).join("\n");

// Freeze the already-rendered DOM. Running the original SPA scripts would
// replace it with a login redirect in an unauthenticated local renderer.
html = html
  .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
  .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, "");

const freezeStyles = `
<base href="${baseUrl}">
<style>
  html, body { width: 100%; height: 100%; margin: 0; overflow: hidden; }
  * { animation: none !important; transition: none !important; caret-color: transparent !important; }
  ${capturedCss}
</style>`;

html = html.replace(/<head([^>]*)>/i, `<head$1>${freezeStyles}`);
await fs.writeFile(outputPath, html);
