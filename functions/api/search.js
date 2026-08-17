const BELAVIA_GQL = 'https://webapi.belavia.by/graphql/query/nemo';
const BELAVIA_ORIGIN = 'https://en.belavia.by';

const RUN_SEARCH = `mutation RunSearch($params: AviaSearchParameters!) {
  RunGeneralSearch(parameters: $params) { id __typename }
}`;

const SEARCH_RESULTS = `query SearchResults($id: ID!) {
  SearchResult(id: $id) {
    searchParameters {
      currency
      segments { date departure { iata name } arrival { iata name } }
      passengers { passengerType count }
    }
    flightDirections {
      legs {
        segments {
          segment {
            id flightNumber lowestPriceClassSeatsLeft
            departure { date time terminal airport { name iata } }
            arrival { date time terminal airport { name iata } }
          }
        }
        pricesForFareGroups {
          fareFamily {
            id title category
            airline { name iata icon logo { fullUrl } }
            options { type availability title description shortDescription value size isKeyOption }
          }
          prices {
            price { amount currency }
            flight {
              id
              fares { id passengerFares { priceClasses { classCode } } }
            }
          }
        }
      }
    }
    fares {
      id
      passengerFares {
        count passengerType
        totalTaxes { amount currency }
        baseFare { amount currency }
        totalFare { amount currency }
      }
    }
  }
}`;

const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store'
};

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const normFlight = value => String(value || '')
  .toUpperCase()
  .replace(/[^A-Z0-9]/g, '')
  .replace(/^B2/, '');

function cookieOnly(setCookie) {
  if (!setCookie) return '';
  return setCookie
    .split(/,(?=[^;,]+=)/g)
    .map(x => x.split(';')[0].trim())
    .filter(Boolean)
    .join('; ');
}

async function gql(body, token = '', cookie = 'nemo_lang=en; ccCurrency=BYN') {
  const headers = {
    accept: 'application/json, text/plain, */*',
    'content-type': 'application/json',
    origin: BELAVIA_ORIGIN,
    referer: `${BELAVIA_ORIGIN}/booking/`,
    'accept-language': 'en-US,en;q=0.9',
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/151 Safari/537.36',
    cookie
  };
  if (token) {
    headers['x-token'] = token;
    headers.authorization = `Bearer ${token}`;
  }

  const response = await fetch(BELAVIA_GQL, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  });

  const text = await response.text();
  let data = {};
  try { data = JSON.parse(text); }
  catch { data = { raw: text.slice(0, 500) }; }

  return {
    ok: response.ok,
    status: response.status,
    data,
    token: response.headers.get('x-token') || token,
    cookie: [cookie, cookieOnly(response.headers.get('set-cookie') || '')].filter(Boolean).join('; ')
  };
}

function searchParams(item) {
  return {
    segments: [{ departure: { iata: item.origin }, arrival: { iata: item.destination }, date: item.departure_date }],
    passengers: [
      { passengerType: 'ADT', count: 1 },
      { passengerType: 'CLD', count: 0 },
      { passengerType: 'INF', count: 0 }
    ],
    promotionCode: null,
    currency: 'BYN',
    ffpMode: false
  };
}

function validItem(item) {
  return item &&
    typeof item.id === 'string' && item.id.length < 160 &&
    /^[A-Z]{3}$/.test(String(item.origin || '')) &&
    /^[A-Z]{3}$/.test(String(item.destination || '')) &&
    /^\d{4}-\d{2}-\d{2}$/.test(String(item.departure_date || ''));
}

function getLegs(searchResult) {
  return (searchResult?.flightDirections || [])
    .flatMap(direction => Array.isArray(direction?.legs) ? direction.legs : []);
}

function pricedCount(searchResult) {
  let count = 0;
  for (const leg of getLegs(searchResult)) {
    for (const group of leg?.pricesForFareGroups || []) {
      if (Array.isArray(group?.prices)) count += group.prices.length;
    }
  }
  return count;
}

async function runBelavia(item) {
  const startedAt = Date.now();
  const created = await gql({
    operationName: 'RunSearch',
    query: RUN_SEARCH,
    variables: { params: searchParams(item) }
  });

  const searchId = created.data?.data?.RunGeneralSearch?.id;
  if (!created.ok || !searchId) {
    return {
      id: item.id,
      ok: false,
      provider: 'belavia-official',
      code: 'run_search_failed',
      status: created.status,
      errors: created.data?.errors || [],
      elapsed_ms: Date.now() - startedAt,
      offers: []
    };
  }

  let token = created.token;
  let cookie = created.cookie;
  let searchResult = null;
  let legsSeenAt = -1;

  // Keep the previously working short polling model. If the schedule arrives
  // before fare groups, allow only a few extra polls instead of rebuilding
  // the search job or serialising the whole batch.
  for (let i = 0; i < 12; i++) {
    if (i) await sleep(450);
    const result = await gql({
      operationName: 'SearchResults',
      query: SEARCH_RESULTS,
      variables: { id: String(searchId) }
    }, token, cookie);

    token = result.token;
    cookie = result.cookie;
    if (result.data?.data?.SearchResult) searchResult = result.data.data.SearchResult;

    const legs = getLegs(searchResult);
    if (legs.length && legsSeenAt < 0) legsSeenAt = i;
    if (legs.length && pricedCount(searchResult) > 0) break;
    if (legsSeenAt >= 0 && i - legsSeenAt >= 3) break;
  }

  if (!searchResult) {
    return {
      id: item.id,
      ok: false,
      provider: 'belavia-official',
      code: 'search_results_missing',
      search_id: String(searchId),
      elapsed_ms: Date.now() - startedAt,
      offers: []
    };
  }

  const wantedFlight = normFlight(item.preferred_flight_number);
  const fareMap = new Map((searchResult.fares || []).map(fare => [String(fare.id), fare]));
  const offers = [];
  let matchingLegs = 0;

  for (const direction of searchResult.flightDirections || []) {
    for (const leg of direction.legs || []) {
      const segments = (leg.segments || []).map(x => x?.segment).filter(Boolean);
      if (!segments.length) continue;

      const first = segments[0];
      const last = segments[segments.length - 1];
      if (first?.departure?.airport?.iata !== item.origin || last?.arrival?.airport?.iata !== item.destination) continue;
      if (item.direct !== false && segments.length !== 1) continue;
      if (wantedFlight && !segments.some(segment => normFlight(segment?.flightNumber) === wantedFlight)) continue;

      matchingLegs++;
      const seats = Number.isFinite(Number(first?.lowestPriceClassSeatsLeft))
        ? Number(first.lowestPriceClassSeatsLeft)
        : null;

      for (const group of leg.pricesForFareGroups || []) {
        const family = group?.fareFamily || {};
        for (const priceItem of group?.prices || []) {
          const amount = Number(priceItem?.price?.amount);
          if (!Number.isFinite(amount)) continue;

          const fareId = priceItem?.flight?.fares?.[0]?.id;
          const fare = fareMap.get(String(fareId));
          const passengerFare = fare?.passengerFares?.find(x => x?.passengerType === 'ADT') || fare?.passengerFares?.[0] || {};
          const bookingClass = priceItem?.flight?.fares?.[0]?.passengerFares?.[0]?.priceClasses?.[0]?.classCode || null;

          offers.push({
            amount,
            currency: priceItem?.price?.currency || searchResult?.searchParameters?.currency || 'BYN',
            bundle: family?.title || null,
            service_class: family?.title || family?.category || null,
            booking_class: bookingClass,
            available_seats: seats,
            airline_name: family?.airline?.name || 'Belavia Belarusian Airlines',
            airline_iata: family?.airline?.iata || 'B2',
            airline_icon: family?.airline?.icon || null,
            airline_logo: null,
            baggage_options: Array.isArray(family?.options) ? family.options : [],
            tax_detail: {
              base_amount: Number.isFinite(Number(passengerFare?.baseFare?.amount)) ? Number(passengerFare.baseFare.amount) : null,
              taxes_amount: Number.isFinite(Number(passengerFare?.totalTaxes?.amount)) ? Number(passengerFare.totalTaxes.amount) : null,
              total_fare_amount: Number.isFinite(Number(passengerFare?.totalFare?.amount)) ? Number(passengerFare.totalFare.amount) : amount,
              currency: passengerFare?.totalFare?.currency || priceItem?.price?.currency || 'BYN'
            },
            current_inventory: true
          });
        }
      }
    }
  }

  const businessOnly = offers.length > 0 && offers.every(offer =>
    /business/i.test(String(offer.service_class || offer.bundle || ''))
  );

  return {
    id: item.id,
    ok: true,
    provider: 'belavia-official',
    source_kind: 'official-current',
    current_availability: offers.length > 0,
    availability_summary: offers.length
      ? (businessOnly ? 'business_only' : 'current_offer_available')
      : (matchingLegs ? 'matching_flight_no_current_offer' : 'flight_not_found_in_search_result'),
    code: offers.length ? 'current_offer_available' : (matchingLegs ? 'no_current_offer' : 'flight_not_found'),
    offers,
    search_id: String(searchId),
    matching_legs: matchingLegs,
    priced_items_seen: pricedCount(searchResult),
    checked_at: new Date().toISOString(),
    elapsed_ms: Date.now() - startedAt
  };
}

async function runOne(item) {
  if (!validItem(item)) return { id: item?.id || null, ok: false, code: 'invalid_search_item', offers: [] };
  if (String(item.preferred_carrier || '').toUpperCase() !== 'B2') {
    return {
      id: item.id,
      ok: false,
      provider: 'ctbflights',
      code: 'airchina_live_not_configured',
      current_availability: null,
      offers: []
    };
  }
  return runBelavia(item);
}

async function pooled(items, concurrency = 2) {
  const results = new Array(items.length);
  let cursor = 0;

  async function worker() {
    while (true) {
      const index = cursor++;
      if (index >= items.length) return;
      try { results[index] = await runOne(items[index]); }
      catch (error) {
        results[index] = {
          id: items[index]?.id || null,
          ok: false,
          provider: 'ctbflights',
          code: 'function_error',
          error: error instanceof Error ? error.message : String(error),
          offers: []
        };
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()));
  return results;
}

export async function onRequest(context) {
  const { request } = context;

  if (request.method === 'OPTIONS') return new Response('', { status: 204, headers: JSON_HEADERS });
  if (request.method !== 'POST') return new Response(JSON.stringify({ error: 'POST only' }), { status: 405, headers: JSON_HEADERS });

  let body;
  try { body = await request.json(); }
  catch { return new Response(JSON.stringify({ error: 'invalid json' }), { status: 400, headers: JSON_HEADERS }); }

  const searches = Array.isArray(body?.searches) ? body.searches : [];
  if (!searches.length || searches.length > 8) {
    return new Response(JSON.stringify({ error: 'searches must contain 1-8 items' }), { status: 400, headers: JSON_HEADERS });
  }

  const results = await pooled(searches, 2);
  return new Response(JSON.stringify({
    ok: true,
    version: 'ctbflights-api-1.0.24',
    queried_at: new Date().toISOString(),
    results
  }), { headers: JSON_HEADERS });
}
