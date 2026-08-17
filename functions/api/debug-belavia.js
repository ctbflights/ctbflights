const GQL = 'https://webapi.belavia.by/graphql/query/nemo';
const ORIGIN = 'https://en.belavia.by';

const RUN_SEARCH = `mutation RunSearch($params: AviaSearchParameters!) {
  RunGeneralSearch(parameters: $params) { id __typename }
}`;

const SEARCH_RESULTS = `query SearchResults($id: ID!) {
  SearchResult(id: $id) {
    searchParameters { currency }
    flightDirections {
      legs {
        segments { segment { flightNumber lowestPriceClassSeatsLeft departure { airport { iata } } arrival { airport { iata } } } }
        pricesForFareGroups {
          fareFamily { title category airline { name iata } }
          prices { price { amount currency } }
        }
      }
    }
  }
}`;

const sleep = ms => new Promise(r => setTimeout(r, ms));

function cookieOnly(setCookie) {
  if (!setCookie) return '';
  return setCookie.split(/,(?=[^;,]+=)/g).map(x => x.split(';')[0].trim()).filter(Boolean).join('; ');
}

async function gql(body, token = '', cookie = 'nemo_lang=en; ccCurrency=BYN') {
  const headers = {
    accept: 'application/json, text/plain, */*',
    'content-type': 'application/json',
    origin: ORIGIN,
    referer: `${ORIGIN}/booking/`,
    'accept-language': 'en-US,en;q=0.9',
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/151 Safari/537.36',
    cookie
  };
  if (token) {
    headers['x-token'] = token;
    headers.authorization = `Bearer ${token}`;
  }
  const started = Date.now();
  const res = await fetch(GQL, { method: 'POST', headers, body: JSON.stringify(body) });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { raw: text.slice(0, 300) }; }
  return {
    status: res.status,
    ok: res.ok,
    ms: Date.now() - started,
    hasToken: Boolean(res.headers.get('x-token') || token),
    nextToken: res.headers.get('x-token') || token,
    nextCookie: [cookie, cookieOnly(res.headers.get('set-cookie') || '')].filter(Boolean).join('; '),
    data
  };
}

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const date = /^\d{4}-\d{2}-\d{2}$/.test(url.searchParams.get('date') || '') ? url.searchParams.get('date') : '2026-09-07';
  const report = { date, endpoint: GQL, stage: 'start', polls: [] };
  try {
    const created = await gql({
      operationName: 'RunSearch',
      query: RUN_SEARCH,
      variables: {
        params: {
          segments: [{ departure: { iata: 'URC' }, arrival: { iata: 'MSQ' }, date }],
          passengers: [
            { passengerType: 'ADT', count: 1 },
            { passengerType: 'CLD', count: 0 },
            { passengerType: 'INF', count: 0 }
          ],
          promotionCode: null,
          currency: 'BYN',
          ffpMode: false
        }
      }
    });
    const searchId = created.data?.data?.RunGeneralSearch?.id || null;
    report.runSearch = {
      status: created.status,
      ok: created.ok,
      ms: created.ms,
      hasToken: created.hasToken,
      searchId,
      errors: created.data?.errors || null,
      rawTopKeys: created.data && typeof created.data === 'object' ? Object.keys(created.data) : []
    };
    if (!created.ok || !searchId) {
      report.stage = 'run_search_failed';
      return json(report, 200);
    }

    let token = created.nextToken;
    let cookie = created.nextCookie;
    for (let i = 0; i < 10; i++) {
      if (i) await sleep(500);
      const r = await gql({
        operationName: 'SearchResults',
        query: SEARCH_RESULTS,
        variables: { id: String(searchId) }
      }, token, cookie);
      token = r.nextToken;
      cookie = r.nextCookie;
      const sr = r.data?.data?.SearchResult || null;
      const legs = (sr?.flightDirections || []).flatMap(d => Array.isArray(d?.legs) ? d.legs : []);
      const flights = legs.flatMap(leg => (leg?.segments || []).map(x => x?.segment?.flightNumber).filter(Boolean));
      const prices = legs.flatMap(leg => (leg?.pricesForFareGroups || []).flatMap(g => (g?.prices || []).map(p => p?.price).filter(Boolean)));
      report.polls.push({
        i,
        status: r.status,
        ok: r.ok,
        ms: r.ms,
        hasToken: r.hasToken,
        hasSearchResult: Boolean(sr),
        legs: legs.length,
        flights,
        priceCount: prices.length,
        prices: prices.slice(0, 6),
        errors: r.data?.errors || null
      });
      if (prices.length) {
        report.stage = 'prices_found';
        return json(report, 200);
      }
    }
    report.stage = report.polls.some(p => p.legs > 0) ? 'flight_found_no_price' : 'no_flight_result';
    return json(report, 200);
  } catch (error) {
    report.stage = 'exception';
    report.error = error instanceof Error ? error.message : String(error);
    return json(report, 200);
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
  });
}
