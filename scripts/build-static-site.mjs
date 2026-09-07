import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { extname, join, resolve } from "node:path";

const root = resolve(".");
const output = join(root, "public_dist");

// _worker.js foi removido de proposito: um _worker.js na pasta de saida coloca
// o Cloudflare Pages em "Advanced Mode" e desliga a pasta functions/ inteira,
// onde vive todo o tracking. O roteamento do link-bio agora esta em
// functions/_middleware.js.
const publicEntries = [
  "index.html",
  "formulario",
  "obrigado",
  "links",
  "depoimentos",
  "assets",
  "dash"
];

rmSync(output, { recursive: true, force: true });
mkdirSync(output, { recursive: true });

for (const entry of publicEntries) {
  const source = join(root, entry);
  if (!existsSync(source)) {
    throw new Error(`Arquivo ou pasta publica ausente: ${entry}`);
  }

  cpSync(source, join(output, entry), { recursive: true });
}

/* ------------------------------------------------------------------ *
 * Injecao dos IDs de tracking
 *
 * O Pixel do Meta e o Measurement ID do GA4 aparecem no HTML como
 * placeholders e sao substituidos aqui, no build, a partir das variaveis
 * de ambiente do projeto no Cloudflare Pages. Assim os IDs ficam em um
 * lugar so (as env vars do projeto), junto com os do lado servidor, em
 * vez de espalhados pelas paginas.
 *
 * Se a variavel nao estiver definida, o placeholder vira string vazia e o
 * snippet da pagina simplesmente nao inicializa — util em dev local.
 * ------------------------------------------------------------------ */
const injections = {
  __META_PIXEL_ID__: process.env.META_PIXEL_ID || "",
  __GA4_MEASUREMENT_ID__: process.env.GA4_MEASUREMENT_ID || ""
};

function listHtml(directory) {
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const full = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...listHtml(full));
    else if (entry.isFile() && extname(entry.name) === ".html") files.push(full);
  }
  return files;
}

let injected = 0;
for (const file of listHtml(output)) {
  const original = readFileSync(file, "utf8");
  let html = original;
  for (const [placeholder, value] of Object.entries(injections)) {
    html = html.split(placeholder).join(value);
  }
  if (html !== original) {
    writeFileSync(file, html);
    injected += 1;
  }
}

const missing = Object.entries(injections)
  .filter(([, value]) => !value)
  .map(([placeholder]) => placeholder.replace(/^__|__$/g, ""));

console.log(`Site estatico gerado em ${output}`);
console.log(`IDs de tracking injetados em ${injected} pagina(s).`);
if (missing.length) {
  console.warn(`AVISO: variavel(is) de ambiente ausente(s) no build: ${missing.join(", ")}.`);
  console.warn("As paginas vao subir sem pixel/GA4 no navegador (o lado servidor continua funcionando).");
}
