import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, extname, join, resolve } from "node:path";

const root = resolve(".");
const htmlFiles = readdirSync(root)
  .filter((file) => extname(file) === ".html")
  .map((file) => join(root, file));

const externalPrefixes = [
  "http://",
  "https://",
  "mailto:",
  "tel:",
  "sms:",
  "whatsapp:",
  "data:",
  "#"
];

const problems = [];

function isExternal(reference) {
  return externalPrefixes.some((prefix) => reference.startsWith(prefix));
}

function cleanReference(reference) {
  return reference
    .replace(/^\/+/, "")
    .split("#")[0]
    .split("?")[0]
    .trim();
}

function checkLocalReference(file, reference) {
  if (!reference || isExternal(reference) || reference.startsWith("javascript:")) return;
  if (reference.includes("${") || reference.includes("{{")) return;

  const clean = cleanReference(reference);
  if (!clean) return;

  const target = resolve(dirname(file), clean);
  if (!target.startsWith(root)) {
    problems.push(`${file}: referencia sai da raiz publica -> ${reference}`);
    return;
  }

  if (!existsSync(target)) {
    problems.push(`${file}: arquivo nao encontrado -> ${reference}`);
  }
}

for (const file of htmlFiles) {
  const html = readFileSync(file, "utf8");
  const refs = [
    ...html.matchAll(/\b(?:href|src)=["']([^"']+)["']/g),
    ...html.matchAll(/url\(["']?([^"')]+)["']?\)/g)
  ];

  for (const match of refs) {
    checkLocalReference(file, match[1]);
  }
}

if (!existsSync(join(root, "index.html"))) {
  problems.push("index.html nao existe na raiz.");
}

const requiredAssets = [
  "assets/logo-ademicon-form.png",
  "assets/hero-familia-patrimonio-ademicon.png",
  "assets/diagnostico-3d-ademicon.png",
  "assets/bianca-referencia-oficial.png"
];

for (const asset of requiredAssets) {
  const target = join(root, asset);
  if (!existsSync(target) || statSync(target).size === 0) {
    problems.push(`asset obrigatorio ausente ou vazio -> ${asset}`);
  }
}

if (problems.length) {
  console.error("Falhas encontradas:");
  for (const problem of problems) console.error(`- ${problem}`);
  process.exit(1);
}

console.log(`OK: ${htmlFiles.length} paginas HTML e assets locais validados.`);
