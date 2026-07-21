# Deploy

## GitHub

Repositorio de destino:

```text
https://github.com/lucassantiagopsae-dotcom/Ademicon.git
```

Fluxo sugerido:

```bash
git init
git remote add origin https://github.com/lucassantiagopsae-dotcom/Ademicon.git
git add .
git commit -m "Prepare static Ademicon site for Vercel"
git branch -M main
git push -u origin main
```

Se o remote `origin` ja existir:

```bash
git remote set-url origin https://github.com/lucassantiagopsae-dotcom/Ademicon.git
```

## Vercel

1. Importe o repositorio no Vercel.
2. Use `Infraestrutura` como Root Directory.
3. Framework Preset: `Other`.
4. Build Command: vazio.
5. Output Directory: vazio ou `.`.
6. Deploy.

## Rotas principais

- `/`: landing principal.
- `/diagnostico`: landing principal.
- `/formulario`: formulario.
- `/obrigado`: confirmacao.
- `/links`: links da Bianca.
- `/depoimentos`: depoimentos.

## Checklist antes do deploy

```bash
npm run check
```

O comando valida paginas HTML e arquivos locais referenciados.
