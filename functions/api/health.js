const ENDPOINT = 'https://ignav.com/api/fares/one-way';

export async function onRequestGet({ env }) {
  const startedAt = Date.now();
  const headers = {'content-type':'application/json; charset=utf-8','cache-control':'no-store'};

  if (!env?.IGNAV_API_KEY) {
    return new Response(JSON.stringify({
      ok: false,
      provider: 'ignav',
      configured: false,
      version: '1.1.6'
    }), { status: 503, headers });
  }

  const tomorrow = new Date(Date.now() + 86400000);
  const departureDate = tomorrow.toISOString().slice(0, 10);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const upstream = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'X-Api-Key': env.IGNAV_API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        origin: 'PEK',
        destination: 'PVG',
        departure_date: departureDate,
        adults: 1,
        cabin_class: 'economy',
        max_stops: 0,
        market: 'CN'
      }),
      signal: controller.signal
    });
    const data = await upstream.json().catch(() => ({}));
    return new Response(JSON.stringify({
      ok: upstream.ok,
      provider: 'ignav',
      configured: true,
      upstream_status: upstream.status,
      itinerary_count: Array.isArray(data?.itineraries) ? data.itineraries.length : null,
      upstream_error: upstream.ok ? null : data?.error || null,
      elapsed_ms: Date.now() - startedAt,
      version: '1.1.6'
    }), { status: upstream.ok ? 200 : 502, headers });
  } catch (error) {
    return new Response(JSON.stringify({
      ok:false,
      provider:'ignav',
      configured:true,
      code:error?.name==='AbortError'?'ignav_timeout':'ignav_transport_failed',
      error:error instanceof Error?error.message:String(error),
      elapsed_ms:Date.now()-startedAt,
      version:'1.1.6'
    }), { status:502, headers });
  } finally {
    clearTimeout(timeout);
  }
}
