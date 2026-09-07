# Tracking — Ademicon

Rastreamento server-side próprio (Meta CAPI + GA4) rodando dentro da conta
Cloudflare da cliente. Substitui Stape/GTM Server-Side. Baseado no stack
[lucassantiagopsae-dotcom/tracking](https://github.com/lucassantiagopsae-dotcom/tracking)
— a versão importada está em `.tracking-stack-version`.

O que ele entrega: cookies first-party de 400 dias que sobrevivem ao ITP do
Safari, evento de Lead enviado pelo servidor (imune a ad-blocker), e a UTM de
origem gravada junto de cada lead.

---

## ⚠️ Leia isto antes de mexer no site

**O arquivo `_worker.js` foi removido e não pode voltar.**

Um `_worker.js` na pasta de saída coloca o Cloudflare Pages em *Advanced Mode*,
que **desliga a pasta `functions/` inteira** — ou seja, desligaria todo o
tracking de uma vez, sem erro visível.

A lógica de roteamento do link-bio (`link.mapapatrimonial.com.br`) que morava
nele foi movida para o topo de `functions/_middleware.js`, com o mesmo
comportamento. Se precisar mexer no roteamento do link-bio, é lá.

---

## Como está montado

| Camada | Onde | O que faz |
|---|---|---|
| Edge | `functions/_middleware.js` | Roteia o link-bio, gera `_rugido_sid`/`_fbp`/`_fbc`, captura UTMs e `fbclid`, grava em `sessions` |
| Endpoint | `functions/tracker.js` | Recebe os eventos do navegador, faz SHA-256 do PII, dispara Meta CAPI + GA4 |
| Proxy | `functions/scripts/[[path]].js` | Serve o gtag.js como first-party (third-party morre em ad-blocker) |
| Dashboard | `dash/index.html` → `/dash?key=…` | Leads, UTMs e saúde do tracking |
| Banco | `migrations/` → D1 | `sessions`, `event_log` e as demais tabelas |

Nas páginas HTML, o bloco de tracking fica antes do `</head>` e está marcado
com `Tracking Rugido`. O evento de **Lead** dispara no fim do formulário
(função `trackLead()` em `formulario/index.html`), nos dois lados — pixel do
navegador e servidor — com o mesmo `event_id`, para o Meta deduplicar.

### Os IDs de pixel não ficam no HTML

`META_PIXEL_ID` e `GA4_MEASUREMENT_ID` aparecem no HTML como os placeholders
`__META_PIXEL_ID__` e `__GA4_MEASUREMENT_ID__`, e são substituídos **no build**
a partir das variáveis de ambiente do projeto no Cloudflare Pages
(`scripts/build-static-site.mjs`).

Não edite os IDs nas páginas — edite as variáveis de ambiente. Se elas não
estiverem definidas, o site sobe sem pixel no navegador e o build avisa.

---

## O que falta fazer (precisa do dashboard da Cloudflare)

Estes passos exigem acesso à conta Cloudflare da cliente e às contas de anúncio.
Nada aqui pode ser feito pelo repositório.

### 1. Criar o banco D1 e aplicar as migrations

```bash
npx wrangler@latest login
npx wrangler@latest d1 create ademicon-db
```

Copie `wrangler.toml.example` para `wrangler.toml` e preencha os três campos
`__REPLACE_ME_*__` com o nome do projeto e o `database_id` que o comando acima
imprimiu. O `wrangler.toml` é gitignored — não vai para o repositório.

```bash
npx wrangler@latest d1 migrations apply ademicon-db --remote
```

### 2. Ajustar o build do projeto Pages

No projeto `ademicon` → **Settings → Builds**:

- Build command: `npm run build`
- Build output directory: `public_dist`

### 3. Ligar o banco ao projeto

**Settings → Bindings → Add → D1 database**

- Variable name: `DB` (exatamente assim — o código lê `env.DB`)
- Database: `ademicon-db`
- Aplicar em: Production (e Preview, se usar)

### 4. Variáveis de ambiente

**Settings → Environment variables**, todas em Production. Marque *Encrypt*
nas linhas com 🔒.

**Obrigatórias:**

| Nome | Onde pegar | 🔒 |
|---|---|---|
| `META_PIXEL_ID` | Meta Events Manager → seu Pixel → topo da página | não |
| `META_ACCESS_TOKEN` | Events Manager → Pixel → Configurações → Gerar token de acesso | 🔒 |
| `DASH_KEY` | gere com `openssl rand -hex 32` e guarde no gerenciador de senhas | 🔒 |

`META_PIXEL_ID` precisa ficar **sem** encrypt: o build lê essa variável para
injetar o ID nas páginas, e variável encriptada não fica disponível no build.

**Opcionais (GA4 — as duas juntas ou nenhuma):**

| Nome | Onde pegar | 🔒 |
|---|---|---|
| `GA4_MEASUREMENT_ID` | GA4 → Admin → Fluxos de dados (`G-XXXXXXXXXX`) | não |
| `GA4_API_SECRET` | mesmo lugar → Measurement Protocol API secrets → Criar | 🔒 |

Não precisa mexer em `TIMEZONE_OFFSET` nem `DEFAULT_COUNTRY_CODE`: os padrões
já são `-03:00` e `55` (Brasil).

**Não configure** os webhooks de Eduzz/Hotmart/Kiwify — não há checkout neste
site. Sem os slugs, esses endpoints ficam inertes.

### 5. Redeploy

Variável nova não vale para deploy antigo. **Deployments → Retry deployment**,
ou simplesmente faça um push novo.

---

## Como verificar depois de subir

1. Abra o site com `?utm_source=teste&fbclid=abc123` no fim da URL.
2. DevTools → Application → Cookies: devem existir `_rugido_sid`, `_rugido_eid`,
   `_fbp` e `_fbc`.
3. Preencha o formulário com um e-mail de teste.
4. Aba Network: `POST /tracker` deve responder `200` com `{"ok":true}`.
5. Meta Events Manager → Test Events: o `Lead` aparece com o e-mail já
   correspondido via Advanced Matching.
6. Abra `/dash?key=<DASH_KEY>` → aba Leads → a linha deve mostrar
   `utm_source = teste`.

Se algum passo falhar, o diagnóstico hop a hop está em
`docs/tracking/data-flow.md`.

Teste local (sem D1, mas com as Functions rodando de verdade):

```bash
npm run build
npx wrangler@latest pages dev public_dist --port 8899
```

---

## Duas coisas que este trabalho NÃO resolve

**1. As respostas do formulário continuam sem destino.**
`SAVE_ENDPOINT` em `formulario/index.html` ainda está vazio. O tracking grava
que houve um lead e de qual campanha ele veio, mas **não** grava as respostas
do diagnóstico (objetivo, prazo, investimento mensal, país). Hoje elas só vivem
no `sessionStorage` do navegador do próprio lead e se perdem. Precisa de um
destino — CRM, planilha, n8n ou uma tabela nova no próprio D1.

**2. O `vercel.json` está morto.**
O site é servido pelo Cloudflare Pages, que ignora esse arquivo. Os seis
redirects de URLs antigas (`/formulario-ademicon-typeform.html` etc.) que ele
declara **não estão funcionando**. Para valerem no Cloudflare, precisam virar
um arquivo `_redirects` na saída do build.
