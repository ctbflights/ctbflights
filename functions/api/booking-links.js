const ENDPOINT = 'https://ignav.com/api/fares/booking-links';
const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store'
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });
}

function safeBookingOptions(value) {
  if (!Array.isArray(value)) return [];
  return value.map(option => ({
    legs: Array.isArray(option?.legs) ? option.legs : [],
    links: Array.isArray(option?.links)
      ? option.links.filter(link => /^https?:\/\//i.test(String(link?.url || ''))).map(link => ({
          provider_name: link?.provider_name || '购票渠道',
          provider_type: link?.provider_type || null,
          fare_name: link?.fare_name || null,
          price: link?.price || null,
          url: link.url
        }))
      : []
  })).filter(option => option.links.length);
}

export async function onRequest({ request, env }) {
  if (request.method === 'OPTIONS') return new Response('', { status: 204, headers: JSON_HEADERS });
  if (request.method !== 'POST') return json({ error: 'POST only' }, 405);
  if (!env?.IGNAV_API_KEY) return json({ ok: false, code: 'ignav_not_configured' }, 503);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'invalid json' }, 400);
  }

  const ignavId = String(body?.ignav_id || '').trim();
  if (!/^[A-Za-z0-9_-]{12,128}$/.test(ignavId)) {
    return json({ error: 'invalid ignav_id' }, 400);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const upstream = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'X-Api-Key': env.IGNAV_API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ ignav_id: ignavId }),
      signal: controller.signal
    });

    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      return json({
        ok: false,
        code: data?.error?.code || (upstream.status >= 500 ? 'ignav_upstream_failed' : 'booking_links_failed'),
        upstream_status: upstream.status,
        upstream_error: data?.error || null
      }, upstream.status >= 500 ? 502 : upstream.status);
    }

    return json({
      ok: true,
      provider: 'ignav',
      itinerary: data?.itinerary || null,
      booking_options: safeBookingOptions(data?.booking_options)
    });
  } catch (error) {
    return json({
      ok: false,
      code: error?.name === 'AbortError' ? 'ignav_timeout' : 'ignav_transport_failed',
      error: error instanceof Error ? error.message : String(error)
    }, 502);
  } finally {
    clearTimeout(timeout);
  }
}
