# Ademicon Diagnostico Patrimonial

Site estatico servido pelo **Cloudflare Pages** (projeto `ademicon`), com
rastreamento server-side proprio de Meta CAPI e GA4.

> **Nao recrie o arquivo `_worker.js`.** Um `_worker.js` na pasta de saida
> coloca o Pages em Advanced Mode e desliga a pasta `functions/` inteira, o
> que derrubaria todo o tracking silenciosamente. O roteamento do link-bio que
> vivia nele agora esta em `functions/_middleware.js`. Detalhes em
> [TRACKING.md](TRACKING.md).

## Estrutura publica

- `index.html`: landing principal.
- `formulario/index.html`: formulario estilo Typeform.
- `obrigado/index.html`: pagina de confirmacao.
- `links/index.html`: pagina de links.
- `depoimentos/index.html`: pagina de depoimentos.
- `assets/`: imagens usadas pelas paginas.
- `functions/`: Cloudflare Pages Functions — middleware de atribuicao,
  endpoint `/tracker`, proxy do gtag e API do dashboard. Ver `TRACKING.md`.
- `migrations/`: schema do banco D1 usado pelo tracking.
- `dash/index.html`: dashboard de leads e UTMs, servido em `/dash`.
- `vercel.json`: legado do Vercel. O site hoje e servido pelo **Cloudflare
  Pages**, que ignora esse arquivo — os redirects declarados nele nao estao
  ativos.
- `_arquivo/`: copia antiga da estrutura plana e referencias de design, fora do Git e do deploy local.
- `_materiais-brutos/`: criativos, videos, auditorias e materiais de trabalho, fora do Git e do deploy local.

Esta pasta `Infraestrutura` e a raiz publica do site. As pastas de criativos, videos, PSDs e materiais brutos ficam organizadas dentro dela, mas ignoradas por Git/Vercel para manter o deploy leve.

## Rodar localmente

```bash
npm start
```

Depois abra:

```text
http://localhost:3000
```

## Validar antes de subir

```bash
npm run check
```

## Gerar saida de deploy

```bash
npm run build
```

## Deploy no Vercel

Conecte este repositorio no Vercel usando `Infraestrutura` como Root Directory. Framework preset: `Other`.

Build Command: `npm run build`.

Output Directory: `public_dist`.

## Tracking

O rastreamento (Meta CAPI, GA4, cookies first-party, dashboard de leads) tem
documentacao propria em [TRACKING.md](TRACKING.md), incluindo os passos que
ainda precisam ser feitos no painel da Cloudflare.
