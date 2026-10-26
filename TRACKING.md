# Tracking — Ademicon

Rastreamento server-side próprio (Meta CAPI + GA4) rodando dentro da conta
Cloudflare da cliente. Substitui Stape/GTM Server-Side. Baseado no stack
[lucassantiagopsae-dotcom/tracking](https://github.com/lucassantiagopsae-dotcom/tracking)
— a versão importada está em `.tracking-stack-version`.

O que ele entrega: cookies first-party de 400 dias que sobrevivem ao ITP do
Safari, evento de Lead enviado pelo servidor (imune a ad-blocker), UTM de
origem gravada junto de cada lead e retorno de etapas-chave do CRM para a Meta.

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
| CRM webhook | `functions/webhook/crm/highlevel/<slug>` | Recebe mudancas de etapa do CRM e devolve eventos para a Meta |
| Proxy | `functions/scripts/[[path]].js` | Serve o gtag.js como first-party (third-party morre em ad-blocker) |
| Dashboard | `dash/index.html` -> `/dash?key=...` | Leads, UTMs e saude do tracking |
| Banco | `migrations/` -> D1 | `sessions`, `event_log`, `crm_log` e as demais tabelas |

Nas páginas HTML, o bloco de tracking fica antes do `</head>` e está marcado
com `Tracking Rugido`. O evento de **Lead** dispara no fim do formulário
(função `trackLead()` em `formulario/index.html`). O servidor confirma primeiro
`200` com `{"ok":true}`; somente então o pixel do navegador dispara com o mesmo
`event_id`, para o Meta deduplicar. Chamadas concorrentes compartilham uma única
promessa e retries reutilizam o mesmo ID, evitando dupla contagem.

### Os IDs de pixel não ficam no HTML

`META_PIXEL_ID` e `GA4_MEASUREMENT_ID` aparecem no HTML como os placeholders
`__META_PIXEL_ID__` e `__GA4_MEASUREMENT_ID__`, e são substituídos **no build**
a partir das variáveis de ambiente do projeto no Cloudflare Pages
(`scripts/build-static-site.mjs`).

Não edite os IDs nas páginas — edite as variáveis de ambiente. Se elas não
estiverem definidas, o site sobe sem pixel no navegador e o build avisa.

---

## Estado atual: NO AR e funcionando

Provisionado e verificado em producao em 07/09/2026. Nada aqui esta pendente.

| Item | Estado |
|---|---|
| Banco D1 `ademicon-db` | criado (`ff93ad40-d130-461f-b927-fd159b0f7d86`, regiao ENAM) |
| 14 migrations | aplicadas |
| Binding `DB` no projeto Pages | ligado em Production |
| Build command / output | `npm run build` / `public_dist` |
| `META_PIXEL_ID` | ja existia, texto plano (o build precisa ler) |
| `META_ACCESS_TOKEN` | ja existia, encriptada |
| `DASH_KEY` | gerada e gravada como secret |
| Deploy | `5f1bf2b`, sucesso |

Verificacao feita contra `https://pg.mapapatrimonial.com.br`:

- Cookies `_rugido_sid`, `_rugido_eid`, `_fbp`, `_fbc` sendo gravados, com
  `fb.2.` — o indice correto para dominio `.com.br`.
- UTM e `fbclid` persistidos na tabela `sessions`.
- Formulario preenchido de ponta a ponta: o Meta respondeu
  `{"events_received":1}` ao Lead, com `utm_source` e `utm_campaign` amarrados.
- `/api/*` retorna 401 sem a chave e 200 com ela.
- Link-bio intacto: raiz serve a pagina da Bianca, outras rotas redirecionam
  para `/links/`, e os endpoints de tracking passam sem rewrite.

O lead de teste foi apagado do D1 depois da verificacao. Um evento de Lead de
teste permanece registrado no Events Manager do Meta — nao da para apagar de
la, e e esperado.

### Dashboard

```
https://pg.mapapatrimonial.com.br/dash/?key=<DASH_KEY>
```

A chave atual e `1234`, definida a pedido do cliente para facilitar o acesso.

> **Atencao:** este painel expone e-mail, telefone e nome completo dos leads em
> texto puro, e uma chave curta e trivial de adivinhar. Se o volume de leads
> crescer ou o endereco vazar, troque por uma chave forte:
>
> ```bash
> node -e 'console.log(require("crypto").randomBytes(32).toString("hex"))'
> npx wrangler pages secret put DASH_KEY --project-name ademicon
> ```
>
> Trocar a chave exige um redeploy para valer (variavel nova nao se aplica a
> deploy existente).

### Unico opcional nao configurado: GA4

`GA4_MEASUREMENT_ID` e `GA4_API_SECRET` nao existem no projeto. Sem elas o
GA4 e simplesmente pulado — Meta funciona normalmente. Para ligar, adicione as
duas em **Settings → Environment variables** (a primeira em texto plano, a
segunda encriptada) e refaca o deploy.

### Retorno do CRM para a Meta

O caminho correto para o funil da Ademicon e:

1. A Meta manda o clique para a pagina.
2. O site dispara `Lead` para a Meta e grava o lead no D1 com e-mail, nome,
   telefone, UTMs, `fbp`, `fbc`, IP e user-agent.
3. O lead entra no CRM/pipeline da cliente pelo fluxo comercial existente.
4. Quando a oportunidade muda para uma etapa importante, o CRM chama o webhook
   da Cloudflare.
5. A Cloudflare reencontra o lead original e envia o evento server-side para a
   Meta usando o mesmo contexto de origem.

Pipeline operacional confirmado:

| Etapa no CRM | Evento Meta |
|---|---|
| `Reunião Agendada` | `Schedule` |
| `Venda Realizada` | `Purchase` |

Variaveis que precisam existir em **Cloudflare Pages -> Settings ->
Environment variables**:

| Variavel | Valor |
|---|---|
| `CRM_PROVIDER` | `highlevel` |
| `HIGHLEVEL_WEBHOOK_SLUG` | UUID longo e secreto, usado na URL do webhook |
| `CRM_STAGE_EVENTS` | `{"Reunião Agendada":"Schedule","Venda Realizada":"Purchase"}` |
| `CRM_FUNNEL_EVENTS` | `["Lead","Schedule","Purchase"]` |
| `CRM_CURRENCY` | `BRL` |

URL de webhook:

```text
https://pg.mapapatrimonial.com.br/webhook/crm/highlevel/<HIGHLEVEL_WEBHOOK_SLUG>
```

No CRM, criar dois workflows no pipeline `Pipeline`:

| Workflow | Trigger | Payload minimo |
|---|---|---|
| Ademicon - Meta CAPI - Reuniao Agendada | oportunidade mudou para `Reunião Agendada` | `stage`, `contact_id`, `opportunity_id`, `email`, `phone`, `name`, `value` |
| Ademicon - Meta CAPI - Venda Realizada | oportunidade mudou para `Venda Realizada` | `stage`, `contact_id`, `opportunity_id`, `email`, `phone`, `name`, `value` |

O webhook aceita payloads flexiveis do HighLevel/LeadConnector. Ainda assim,
para reduzir ambiguidade, prefira mandar o campo `stage` literalmente como a
etapa que acionou o workflow.

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

## Duas coisas que continuam em aberto

**1. As respostas completas do diagnostico continuam sem destino unico.**
`SAVE_ENDPOINT` em `formulario/index.html` ainda está vazio. O tracking grava
que houve um lead e de qual campanha ele veio, mas **não** grava as respostas
do diagnóstico (objetivo, prazo, investimento mensal, país). Hoje elas só vivem
no `sessionStorage` do navegador do próprio lead e se perdem. Precisa de um
destino unico — CRM, planilha, n8n ou uma tabela nova no próprio D1.

**2. O `vercel.json` está morto.**
O site é servido pelo Cloudflare Pages, que ignora esse arquivo. Os seis
redirects de URLs antigas (`/formulario-ademicon-typeform.html` etc.) que ele
declara **não estão funcionando**. Para valerem no Cloudflare, precisam virar
um arquivo `_redirects` na saída do build.
