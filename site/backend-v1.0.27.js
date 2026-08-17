(() => {
  'use strict';

  const VERSION = '1.0.27';
  const nativeFetch = window.fetch.bind(window);
  const SUPABASE_ENDPOINT = 'https://bexiueimgpsboxvdkdsy.supabase.co/functions/v1/flight-live-search';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJIUzI1NiIsInJlZiI6ImJleGl1ZWltZ3BzYm94dmRrZHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY5NjU2MzksImV4cCI6MjEwMjU0MTYzOX0.uaLVaHD1CtQnKEeflDHJ4XiaTOl7h6bjgyXhphoGDYA';
  const TRANSIENT = new Set([
    'run_search_failed',
    'search_results_missing',
    'function_error',
    'api_connection_failed'
  ]);
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

  function isSearchRequest(input, init) {
    const url = typeof input === 'string' ? input : input?.url || '';
    return /\/api\/search(?:\?|$)/.test(url) && String(init?.method || 'GET').toUpperCase() === 'POST';
  }

  function parseBody(init) {
    if (!init?.body || typeof init.body !== 'string') return null;
    try { return JSON.parse(init.body); } catch { return null; }
  }

  function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
      status,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store'
      }
    });
  }

  async function requestBelavia(search) {
    let last = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      if (attempt) await sleep(650);
      try {
        const response = await nativeFetch(SUPABASE_ENDPOINT, {
          method: 'POST',
          cache: 'no-store',
          headers: {
            'content-type': 'application/json',
            'apikey': SUPABASE_ANON_KEY,
            'authorization': `Bearer ${SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({ searches: [search] })
        });
        if (!response.ok) {
          last = { id: search.id, ok: false, code: `supabase_http_${response.status}`, offers: [] };
          continue;
        }
        const data = await response.json();
        const result = Array.isArray(data?.results) ? data.results[0] : null;
        if (!result) {
          last = { id: search.id, ok: false, code: 'missing_result', offers: [] };
          continue;
        }
        last = result;
        const code = String(result?.code || '');
        if (!(result?.ok === false && TRANSIENT.has(code))) return result;
      } catch (error) {
        last = {
          id: search.id,
          ok: false,
          code: 'api_connection_failed',
          error: error instanceof Error ? error.message : String(error),
          offers: []
        };
      }
    }
    return last || { id: search.id, ok: false, code: 'api_connection_failed', offers: [] };
  }

  async function pooled(items, worker, concurrency = 2) {
    const results = new Array(items.length);
    let cursor = 0;
    async function run() {
      while (true) {
        const index = cursor++;
        if (index >= items.length) return;
        results[index] = await worker(items[index]);
      }
    }
    await Promise.all(Array.from({ length: Math.min(concurrency, Math.max(items.length, 1)) }, run));
    return results;
  }

  window.fetch = async function ctbDedicatedBackend(input, init = {}) {
    if (!isSearchRequest(input, init)) return nativeFetch(input, init);

    const body = parseBody(init);
    const searches = Array.isArray(body?.searches) ? body.searches : null;
    if (!searches) return nativeFetch(input, init);

    const b2 = searches.filter(s => String(s?.preferred_carrier || '').toUpperCase() === 'B2');
    const b2Results = await pooled(b2, requestBelavia, 2);
    const b2Map = new Map(b2Results.map(r => [r?.id, r]));

    const results = searches.map(search => {
      const carrier = String(search?.preferred_carrier || '').toUpperCase();
      if (carrier === 'B2') {
        return b2Map.get(search.id) || { id: search.id, ok: false, code: 'missing_result', offers: [] };
      }
      return {
        id: search.id,
        ok: false,
        provider: 'ctbflights',
        code: 'airchina_live_not_configured',
        current_availability: null,
        offers: []
      };
    });

    return jsonResponse({
      ok: true,
      version: `ctbflights-client-${VERSION}`,
      mode: 'dedicated-supabase-belavia',
      queried_at: new Date().toISOString(),
      results
    });
  };

  window.__CTB_BACKEND__ = VERSION;
})();
