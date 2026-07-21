import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";

const root = resolve(".");
const port = Number(process.env.PORT || 3000);

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};

const cleanRoutes = {
  "/": "/index.html",
  "/diagnostico": "/index.html",
  "/formulario": "/formulario/index.html",
  "/obrigado": "/obrigado/index.html",
  "/links": "/links/index.html",
  "/depoimentos": "/depoimentos/index.html"
};

function resolveRequest(urlPath) {
  const cleanPath = decodeURIComponent(urlPath.split("?")[0]);
  const routedPath = cleanRoutes[cleanPath] || cleanPath;
  const normalized = normalize(routedPath).replace(/^(\.\.[/\\])+/, "");
  let filePath = resolve(join(root, normalized));

  if (!filePath.startsWith(root)) {
    return null;
  }

  if (existsSync(filePath) && statSync(filePath).isDirectory()) {
    filePath = join(filePath, "index.html");
  }

  if (!existsSync(filePath) && !extname(filePath)) {
    const indexPath = join(filePath, "index.html");
    const htmlPath = `${filePath}.html`;
    if (existsSync(indexPath)) filePath = indexPath;
    else if (existsSync(htmlPath)) filePath = htmlPath;
  }

  return filePath;
}

const server = createServer((request, response) => {
  const filePath = resolveRequest(request.url || "/");

  if (!filePath || !existsSync(filePath) || statSync(filePath).isDirectory()) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }

  response.writeHead(200, {
    "Content-Type": mimeTypes[extname(filePath)] || "application/octet-stream"
  });
  createReadStream(filePath).pipe(response);
});

server.listen(port, () => {
  console.log(`Ademicon site rodando em http://localhost:${port}`);
});
