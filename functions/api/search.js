const SUPABASE_ENDPOINT = 'https://bexiueimgpsboxvdkdsy.supabase.co/functions/v1/flight-live-search';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJIUzI1NiIsInJlZiI6ImJleGl1ZWltZ3BzYm94dmRrZHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY5NjU2MzksImV4cCI6MjEwMjU0MTYzOX0.uaLVaHD1CtQnKEeflDHJ4XiaTOl7h6bjgyXhphoGDYA';

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

  try {
    const upstream = await fetch(SUPABASE_ENDPOINT, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({ searches }),
      signal: controller.signal
    });

    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: {
        ...JSON_HEADERS,
        'x-ctb-backend': 'supabase-relay-v1.0.28'
      }
    });
  } catch (error) {
    return json({
      ok: false,
      version: 'ctbflights-api-1.0.28',
      code: error?.name === 'AbortError' ? 'supabase_timeout' : 'supabase_proxy_failed',
      error: error instanceof Error ? error.message : String(error),
      results: searches.map(s => ({ id: s?.id || null, ok: false, code: 'api_connection_failed', offers: [] }))
    }, 502);
  } finally {
    clearTimeout(timeout);
  }
}
