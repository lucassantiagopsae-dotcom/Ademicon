import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(".");
const output = join(root, "public_dist");

const publicEntries = [
  "index.html",
  "formulario",
  "obrigado",
  "links",
  "depoimentos",
  "assets"
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

console.log(`Site estatico gerado em ${output}`);
