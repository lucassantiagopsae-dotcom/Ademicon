# Ademicon Diagnostico Patrimonial

Site estatico pronto para deploy no Vercel.

## Estrutura publica

- `index.html`: landing principal.
- `formulario-ademicon-typeform.html`: formulario estilo Typeform.
- `obrigado.html`: pagina de confirmacao.
- `links-bianca-chechelaki.html`: pagina de links.
- `depoimentos-ademicon.html`: pagina de depoimentos.
- `assets/`: imagens usadas pelas paginas.
- `vercel.json`: rotas limpas, headers e redirects.

As pastas de criativos, videos, PSDs e materiais brutos ficam ignoradas por Git/Vercel para manter o deploy leve.

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

Conecte este repositorio no Vercel usando a raiz do projeto. Framework preset: `Other`.

Build Command: deixe vazio.

Output Directory: deixe vazio ou `.`.
