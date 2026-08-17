(() => {
  'use strict';

  const VERSION = '1.0.24';
  const nativeFetch = window.fetch.bind(window);
  const TRANSIENT = new Set([
    'run_search_failed',
    'search_results_missing',
    'search_results_not_ready',
    'function_error',
    'belavia_query_failed'
  ]);

  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

  function isSearchRequest(input, init) {
    const url = typeof input === 'string' ? input : input?.url || '';
    return /\/api\/search(?:\?|$)/.test(url) && String(init?.method || 'GET').toUpperCase() === 'POST';
  }

  async function parseBody(init) {
    if (!init?.body || typeof init.body !== 'string') return null;
    try { return JSON.parse(init.body); }
    catch { return null; }
  }

  async function searchWithNetworkRetry(input, init) {
    try {
      return await nativeFetch(input, init);
    } catch (firstError) {
      await sleep(650);
      try { return await nativeFetch(input, init); }
      catch { throw firstError; }
    }
  }

  window.fetch = async function ctbStableFetch(input, init = {}) {
    if (!isSearchRequest(input, init)) return nativeFetch(input, init);

    const response = await searchWithNetworkRetry(input, init);
    if (!response.ok) return response;

    let data;
    try { data = await response.clone().json(); }
    catch { return response; }

    const requestBody = await parseBody(init);
    if (!Array.isArray(data?.results) || !Array.isArray(requestBody?.searches)) return response;

    const byId = new Map(requestBody.searches.map(item => [item.id, item]));
    const retrySearches = data.results
      .filter(result => {
        const source = byId.get(result?.id);
        return source &&
          String(source.preferred_carrier || '').toUpperCase() === 'B2' &&
          result?.ok === false &&
          TRANSIENT.has(String(result?.code || ''));
      })
      .map(result => byId.get(result.id));

    if (!retrySearches.length) return response;

    await sleep(700);
    try {
      const retryResponse = await nativeFetch(input, {
        ...init,
        body: JSON.stringify({ searches: retrySearches })
      });
      if (!retryResponse.ok) return response;

      const retryData = await retryResponse.json();
      if (!Array.isArray(retryData?.results)) return response;

      const replacements = new Map(retryData.results.map(result => [result.id, result]));
      const merged = {
        ...data,
        version: `${data.version || 'ctbflights-api'}+client-retry-${VERSION}`,
        results: data.results.map(result => replacements.get(result.id) || result)
      };

      return new Response(JSON.stringify(merged), {
        status: response.status,
        statusText: response.statusText,
        headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
      });
    } catch {
      return response;
    }
  };

  window.__CTB_STABILITY__ = VERSION;
})();
