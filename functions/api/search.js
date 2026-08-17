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

function allLegs(searchResult) {
  return (searchResult?.flightDirections || [])
    .flatMap(direction => Array.isArray(direction?.legs) ? direction.legs : []);
}

function pricedCount(searchResult) {
  let count = 0;
  for (const leg of allLegs(searchResult)) {
    for (const group of leg?.pricesForFareGroups || []) {
      count += Array.isArray(group?.prices) ? group.prices.length : 0;
    }
  }
  return count;
}

async function createSearch(item) {
  return gql({
    operationName: 'RunSearch',
    query: RUN_SEARCH,
    variables: { params: searchParams(item) }
  });
}

async function pollSearch(searchId, token, cookie) {
  let latest = null;
  let latestToken = token;
  let latestCookie = cookie;

  for (let i = 0; i < 16; i++) {
    if (i) await sleep(i < 8 ? 500 : 750);

    const result = await gql({
      operationName: 'SearchResults',
      query: SEARCH_RESULTS,
      variables: { id: String(searchId) }
    }, latestToken, latestCookie);

    latestToken = result.token;
    latestCookie = result.cookie;
    latest = result.data?.data?.SearchResult || latest;

    // Belavia can return the schedule before the fare groups are populated.
    // Do not stop at the first leg; wait until pricing arrives.
    if (latest && pricedCount(latest) > 0) break;
  }

  return { searchResult: latest, token: latestToken, cookie: latestCookie };
}

function parseOffers(item, searchResult) {
  const wantedFlight = normFlight(item.preferred_flight_number);
  const fareMap = new Map((searchResult?.fares || []).map(fare => [String(fare.id), fare]));
  const offers = [];
  let matchingLegs = 0;

  for (const direction of searchResult?.flightDirections || []) {
    for (const leg of direction?.legs || []) {
      const segments = (leg?.segments || []).map(x => x?.segment).filter(Boolean);
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

      for (const group of leg?.pricesForFareGroups || []) {
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

  return { offers, matchingLegs };
}

async function runBelavia(item) {
  let lastFailure = null;

  // A fresh search ID retry is important because the Belavia search job can occasionally stall.
  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt) await sleep(400);

    const created = await createSearch(item);
    const searchId = created.data?.data?.RunGeneralSearch?.id;
    if (!created.ok || !searchId) {
      lastFailure = {
        code: 'run_search_failed',
        status: created.status,
        errors: created.data?.errors || []
      };
      continue;
    }

    const polled = await pollSearch(searchId, created.token, created.cookie);
    const searchResult = polled.searchResult;
    if (!searchResult || !allLegs(searchResult).length) {
      lastFailure = { code: 'search_results_not_ready', search_id: String(searchId) };
      continue;
    }

    const parsed = parseOffers(item, searchResult);

    // If the requested flight exists but prices have not populated yet, retry with a new search ID.
    if (parsed.matchingLegs > 0 && !parsed.offers.length && attempt === 0) {
      lastFailure = { code: 'matching_flight_price_not_ready', search_id: String(searchId) };
      continue;
    }

    const businessOnly = parsed.offers.length > 0 && parsed.offers.every(offer =>
      /business/i.test(String(offer.service_class || offer.bundle || ''))
    );

    return {
      id: item.id,
      ok: true,
      provider: 'belavia-official',
      source_kind: 'official-current',
      current_availability: parsed.offers.length > 0,
      availability_summary: parsed.offers.length
        ? (businessOnly ? 'business_only' : 'current_offer_available')
        : 'no_current_offer',
      offers: parsed.offers,
      search_id: String(searchId),
      matching_legs: parsed.matchingLegs,
      checked_at: new Date().toISOString()
    };
  }

  return {
    id: item.id,
    ok: false,
    provider: 'belavia-official',
    current_availability: null,
    offers: [],
    ...(lastFailure || { code: 'belavia_query_failed' })
  };
}

async function runOne(item) {
  if (!validItem(item)) return { id: item?.id || null, ok: false, code: 'invalid_search_item' };

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

  // Belavia is much more reliable when searches are run sequentially.
  // Parallel search IDs were causing intermittent missing September fares.
  const results = [];
  for (const item of searches) {
    try {
      results.push(await runOne(item));
    } catch (error) {
      results.push({
        id: item?.id || null,
        ok: false,
        provider: 'ctbflights',
        code: 'function_error',
        error: error instanceof Error ? error.message : String(error)
      });
    }
    if (String(item?.preferred_carrier || '').toUpperCase() === 'B2') await sleep(120);
  }

  return new Response(JSON.stringify({
    ok: true,
    version: 'ctbflights-api-1.0.22',
    queried_at: new Date().toISOString(),
    results
  }), { headers: JSON_HEADERS });
}
