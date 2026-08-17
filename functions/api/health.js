const ENDPOINT = 'https://bexiueimgpsboxvdkdsy.supabase.co/functions/v1/flight-live-search';
const KEY = 'sb_publishable_nAbaVeyWJxHE-bLpcyAvQg_0yGPmOIL';

export async function onRequestGet() {
  const startedAt = Date.now();
  try {
    const upstream = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'apikey': KEY
      },
      body: JSON.stringify({
        searches: [{
          id: 'health-b2752-2026-09-07',
          origin: 'URC',
          destination: 'MSQ',
          departure_date: '2026-09-07',
          preferred_carrier: 'B2',
          preferred_flight_number: 'B2752',
          direct: true
        }]
      })
    });
    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store',
        'x-ctb-health-elapsed-ms': String(Date.now() - startedAt)
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({ok:false,error:String(error),elapsed_ms:Date.now()-startedAt}), {
      status: 502,
      headers: {'content-type':'application/json; charset=utf-8','cache-control':'no-store'}
    });
  }
}
