const LINK_BIO_HOST = "link.mapapatrimonial.com.br";
const LINK_BIO_PATH = "/links/";

const PASSTHROUGH_PREFIXES = [
  "/assets/",
  "/cdn-cgi/"
];

const PASSTHROUGH_FILES = [
  "/favicon.ico",
  "/robots.txt",
  "/sitemap.xml"
];

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  if (url.hostname.toLowerCase() !== LINK_BIO_HOST) {
    return context.next();
  }

  if (isPassthroughPath(url.pathname)) {
    return context.next();
  }

  if (url.pathname === "/" || url.pathname === "/index.html" || url.pathname === "/links" || url.pathname === LINK_BIO_PATH) {
    const assetUrl = new URL(request.url);
    assetUrl.pathname = LINK_BIO_PATH;
    return env.ASSETS.fetch(new Request(assetUrl, request));
  }

  const redirectUrl = new URL(request.url);
  redirectUrl.pathname = LINK_BIO_PATH;
  redirectUrl.search = "";
  return Response.redirect(redirectUrl, 302);
}

function isPassthroughPath(pathname) {
  return PASSTHROUGH_PREFIXES.some((prefix) => pathname.startsWith(prefix))
    || PASSTHROUGH_FILES.includes(pathname);
}
