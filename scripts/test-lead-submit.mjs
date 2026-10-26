import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const html = readFileSync(resolve("formulario/index.html"), "utf8");
const sourceStart = html.indexOf("const leadEventId =");
const sourceEnd = html.indexOf('startBtn.addEventListener("click", startFlow);', sourceStart);

assert.ok(sourceStart >= 0 && sourceEnd > sourceStart, "bloco do envio Lead nao encontrado");

const source = html.slice(sourceStart, sourceEnd);
const createLeadFlow = new Function(
  "answers",
  "window",
  "crypto",
  "fetch",
  "submitBtn",
  "nextBtn",
  "persist",
  "progressSegments",
  "panels",
  "current",
  "THANK_YOU_URL",
  `${source}\nreturn { finish, trackLead, getEventId: () => leadEventId };`
);

function response(ok, body) {
  return {
    ok,
    async json() {
      return body;
    }
  };
}

function harness(responses) {
  const fetchCalls = [];
  const pixelCalls = [];
  const persistCalls = [];
  const error = { textContent: "" };
  const submitBtn = { disabled: false, textContent: "Enviar respostas" };
  const nextBtn = { disabled: false };
  const windowMock = {
    crypto: { randomUUID: () => "lead-test-id" },
    location: { href: "https://example.invalid/formulario" },
    setTimeout: () => 1,
    clearTimeout: () => {},
    fbq: (...args) => pixelCalls.push(args)
  };

  const api = createLeadFlow(
    { nome: "Teste Ademicon", email: "lead@example.invalid" },
    windowMock,
    windowMock.crypto,
    async (url, options) => {
      fetchCalls.push({ url, options, body: JSON.parse(options.body) });
      return responses.shift();
    },
    submitBtn,
    nextBtn,
    (eventName) => persistCalls.push(eventName),
    [{ classList: { add() {}, remove() {} } }],
    [{ querySelector: () => error }],
    0,
    "/obrigado"
  );

  return { api, fetchCalls, pixelCalls, persistCalls, error, submitBtn, nextBtn, windowMock };
}

{
  const test = harness([response(true, { ok: true })]);
  const first = test.api.finish();
  const concurrent = test.api.finish();

  assert.equal(first, concurrent, "chamadas concorrentes devem compartilhar a mesma promessa");
  await first;

  assert.equal(test.fetchCalls.length, 1, "envio concorrente nao pode duplicar /tracker");
  assert.equal(test.pixelCalls.length, 1, "pixel Lead deve disparar uma vez apos sucesso");
  assert.equal(test.fetchCalls[0].body.event_name, "Lead");
  assert.equal(test.fetchCalls[0].body.event_id, "lead-test-id");
  assert.equal(test.pixelCalls[0][1], "Lead");
  assert.equal(test.pixelCalls[0][3].eventID, "lead-test-id");
  assert.equal(test.windowMock.location.href, "/obrigado");
  assert.deepEqual(test.persistCalls, ["completo"]);
}

{
  const test = harness([
    response(false, { error: "falha simulada" }),
    response(true, { ok: true })
  ]);

  await test.api.finish();

  assert.equal(test.pixelCalls.length, 0, "falha do /tracker nao pode contar pixel Lead");
  assert.equal(test.windowMock.location.href, "https://example.invalid/formulario");
  assert.equal(test.submitBtn.disabled, false);
  assert.equal(test.nextBtn.disabled, false);
  assert.equal(test.submitBtn.textContent, "Tentar novamente");
  assert.match(test.error.textContent, /tente novamente/i);

  await test.api.finish();

  assert.equal(test.fetchCalls.length, 2, "retry deve criar uma nova requisicao controlada");
  assert.equal(test.fetchCalls[0].body.event_id, test.fetchCalls[1].body.event_id);
  assert.equal(test.pixelCalls.length, 1, "pixel deve disparar somente no retry confirmado");
  assert.equal(test.windowMock.location.href, "/obrigado");
}

console.log("OK: envio Lead confirma /tracker, evita concorrencia e preserva deduplicacao no retry.");
