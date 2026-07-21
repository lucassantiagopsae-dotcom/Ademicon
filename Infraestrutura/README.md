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
- `_arquivo/`: copia antiga da estrutura plana e referencias de design, fora do Git e do deploy.

Esta pasta `Infraestrutura` e a raiz publica do site. As pastas de criativos, videos, PSDs e materiais brutos ficam fora dela ou ignoradas por Git/Vercel para manter o deploy leve.

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

## Deploy no Vercel

Conecte este repositorio no Vercel usando `Infraestrutura` como Root Directory. Framework preset: `Other`.

Build Command: deixe vazio.

Output Directory: deixe vazio ou `.`.
