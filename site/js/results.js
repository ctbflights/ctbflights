(() => {
  'use strict';

  const { AIRLINES, VARIANTS, CITY_OPTIONS } = window.CTB_DATA;
  const params = new URLSearchParams(location.search);
  const $ = id => document.getElementById(id);
  const FALLBACK_BYN_CNY = 2.22;

  const state = {
    trip: params.get('trip') === 'roundtrip' ? 'roundtrip' : 'oneway',
    direction: params.get('direction') === 'from-minsk' ? 'from-minsk' : 'to-minsk',
    start: params.get('start'),
    end: params.get('end'),
    returnStart: params.get('returnStart'),
    returnEnd: params.get('returnEnd'),
    cities: (params.get('cities') || '').split(',').filter(code => CITY_OPTIONS[code]),
    rate: FALLBACK_BYN_CNY,
    outbound: [],
    inbound: [],
    items: []
  };

  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const isoDate = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const dateList = (start,end) => {
    if (!start || !end) return [];
    const out=[]; let d=new Date(`${start}T12:00:00`), stop=new Date(`${end}T12:00:00`);
    while(d<=stop){ out.push(new Date(d)); d.setDate(d.getDate()+1); }
    return out;
  };
  const formatDate = s => { const d=new Date(`${s}T12:00:00`); return `${d.getMonth()+1}月${d.getDate()}日`; };
  const week = s => ['周日','周一','周二','周三','周四','周五','周六'][new Date(`${s}T12:00:00`).getDay()];
  const money = n => Number.isFinite(Number(n)) ? `¥${Math.round(Number(n)).toLocaleString('zh-CN')}` : '—';
  const durationText = m => `${Math.floor(Number(m)/60)}h ${String(Number(m)%60).padStart(2,'0')}m`;
  const originalMoney = (amount,currency) => {
    if (!Number.isFinite(Number(amount))) return '';
    const code=String(currency||'').toUpperCase();
    if(code==='BYN') return `${Number(amount).toLocaleString('zh-CN',{minimumFractionDigits:2,maximumFractionDigits:2})} BYN`;
    return `${Number(amount).toLocaleString('zh-CN',{maximumFractionDigits:2})} ${code}`;
  };

  function specOf(variant,direction){ return direction==='to-minsk' ? variant.toMinsk : variant.fromMinsk; }
  function operating(spec,date){ const s=isoDate(date); return (!spec.start||s>=spec.start)&&(!spec.end||s<=spec.end)&&spec.weekdays.includes(date.getDay()); }
  function endpoints(variant,direction){
    return direction==='to-minsk'
      ? {from:variant.code,to:'MSQ',fromCity:variant.city,toCity:'明斯克'}
      : {from:'MSQ',to:variant.code,fromCity:'明斯克',toCity:variant.city};
  }
  function routeLabel(variant,direction){
    if(variant.via) return direction==='to-minsk' ? `${variant.city} → ${variant.via.city} → 明斯克` : `明斯克 → ${variant.via.city} → ${variant.city}`;
    const ep=endpoints(variant,direction); return `${ep.fromCity} → ${ep.toCity}`;
  }

  function buildLegs(direction,start,end){
    const chosen = state.cities.length ? state.cities : Object.keys(CITY_OPTIONS);
    const out=[];
    for(const variant of VARIANTS.filter(v=>chosen.includes(v.group))){
      const spec=specOf(variant,direction);
      for(const dateObj of dateList(start,end)){
        if(!operating(spec,dateObj)) continue;
        const ep=endpoints(variant,direction), date=isoDate(dateObj);
        out.push({
          id:`${direction}|${variant.key}|${date}`,
          variant,variantKey:variant.key,direction,date,spec,
          from:ep.from,to:ep.to,fromCity:ep.fromCity,toCity:ep.toCity,
          routeLabel:routeLabel(variant,direction),
          sourceKind:null,currentAvailable:null,availabilitySummary:null,
          offers:[],bestOffer:null,priceCny:null,errorCode:null
        });
      }
    }
    return out;
  }

  function apiItem(leg){
    return {
      id:leg.id,origin:leg.from,destination:leg.to,departure_date:leg.date,
      preferred_carrier:leg.variant.airline,
      preferred_flight_number:leg.spec.flightNumber,
      direct:leg.variant.direct
    };
  }

  async function getRate(){
    try{
      const response=await fetch('https://api.nbrb.by/exrates/rates/CNY?parammode=2',{cache:'no-store'});
      if(response.ok){
        const data=await response.json();
        const official=Number(data?.Cur_OfficialRate), scale=Number(data?.Cur_Scale||1);
        const rate=scale/official;
        if(Number.isFinite(rate)&&rate>0) return rate;
      }
    }catch{}
    return FALLBACK_BYN_CNY;
  }

  function clearPrice(leg,code=null){
    leg.sourceKind=null;leg.currentAvailable=null;leg.availabilitySummary=null;
    leg.offers=[];leg.bestOffer=null;leg.priceCny=null;leg.errorCode=code;
  }

  function applyResult(leg,result){
    leg.errorCode=result?.code||result?.error||null;
    leg.currentAvailable=result?.current_availability??null;
    leg.availabilitySummary=result?.availability_summary||null;
    const offers=Array.isArray(result?.offers)
      ? result.offers.filter(o=>Number.isFinite(Number(o?.amount))).sort((a,b)=>Number(a.amount)-Number(b.amount))
      : [];
    if(!offers.length){ clearPrice(leg,leg.errorCode); return; }
    leg.sourceKind='official-current';
    leg.offers=offers;
    leg.bestOffer=offers[0];
    leg.currentAvailable=true;
    const currency=String(leg.bestOffer.currency||'').toUpperCase();
    leg.priceCny=currency==='BYN' ? Number(leg.bestOffer.amount)*state.rate : Number(leg.bestOffer.amount);
  }

  async function queryLegs(legs){
    state.rate=await getRate();
    const byId=new Map(legs.map(x=>[x.id,x]));
    const searches=legs.map(apiItem);
    let done=0;
    for(let i=0;i<searches.length;i+=8){
      const chunk=searches.slice(i,i+8);
      $('queryStatus').textContent=`正在查询当前价格… ${done}/${searches.length}`;
      try{
        const response=await fetch('/api/search',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({searches:chunk})});
        const data=await response.json().catch(()=>({}));
        if(!response.ok) throw new Error(data?.code||`HTTP ${response.status}`);
        const returned=new Set();
        for(const result of data?.results||[]){
          const leg=byId.get(result?.id);
          if(leg){ applyResult(leg,result); returned.add(result.id); }
        }
        for(const search of chunk){ if(!returned.has(search.id)){ const leg=byId.get(search.id); if(leg)clearPrice(leg,'missing_result'); } }
      }catch(error){
        for(const search of chunk){ const leg=byId.get(search.id); if(leg)clearPrice(leg,'api_connection_failed'); }
      }
      done+=chunk.length;
      renderProgress();
    }
    const live=legs.filter(x=>x.sourceKind==='official-current'&&x.bestOffer).length;
    $('queryStatus').textContent=live
      ? `查询完成 · ${live} 个航段返回当前价格`
      : '查询完成 · 当前未获得可显示的实时报价';
  }

  function buildItems(){
    if(state.trip==='oneway') return state.outbound.map(leg=>({id:leg.id,type:'oneway',outbound:leg,date:leg.date,priceCny:leg.priceCny,duration:leg.spec.duration}));
    const pairs=[];
    for(const out of state.outbound){
      for(const back of state.inbound.filter(x=>x.variantKey===out.variantKey&&x.date>=out.date)){
        const price=Number.isFinite(out.priceCny)&&Number.isFinite(back.priceCny)?out.priceCny+back.priceCny:null;
        pairs.push({id:`${out.id}__${back.id}`,type:'roundtrip',outbound:out,inbound:back,date:out.date,priceCny:price,duration:out.spec.duration+back.spec.duration});
      }
    }
    return pairs;
  }

  function statusFor(leg){
    if(leg.bestOffer) return {text:'当前价格',className:'live'};
    if(leg.variant.airline==='CA') return {text:'国航实时价格暂未接入',className:'muted'};
    if(leg.errorCode==='no_current_offer') return {text:'暂无当前报价',className:'muted'};
    return {text:'实时查询暂时失败',className:'muted'};
  }

  function baggageHtml(leg){
    const opts=Array.isArray(leg.bestOffer?.baggage_options)?leg.bestOffer.baggage_options:[];
    const hits=opts.filter(x=>/baggage|luggage|bag|багаж/i.test(JSON.stringify(x))).slice(0,8);
    if(hits.length) return hits.map(x=>[x.title,x.shortDescription,x.description,x.value,x.size].filter(Boolean).map(esc).join(' · ')).join('<br>');
    return esc(AIRLINES[leg.variant.airline].baggage);
  }

  function fareBox(leg){
    const offer=leg.bestOffer;
    if(!offer){
      const msg=leg.variant.airline==='CA'?'国航实时价格暂未接入。':'本次实时查询没有返回当前可售报价。';
      return `<div class="fare-box"><div class="fare-title">价格信息</div><div class="fare-row"><span>当前结果</span><strong>${esc(msg)}</strong></div></div>`;
    }
    const rows=[
      ['当前最低票价',originalMoney(offer.amount,offer.currency)],
      ['票价档 / 舱等',[offer.bundle,offer.service_class].filter(Boolean).join(' · ')||'—'],
      ['订座舱位',offer.booking_class||'—'],
      ['当前余票',Number.isFinite(Number(offer.available_seats))?`${offer.available_seats} 席`:'官网未返回具体数字'],
      ['基础票价',Number.isFinite(Number(offer.tax_detail?.base_amount))?originalMoney(offer.tax_detail.base_amount,offer.tax_detail.currency||offer.currency):'—'],
      ['税费',Number.isFinite(Number(offer.tax_detail?.taxes_amount))?originalMoney(offer.tax_detail.taxes_amount,offer.tax_detail.currency||offer.currency):'—']
    ];
    return `<div class="fare-box live-box"><div class="fare-title">当前票价信息</div>${rows.map(([k,v])=>`<div class="fare-row"><span>${esc(k)}</span><strong>${esc(v)}</strong></div>`).join('')}</div>`;
  }

  function legDetail(leg,label='单程'){
    const airline=AIRLINES[leg.variant.airline];
    const suffix=leg.spec.offset?`<sup>+${leg.spec.offset}</sup>`:'';
    return `<div class="leg-detail">
      <div class="detail-label">${esc(label)}</div>
      <div class="airline-detail-head">
        <img class="detail-logo carrier-${leg.variant.airline.toLowerCase()}" src="${airline.logo}" alt="${esc(airline.short)}">
        <div class="flight-number"><small>航班号</small><strong>${esc(leg.spec.flightNumber)}</strong></div>
      </div>
      <div class="timeline">
        <div><strong>${esc(leg.spec.depart)}</strong><b>${esc(leg.fromCity)} ${esc(leg.from)}</b><small>${esc(leg.from==='MSQ'?'明斯克国家机场':leg.variant.airport)}${leg.spec.terminalFrom?` · ${esc(leg.spec.terminalFrom)}`:''}</small></div>
        <div class="timeline-mid"><span>${durationText(leg.spec.duration)}</span><i></i><span>${leg.variant.direct?'直飞':`经 ${esc(leg.variant.via?.city||'中转')}`}</span></div>
        <div class="timeline-end"><strong>${esc(leg.spec.arrive)}${suffix}</strong><b>${esc(leg.toCity)} ${esc(leg.to)}</b><small>${esc(leg.to==='MSQ'?'明斯克国家机场':leg.variant.airport)}</small></div>
      </div>
      <div class="detail-chips"><span>${formatDate(leg.date)} ${week(leg.date)}</span><span>${esc(leg.spec.aircraft)}</span><span>${leg.variant.direct?'直飞':'经停/中转'}</span></div>
      ${fareBox(leg)}
      <div class="baggage-block"><button type="button" class="baggage-toggle">🧳 行李额度 <span>⌄</span></button><div class="baggage-content">${baggageHtml(leg)}</div></div>
      <a class="official-link" href="${airline.official}" target="_blank" rel="noopener noreferrer">前往${esc(airline.short)}官网购买 →</a>
    </div>`;
  }

  function nativeFor(item){
    const legs=item.type==='roundtrip'?[item.outbound,item.inbound]:[item.outbound];
    if(legs.some(l=>!l.bestOffer)) return '';
    const currencies=[...new Set(legs.map(l=>String(l.bestOffer.currency||'').toUpperCase()))];
    if(currencies.length!==1) return '';
    return originalMoney(legs.reduce((sum,l)=>sum+Number(l.bestOffer.amount),0),currencies[0]);
  }

  function cardHtml(item,bestPrice){
    const out=item.outbound, airline=AIRLINES[out.variant.airline];
    const route=item.type==='roundtrip'?`${out.variant.city} ⇄ 明斯克`:out.routeLabel;
    const meta=item.type==='roundtrip'
      ?`${formatDate(out.date)} 去 · ${formatDate(item.inbound.date)} 回 · ${out.spec.flightNumber} / ${item.inbound.spec.flightNumber}`
      :`${formatDate(out.date)} · ${week(out.date)} · ${out.spec.flightNumber}`;
    const details=item.type==='roundtrip'?legDetail(out,'去程')+legDetail(item.inbound,'返程'):legDetail(out,'单程航班详情');
    const isBest=Number.isFinite(item.priceCny)&&item.priceCny===bestPrice;
    const status=statusFor(out);
    return `<article class="flight-card${isBest?' best':''}" data-id="${esc(item.id)}">
      <button class="flight-summary" type="button">
        <div class="summary-route"><div class="route-line"><h3>${esc(route)}</h3><span class="route-tag${out.variant.direct?'':' stop'}">${out.variant.direct?'直飞航班':'经停/中转'}</span></div><small>${esc(meta)}</small></div>
        <div class="summary-airline"><img class="summary-logo carrier-${out.variant.airline.toLowerCase()}" src="${airline.logo}" alt="${esc(airline.short)}"></div>
        <div class="summary-price"><strong>${Number.isFinite(item.priceCny)?money(item.priceCny):'—'}</strong><small>${nativeFor(item)||status.text}</small>${isBest?'<em>最低价</em>':''}</div>
        <span class="chevron">⌄</span>
      </button>
      <div class="flight-details">${details}</div>
    </article>`;
  }

  function renderCalendar(items){
    const byDate=new Map();
    for(const item of items){
      const current=byDate.get(item.date);
      if(!current || (Number.isFinite(item.priceCny)&&(!Number.isFinite(current.priceCny)||item.priceCny<current.priceCny))) byDate.set(item.date,item);
    }
    const list=[...byDate.values()].sort((a,b)=>a.date.localeCompare(b.date));
    const priced=list.filter(x=>Number.isFinite(x.priceCny));
    const min=priced.length?Math.min(...priced.map(x=>x.priceCny)):Infinity;
    $('calendarList').innerHTML=list.length?list.map(item=>{
      const leg=item.outbound;
      const status=statusFor(leg);
      return `<div class="calendar-row${item.priceCny===min?' best':''}">
        <div class="calendar-date"><strong>${formatDate(item.date)}</strong><small>${week(item.date)}</small></div>
        <div class="calendar-route"><span>${esc(item.type==='roundtrip'?`${leg.variant.city} ⇄ 明斯克`:leg.routeLabel)}</span><small>${esc(leg.spec.flightNumber)}</small></div>
        <div class="calendar-price"><strong>${Number.isFinite(item.priceCny)?money(item.priceCny):'—'}</strong><small>${item.priceCny===min?'最低价':status.text}</small></div>
      </div>`;
    }).join(''):'<div class="empty">所选时间段没有匹配到计划班期。</div>';
  }

  function sortedItems(){
    const value=$('sortSelect').value;
    return [...state.items].sort((a,b)=>{
      if(value==='date') return a.date.localeCompare(b.date);
      if(value==='duration') return a.duration-b.duration;
      return (Number.isFinite(a.priceCny)?a.priceCny:Infinity)-(Number.isFinite(b.priceCny)?b.priceCny:Infinity)||a.date.localeCompare(b.date);
    });
  }

  function renderProgress(){
    state.items=buildItems();
    const items=sortedItems();
    const prices=items.filter(x=>Number.isFinite(x.priceCny)).map(x=>x.priceCny);
    const best=prices.length?Math.min(...prices):Infinity;
    $('resultCount').textContent=`${items.length} 个方案`;
    $('flightList').innerHTML=items.length?items.map(x=>cardHtml(x,best)).join(''):'<div class="empty">所选条件没有匹配到计划班期。</div>';
    renderCalendar(items);
  }

  function searchSummary(){
    const cityNames=(state.cities.length?state.cities:Object.keys(CITY_OPTIONS)).map(c=>CITY_OPTIONS[c]?.name).filter(Boolean).join(' / ');
    const direction=state.direction==='to-minsk'?'中国 → 明斯克':'明斯克 → 中国';
    $('searchSummary').textContent=`${direction} · ${state.start||'—'} 至 ${state.end||'—'} · ${cityNames}`;
  }

  function editLink(){ $('editSearch').href=`index.html?${params.toString()}`; }

  async function init(){
    if(!state.start||!state.end){ location.href='index.html'; return; }
    searchSummary(); editLink();
    state.outbound=buildLegs(state.direction,state.start,state.end);
    const reverse=state.direction==='to-minsk'?'from-minsk':'to-minsk';
    state.inbound=state.trip==='roundtrip'?buildLegs(reverse,state.returnStart,state.returnEnd):[];
    state.items=buildItems();
    renderProgress();
    const all=[...state.outbound,...state.inbound];
    if(!all.length){ $('queryStatus').textContent='所选时间段没有匹配到计划班期。'; return; }
    await queryLegs(all);
    renderProgress();
  }

  $('sortSelect').addEventListener('change',renderProgress);
  $('flightList').addEventListener('click',event=>{
    const baggage=event.target.closest('.baggage-toggle');
    if(baggage){ event.preventDefault(); event.stopPropagation(); baggage.closest('.baggage-block').classList.toggle('open'); return; }
    const summary=event.target.closest('.flight-summary');
    if(summary) summary.closest('.flight-card').classList.toggle('open');
  });

  init();
})();
