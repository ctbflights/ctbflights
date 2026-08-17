const SUPABASE_ENDPOINT = 'https://bexiueimgpsboxvdkdsy.supabase.co/functions/v1/flight-live-search';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_nAbaVeyWJxHE-bLpcyAvQg_0yGPmOIL';

const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store'
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });
}

export async function onRequest({ request }) {
  if (request.method === 'OPTIONS') return new Response('', { status: 204, headers: JSON_HEADERS });
  if (request.method !== 'POST') return json({ error: 'POST only' }, 405);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'invalid json' }, 400);
  }

  const searches = Array.isArray(body?.searches) ? body.searches : [];
  if (!searches.length || searches.length > 8) {
    return json({ error: 'searches must contain 1-8 items' }, 400);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  const startedAt = Date.now();

  try {
    const upstream = await fetch(SUPABASE_ENDPOINT, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'apikey': SUPABASE_PUBLISHABLE_KEY
      },
      body: JSON.stringify({ searches }),
      signal: controller.signal
    });

    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: {
        ...JSON_HEADERS,
        'x-ctb-backend': 'supabase-amadeus-relay-v1.1.3',
        'x-ctb-upstream-status': String(upstream.status),
        'x-ctb-elapsed-ms': String(Date.now() - startedAt)
      }
    });
  } catch (error) {
    return json({
      ok: false,
      version: 'ctbflights-api-1.1.3',
      code: error?.name === 'AbortError' ? 'supabase_timeout' : 'supabase_proxy_failed',
      error: error instanceof Error ? error.message : String(error),
      elapsed_ms: Date.now() - startedAt,
      results: searches.map(s => ({ id: s?.id || null, ok: false, code: 'api_connection_failed', offers: [] }))
    }, 502);
  } finally {
    clearTimeout(timeout);
  }
}
