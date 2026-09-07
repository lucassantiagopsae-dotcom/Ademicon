import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, extname, join, relative, resolve, sep } from "node:path";

const root = resolve(".");
// Pastas que nao fazem parte da saida publica validada: arquivo morto,
// materiais de trabalho, entregas de criativos, codigo de edge e docs.
const ignoredDirectories = new Set([
  "_arquivo",
  "_materiais-brutos",
  "entregas",
  "public_dist",
  "node_modules",
  ".git",
  ".vercel",
  ".claude",
  ".agents",
  "docs",
  "functions",
  "migrations",
  "config",
  "scripts",
  "dash"
]);

// Rotas que nao existem como arquivo no disco: sao servidas em runtime pelas
// Cloudflare Pages Functions em functions/. Nao devem ser checadas no FS.
const functionRoutes = [
  "/tracker",
  "/scripts/",
  "/api/",
  "/webhook/",
  "/checkout-session",
  "/dash"
];

function listHtmlFiles(directory) {
  const files = [];

  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!ignoredDirectories.has(entry.name)) {
        files.push(...listHtmlFiles(join(directory, entry.name)));
      }
      continue;
    }

    if (entry.isFile() && extname(entry.name) === ".html") {
      files.push(join(directory, entry.name));
    }
  }

  return files;
}

const htmlFiles = listHtmlFiles(root);

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
  if (functionRoutes.some((route) => reference.startsWith(route))) return;
  if (reference.includes("${") || reference.includes("{{")) return;

  const clean = cleanReference(reference);
  if (!clean) return;

  const base = reference.startsWith("/") ? root : dirname(file);
  const target = resolve(base, clean);
  if (!target.startsWith(root)) {
    problems.push(`${file}: referencia sai da raiz publica -> ${reference}`);
    return;
  }

  if (existsSync(target)) {
    if (statSync(target).isDirectory() && !existsSync(join(target, "index.html"))) {
      problems.push(`${file}: rota sem index.html -> ${reference}`);
    }
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

const requiredPages = [
  "index.html",
  "formulario/index.html",
  "obrigado/index.html",
  "links/index.html",
  "depoimentos/index.html"
];

for (const page of requiredPages) {
  if (!existsSync(join(root, page))) {
    problems.push(`pagina obrigatoria ausente -> ${page}`);
  }
}

const requiredAssets = [
  "assets/logo-ademicon-form.png",
  "assets/hero-familia-patrimonio-ademicon.png",
  "assets/diagnostico-3d-ademicon.png",
  "assets/bianca-referencia-oficial.png",
  "assets/testimonials/amaro.jpg",
  "assets/testimonials/angela.jpg",
  "assets/testimonials/anselmo.jpg",
  "assets/testimonials/cliente-ademicon-2026-07-23.jpg",
  "assets/testimonials/eliel.jpg",
  "assets/testimonials/evelin.jpg",
  "assets/testimonials/gaspar.jpg",
  "assets/testimonials/marcelo.jpg",
  "assets/testimonials/marina.jpg",
  "assets/testimonials/quellison.jpg",
  "assets/testimonials/shirley.jpg",
  "assets/testimonials/wilian-portugal.jpg",
  "assets/testimonials/willian-belgica.jpg",
  "assets/testimonials/videos/amaro.mp4",
  "assets/testimonials/videos/angela.mp4",
  "assets/testimonials/videos/anselmo.mp4",
  "assets/testimonials/videos/cliente-ademicon-2026-07-23.mp4",
  "assets/testimonials/videos/eliel.mp4",
  "assets/testimonials/videos/evelin.mp4",
  "assets/testimonials/videos/gaspar.mp4",
  "assets/testimonials/videos/marcelo.mp4",
  "assets/testimonials/videos/marina.mp4",
  "assets/testimonials/videos/quellison.mp4",
  "assets/testimonials/videos/shirley.mp4",
  "assets/testimonials/videos/wilian-portugal.mp4",
  "assets/testimonials/videos/willian-belgica.mp4"
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

const pageList = htmlFiles.map((file) => relative(root, file).split(sep).join("/")).sort();
console.log(`OK: ${htmlFiles.length} paginas HTML e assets locais validados.`);
console.log(`Paginas: ${pageList.join(", ")}`);
