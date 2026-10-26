import assert from "node:assert/strict";
import { onRequestPost } from "../functions/tracker.js";

const originalFetch = globalThis.fetch;

function requestFor(eventName) {
  return new Request("https://example.invalid/tracker", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "user-agent": "Mozilla/5.0"
    },
    body: JSON.stringify({
      event_name: eventName,
      event_id: `${eventName.toLowerCase()}-test-id`,
      event_time: 1,
      event_source_url: "https://example.invalid/formulario/",
      user_data: {}
    })
  });
}

async function runTracker(eventName, metaResponse) {
  const waits = [];
  globalThis.fetch = async () => metaResponse;

  const response = await onRequestPost({
    request: requestFor(eventName),
    env: {
      META_PIXEL_ID: "pixel-test",
      META_ACCESS_TOKEN: "token-test"
    },
    waitUntil(promise) {
      waits.push(promise);
    }
  });

  await Promise.all(waits);
  return { response, body: await response.json() };
}

try {
  {
    const result = await runTracker("Lead", new Response(JSON.stringify({ events_received: 1 }), {
      status: 200,
      headers: { "content-type": "application/json" }
    }));

    assert.equal(result.response.status, 200);
    assert.deepEqual(result.body, { ok: true });
  }

  {
    const result = await runTracker("Lead", new Response(JSON.stringify({ error: { message: "rejected" } }), {
      status: 400,
      headers: { "content-type": "application/json" }
    }));

    assert.equal(result.response.status, 502);
    assert.deepEqual(result.body, {
      ok: false,
      error: "meta_delivery_failed",
      meta_status_code: 400
    });
  }

  {
    const result = await runTracker("Lead", new Response(JSON.stringify({ events_received: 0 }), {
      status: 200,
      headers: { "content-type": "application/json" }
    }));

    assert.equal(result.response.status, 502);
    assert.equal(result.body.ok, false);
  }

  {
    const result = await runTracker("PageView", new Response(JSON.stringify({ error: { message: "rejected" } }), {
      status: 400,
      headers: { "content-type": "application/json" }
    }));

    assert.equal(result.response.status, 200, "outros eventos preservam o contrato best-effort");
    assert.deepEqual(result.body, { ok: true });
  }
} finally {
  globalThis.fetch = originalFetch;
}

console.log("OK: Lead so confirma depois de aceite real da Meta; outros eventos permanecem inalterados.");
