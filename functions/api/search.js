const IGNAV_BASE = 'https://ignav.com/api/fares';
const CACHE_TTL_SECONDS = 600;
const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store'
};

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...JSON_HEADERS, ...extraHeaders }
  });
}

function cleanCode(value, length) {
  const code = String(value || '').trim().toUpperCase();
  return new RegExp(`^[A-Z0-9]{${length}}$`).test(code) ? code : null;
}

function cleanDate(value) {
  const text = String(value || '').trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null;
}

function cleanInt(value, fallback, min, max) {
  const n = Number(value);
  if (!Number.isInteger(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function cleanCabin(value) {
  const allowed = new Set(['economy', 'premium_economy', 'business', 'first']);
  return allowed.has(value) ? value : 'economy';
}

function normalizeFlightNumber(value) {
  return String(value || '').trim().toUpperCase().replace(/^([A-Z0-9]{2})/, '').replace(/^0+/, '') || '0';
}

function segmentMatches(segment, carrier, flightNumber) {
  const code = String(segment?.marketing_carrier_code || '').toUpperCase();
  return code === carrier && normalizeFlightNumber(segment?.flight_number) === normalizeFlightNumber(flightNumber);
}

function legMatches(leg, carrier, flightNumber) {
  return Array.isArray(leg?.segments) && leg.segments.some(segment => segmentMatches(segment, carrier, flightNumber));
}

function sortItineraries(a, b) {
  const confidenceA = a?.price?.status === 'verified' ? 0 : 1;
  const confidenceB = b?.price?.status === 'verified' ? 0 : 1;
  if (confidenceA !== confidenceB) return confidenceA - confidenceB;
  return Number(a?.price?.amount ?? Infinity) - Number(b?.price?.amount ?? Infinity);
}

function normalizeOffer(itinerary) {
  return {
    amount: Number(itinerary?.price?.amount),
    currency: String(itinerary?.price?.currency || '').toUpperCase(),
    price_status: itinerary?.price?.status || 'unverified',
    cabin_class: itinerary?.cabin_class || null,
    bags: itinerary?.bags || null,
    requires_self_transfer: Boolean(itinerary?.requires_self_transfer),
    ignav_id: itinerary?.ignav_id || null,
    outbound: itinerary?.outbound || null,
    inbound: itinerary?.inbound || null
  };
}

async function sha256(text) {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
}

async function fetchIgnav(path, payload, apiKey, waitUntil) {
  const cachePayload = JSON.stringify({ path, payload });
  const keyHash = await sha256(cachePayload);
  const cacheKey = new Request(`https://ctbflights.internal/ignav-cache/${keyHash}`, { method: 'GET' });
  const cache = caches.default;
  const cached = await cache.match(cacheKey);
  if (cached) {
    return { ok: true, status: 200, data: await cached.json(), cache: 'HIT' };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);
  try {
    const response = await fetch(`${IGNAV_BASE}/${path}`, {
      method: 'POST',
      headers: {
        'X-Api-Key': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    const data = await response.json().catch(() => ({}));

    if (response.ok) {
      const cacheResponse = new Response(JSON.stringify(data), {
        status: 200,
        headers: {
          'content-type': 'application/json; charset=utf-8',
          'cache-control': `public, max-age=${CACHE_TTL_SECONDS}`
        }
      });
      waitUntil(cache.put(cacheKey, cacheResponse));
    }

    return { ok: response.ok, status: response.status, data, cache: 'MISS' };
  } catch (error) {
    return {
      ok: false,
      status: 502,
      data: {
        error: {
          type: 'upstream_error',
          code: error?.name === 'AbortError' ? 'ignav_timeout' : 'ignav_transport_failed',
          message: error instanceof Error ? error.message : String(error)
        }
      },
      cache: 'MISS'
    };
  } finally {
    clearTimeout(timeout);
  }
}

function upstreamErrorCode(status, data) {
  const upstreamCode = data?.error?.code;
  if (upstreamCode) return upstreamCode;
  if (status === 401 || status === 403) return 'ignav_auth_failed';
  if (status === 402 || status === 429) return 'ignav_billing_or_limit';
  if (status >= 500) return 'ignav_upstream_failed';
  return 'ignav_search_failed';
}

function validateSearch(search) {
  const origin = cleanCode(search?.origin, 3);
  const destination = cleanCode(search?.destination, 3);
  const departureDate = cleanDate(search?.departure_date);
  const returnDate = search?.return_date ? cleanDate(search.return_date) : null;
  const carrier = cleanCode(search?.preferred_carrier, 2);
  const flightNumber = String(search?.preferred_flight_number || '').trim();
  const returnCarrier = returnDate ? cleanCode(search?.preferred_return_carrier || search?.preferred_carrier, 2) : null;
  const returnFlightNumber = returnDate ? String(search?.preferred_return_flight_number || '').trim() : null;

  if (!origin || !destination || !departureDate || !carrier || !flightNumber) return null;
  if (returnDate && (!returnCarrier || !returnFlightNumber)) return null;

  return {
    id: search?.id || null,
    origin,
    destination,
    departureDate,
    returnDate,
    carrier,
    flightNumber,
    returnCarrier,
    returnFlightNumber,
    adults: cleanInt(search?.adults, 1, 1, 9),
    children: cleanInt(search?.children, 0, 0, 8),
    cabinClass: cleanCabin(search?.cabin_class),
    maxStops: cleanInt(search?.max_stops, search?.direct === true ? 0 : 1, 0, 2)
  };
}

async function executeSearch(search, apiKey, waitUntil) {
  const item = validateSearch(search);
  if (!item) {
    return { id: search?.id || null, ok: false, code: 'invalid_search_item', offers: [] };
  }

  if (item.adults + item.children > 9) {
    return { id: item.id, ok: false, code: 'too_many_passengers', offers: [] };
  }

  const payload = {
    origin: item.origin,
    destination: item.destination,
    departure_date: item.departureDate,
    adults: item.adults,
    children: item.children,
    cabin_class: item.cabinClass,
    max_stops: item.maxStops,
    airlines_include: [item.carrier],
    allow_self_transfer: false,
    market: 'CN'
  };

  const path = item.returnDate ? 'round-trip' : 'one-way';
  if (item.returnDate) payload.return_date = item.returnDate;

  const upstream = await fetchIgnav(path, payload, apiKey, waitUntil);
  if (!upstream.ok) {
    return {
      id: item.id,
      ok: false,
      code: upstreamErrorCode(upstream.status, upstream.data),
      provider: 'ignav',
      provider_mode: 'production',
      source_kind: 'ignav-current',
      upstream_status: upstream.status,
      upstream_error: upstream.data?.error || null,
      cache: upstream.cache,
      offers: []
    };
  }

  const itineraries = Array.isArray(upstream.data?.itineraries) ? upstream.data.itineraries : [];
  const matches = itineraries.filter(itinerary => {
    if (!legMatches(itinerary?.outbound, item.carrier, item.flightNumber)) return false;
    if (item.returnDate && !legMatches(itinerary?.inbound, item.returnCarrier, item.returnFlightNumber)) return false;
    return true;
  }).sort(sortItineraries);

  const offers = matches
    .filter(itinerary => Number.isFinite(Number(itinerary?.price?.amount)))
    .map(normalizeOffer);

  return {
    id: item.id,
    ok: true,
    code: offers.length ? null : (itineraries.length ? 'flight_not_found' : 'no_current_offer'),
    provider: 'ignav',
    provider_mode: 'production',
    source_kind: 'ignav-current',
    current_availability: offers.length ? true : null,
    availability_summary: offers.length
      ? `${offers.length} 个匹配当前报价`
      : 'Ignav 当前未返回匹配的可售报价',
    cache: upstream.cache,
    offers
  };
}

export async function onRequest({ request, env, waitUntil }) {
  if (request.method === 'OPTIONS') return new Response('', { status: 204, headers: JSON_HEADERS });
  if (request.method !== 'POST') return json({ error: 'POST only' }, 405);

  if (!env?.IGNAV_API_KEY) {
    return json({
      ok: false,
      version: 'ctbflights-api-1.1.5',
      code: 'ignav_not_configured',
      error: 'IGNAV_API_KEY is not configured',
      results: []
    }, 503);
  }

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

  const startedAt = Date.now();
  const results = await Promise.all(searches.map(search => executeSearch(search, env.IGNAV_API_KEY, waitUntil)));

  return json({
    ok: true,
    version: 'ctbflights-api-1.1.5',
    provider: 'ignav',
    elapsed_ms: Date.now() - startedAt,
    results
  }, 200, {
    'x-ctb-backend': 'ignav-v1.1.5',
    'x-ctb-elapsed-ms': String(Date.now() - startedAt)
  });
}
