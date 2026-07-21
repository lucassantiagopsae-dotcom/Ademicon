# Ademicon Diagnostico Patrimonial

Site estatico pronto para deploy no Vercel.

## Estrutura publica

- `index.html`: landing principal.
- `formulario/index.html`: formulario estilo Typeform.
- `obrigado/index.html`: pagina de confirmacao.
- `links/index.html`: pagina de links.
- `depoimentos/index.html`: pagina de depoimentos.
- `assets/`: imagens usadas pelas paginas.
- `vercel.json`: rotas limpas, headers e redirects.
- `Infraestrutura/_arquivo/`: copia antiga da estrutura plana e referencias de design, fora do Git e do deploy local.

Esta raiz do repositorio e a raiz publica do site. As pastas de criativos, videos, PSDs e materiais brutos ficam ignoradas por Git/Vercel para manter o deploy leve.

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

Conecte este repositorio no Vercel usando a raiz do repositorio como Root Directory. Framework preset: `Other`.

Build Command: `npm run build`.

Output Directory: `public_dist`.
