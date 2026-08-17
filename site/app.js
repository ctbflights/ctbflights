(() => {
  'use strict';

  const VERSION = '1.0.19';
  const API_URL = '/api/search';
  const FALLBACK_BYN_CNY = 2.22;

  const AIRLINES = {
    CA: {
      name: '中国国际航空股份有限公司',
      english: 'Air China Limited',
      short: '中国国际航空',
      logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3b/Air_China_wordmark.svg/500px-Air_China_wordmark.svg.png',
      official: 'https://www.airchina.com.cn/zh-CN',
      baggage: '国际航线免费行李额和额外行李收费以当前客票票价品牌及国航出票页面为准。'
    },
    B2: {
      name: '白俄罗斯航空公司',
      english: 'Belavia Belarusian Airlines',
      short: '白俄罗斯航空',
      logo: 'https://webapi.belavia.by/guideStatic/images/carrier/logotype/5830-347fc5d42a1f77f89665a10b8d0d235a.svg',
      official: 'https://en.belavia.by/booking/',
      baggage: '白航行李额度按本次官网票价档返回数据优先显示。'
    }
  };

  const VERIFIED_REFERENCES = {
    'to-minsk|URC_B2|2026-08-31': {
      amount: 2859.20,
      currency: 'BYN',
      bundle: 'Business',
      service_class: 'Business',
      booking_class: 'C',
      available_seats: 2,
      tax_detail: { base_amount: 2505.00, taxes_amount: 354.20, total_fare_amount: 2859.20, currency: 'BYN' },
      baggage_text: '手提行李：2×10kg；托运行李：2×32kg。',
      source: '白航官网人工核验参考'
    }
  };

  const VARIANTS = [
    {
      key: 'PEK_CA721', group: 'PEK', city: '北京', airline: 'CA', direct: true, airport: '北京首都国际机场', code: 'PEK',
      toMinsk: { flightNumber: 'CA721', weekdays: [1,4], depart: '13:20', arrive: '17:20', offset: 0, duration: 540, aircraft: 'Airbus A330 / A330-200', terminalFrom: 'T3', terminalTo: '', start: '2026-03-30', end: '2026-10-22' },
      fromMinsk: { flightNumber: 'CA722', weekdays: [1,4], depart: '19:20', arrive: '08:35', offset: 1, duration: 495, aircraft: 'Airbus A330-200', terminalFrom: '', terminalTo: 'T3', start: '2026-03-30', end: '2026-10-22' }
    },
    {
      key: 'PEK_CA813', group: 'PEK', city: '北京', airline: 'CA', direct: false, airport: '北京首都国际机场', code: 'PEK',
      via: { city: '西安', code: 'XIY', airport: '西安咸阳国际机场' },
      toMinsk: { flightNumber: 'CA813', weekdays: [6], depart: '09:40', arrive: '18:25', offset: 0, duration: 825, aircraft: 'Airbus A330', terminalFrom: 'T3', terminalTo: '', start: '2026-04-04', end: '2026-10-24' },
      fromMinsk: { flightNumber: 'CA814', weekdays: [6], depart: '20:30', arrive: '14:15', offset: 1, duration: 765, aircraft: 'Airbus A330', terminalFrom: '', terminalTo: 'T3', start: '2026-04-04', end: '2026-10-24' }
    },
    {
      key: 'XIY_CA813', group: 'XIY', city: '西安', airline: 'CA', direct: true, airport: '西安咸阳国际机场', code: 'XIY',
      toMinsk: { flightNumber: 'CA813', weekdays: [6], depart: '14:20', arrive: '18:25', offset: 0, duration: 545, aircraft: 'Airbus A330', terminalFrom: 'T5', terminalTo: '', start: '2026-04-04', end: '2026-10-24' },
      fromMinsk: { flightNumber: 'CA814', weekdays: [6], depart: '20:30', arrive: '09:55', offset: 1, duration: 505, aircraft: 'Airbus A330', terminalFrom: '', terminalTo: '', start: '2026-04-04', end: '2026-10-24' }
    },
    {
      key: 'URC_B2', group: 'URC', city: '乌鲁木齐', airline: 'B2', direct: true, airport: '乌鲁木齐天山国际机场', code: 'URC',
      toMinsk: { flightNumber: 'B2752', weekdays: [1], depart: '22:50', arrive: '00:10', offset: 1, duration: 380, aircraft: 'Boeing 737 MAX 8', terminalFrom: 'T4', terminalTo: '', start: '2026-01-01', end: '2026-09-28' },
      fromMinsk: { flightNumber: 'B2751', weekdays: [1], depart: '10:40', arrive: '21:30', offset: 0, duration: 350, aircraft: 'Boeing 737 MAX 8', terminalFrom: '', terminalTo: 'T4', start: '2026-01-01', end: '2026-09-28' }
    },
    {
      key: 'SYX_B2', group: 'SYX', city: '三亚', airline: 'B2', direct: true, airport: '三亚凤凰国际机场', code: 'SYX',
      toMinsk: { flightNumber: 'B2754', weekdays: [3,6], depart: '23:50', arrive: '06:10', offset: 1, duration: 680, aircraft: 'Airbus A330-200', terminalFrom: '', terminalTo: '', start: '2026-08-02', end: '2026-10-24' },
      fromMinsk: { flightNumber: 'B2753', weekdays: [3,6], depart: '07:00', arrive: '22:20', offset: 0, duration: 620, aircraft: 'Airbus A330-200', terminalFrom: '', terminalTo: '', start: '2026-08-02', end: '2026-10-24' }
    }
  ];

  const state = { trip: 'oneway', direction: 'to-minsk', busy: false, outbound: [], inbound: [], items: [], rate: FALLBACK_BYN_CNY };
  const $ = id => document.getElementById(id);
  const startDate = $('startDate'), endDate = $('endDate'), returnStart = $('returnStartDate'), returnEnd = $('returnEndDate');
  const returnRange = $('returnRange'), cityGrid = $('cityGrid'), searchButton = $('searchButton'), searchButtonText = $('searchButtonText');
  const results = $('results'), resultTitle = $('resultTitle'), resultCount = $('resultCount'), flightList = $('flightList'), calendarList = $('calendarList');
  const sortSelect = $('sortSelect'), sourceStatus = $('sourceStatus');

  const esc = v => String(v ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const isoDate = d => { const x = new Date(d); return new Date(x - x.getTimezoneOffset()*60000).toISOString().slice(0,10); };
  const addDays = (d,n) => { const x = typeof d === 'string' ? new Date(`${d}T12:00:00`) : new Date(d); x.setDate(x.getDate()+n); return x; };
  const dateList = (a,b) => { const out=[]; let d=new Date(`${a}T12:00:00`), stop=new Date(`${b}T12:00:00`); while(d<=stop){out.push(new Date(d));d.setDate(d.getDate()+1);} return out; };
  const formatDate = s => { const d=new Date(`${s}T12:00:00`); return `${d.getMonth()+1}月${d.getDate()}日`; };
  const week = s => ['周日','周一','周二','周三','周四','周五','周六'][new Date(`${s}T12:00:00`).getDay()];
  const money = n => Number.isFinite(Number(n)) ? `¥${Math.round(Number(n)).toLocaleString('zh-CN')}` : '—';
  const durationText = m => `${Math.floor(Number(m)/60)}h ${String(Number(m)%60).padStart(2,'0')}m`;
  const nativeMoney = (n,c) => {
    if(!Number.isFinite(Number(n))) return '';
    const code=String(c||'').toUpperCase();
    if(code==='BYN') return `${Number(n).toLocaleString('zh-CN',{minimumFractionDigits:2,maximumFractionDigits:2})} Б · BYN`;
    return `${Number(n).toLocaleString('zh-CN',{maximumFractionDigits:2})} ${code}`;
  };

  function flightSpec(v,direction){ return direction==='to-minsk' ? v.toMinsk : v.fromMinsk; }
  function isOperating(spec,d){ const s=isoDate(d); return (!spec.start||s>=spec.start)&&(!spec.end||s<=spec.end)&&spec.weekdays.includes(d.getDay()); }
  function endpoints(v,direction){ return direction==='to-minsk' ? {from:v.code,to:'MSQ',fromCity:v.city,toCity:'明斯克'} : {from:'MSQ',to:v.code,fromCity:'明斯克',toCity:v.city}; }
  function routeLabel(v,direction){
    if(v.via) return direction==='to-minsk' ? `${v.city} → ${v.via.city} → 明斯克` : `明斯克 → ${v.via.city} → ${v.city}`;
    const e=endpoints(v,direction); return `${e.fromCity} → ${e.toCity}`;
  }

  function buildLegs(direction,start,end,groups){
    const out=[];
    for(const variant of VARIANTS.filter(v=>groups.includes(v.group))){
      const spec=flightSpec(variant,direction);
      for(const d of dateList(start,end)){
        if(!isOperating(spec,d)) continue;
        const ep=endpoints(variant,direction), date=isoDate(d);
        out.push({
          id:`${direction}|${variant.key}|${date}`, variantKey:variant.key, variant, direction, date, spec,
          from:ep.from,to:ep.to,fromCity:ep.fromCity,toCity:ep.toCity,routeLabel:routeLabel(variant,direction),
          sourceKind:null,currentAvailable:null,availabilitySummary:null,offers:[],bestOffer:null,priceCny:null,errorCode:null
        });
      }
    }
    return out;
  }

  function renderCities(){
    const labels={PEK:['北京','CA721 / CA813','直飞 + 经西安'],XIY:['西安','CA813','直飞'],URC:['乌鲁木齐','B2752 / B2751','白航'],SYX:['三亚','B2754 / B2753','白航']};
    cityGrid.innerHTML=Object.entries(labels).map(([g,x])=>`<label class="city-chip"><input type="checkbox" value="${g}" checked><span><strong>${x[0]}</strong><small>${x[1]} · ${x[2]}</small></span></label>`).join('');
    $('toggleAll').textContent='取消全选';
  }
  const selectedGroups=()=>[...cityGrid.querySelectorAll('input:checked')].map(x=>x.value);

  function initDates(){
    const today=new Date();
    [startDate,endDate,returnStart,returnEnd].forEach(el=>el.min=isoDate(today));
    startDate.value=isoDate(addDays(today,7)); endDate.value=isoDate(addDays(today,21));
    returnStart.value=isoDate(addDays(today,30)); returnEnd.value=isoDate(addDays(today,45));
  }

  function validate(){
    if(!selectedGroups().length){alert('请至少选择一个中国城市。');return false;}
    if(!startDate.value||!endDate.value||startDate.value>endDate.value){alert('请选择正确的去程时间范围。');return false;}
    if(dateList(startDate.value,endDate.value).length>62){alert('单次去程最多比较 62 天。');return false;}
    if(state.trip==='roundtrip'){
      if(!returnStart.value||!returnEnd.value||returnStart.value>returnEnd.value){alert('请选择正确的返程时间范围。');return false;}
      if(dateList(returnStart.value,returnEnd.value).length>62){alert('单次返程最多比较 62 天。');return false;}
    }
    return true;
  }

  async function getBynCnyRate(){
    try{
      const r=await fetch('https://api.nbrb.by/exrates/rates/CNY?parammode=2',{cache:'no-store'});
      if(r.ok){const d=await r.json();const official=Number(d?.Cur_OfficialRate),scale=Number(d?.Cur_Scale||1);const rate=scale/official;if(Number.isFinite(rate)&&rate>0)return rate;}
    }catch{}
    return FALLBACK_BYN_CNY;
  }

  function apiItem(leg){
    return {id:leg.id,origin:leg.from,destination:leg.to,departure_date:leg.date,preferred_carrier:leg.variant.airline,preferred_flight_number:leg.spec.flightNumber,direct:leg.variant.direct};
  }

  async function queryBatch(searches){
    const r=await fetch(API_URL,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({searches})});
    if(!r.ok) throw new Error(`API ${r.status}`);
    return r.json();
  }

  function applyReference(leg){
    const ref=VERIFIED_REFERENCES[leg.id]; if(!ref) return false;
    leg.sourceKind='reference'; leg.currentAvailable=null; leg.bestOffer={...ref,current_inventory:false}; leg.offers=[leg.bestOffer];
    leg.priceCny=ref.currency==='BYN'?ref.amount*state.rate:ref.amount; leg.errorCode=leg.errorCode||'official_query_failed';
    return true;
  }

  function applyResult(leg,r){
    leg.errorCode=r?.code||r?.error||null; leg.currentAvailable=r?.current_availability??null; leg.availabilitySummary=r?.availability_summary||null;
    const offers=Array.isArray(r?.offers)?r.offers.filter(o=>Number.isFinite(Number(o?.amount))).sort((a,b)=>Number(a.amount)-Number(b.amount)):[];
    if(offers.length){
      leg.sourceKind='official-current'; leg.offers=offers; leg.bestOffer=offers[0]; leg.currentAvailable=true;
      const c=String(leg.bestOffer.currency||'').toUpperCase(); leg.priceCny=c==='BYN'?Number(leg.bestOffer.amount)*state.rate:Number(leg.bestOffer.amount);
      return;
    }
    leg.sourceKind=r?.source_kind||null; leg.offers=[]; leg.bestOffer=null; leg.priceCny=null;
    applyReference(leg);
  }

  async function queryLegs(legs){
    state.rate=await getBynCnyRate();
    const byId=new Map(legs.map(x=>[x.id,x]));
    const searches=legs.map(apiItem), chunks=[]; for(let i=0;i<searches.length;i+=8) chunks.push(searches.slice(i,i+8));
    let completed=0;
    for(const chunk of chunks){
      sourceStatus.textContent=`正在查询航空公司数据… ${completed}/${searches.length}`;
      try{
        const data=await queryBatch(chunk);
        const returned=new Set();
        for(const r of data?.results||[]){const leg=byId.get(r.id);if(leg){applyResult(leg,r);returned.add(r.id);}}
        for(const s of chunk){if(!returned.has(s.id)){const leg=byId.get(s.id);if(leg){leg.errorCode='missing_result';applyReference(leg);}}}
      }catch(e){
        for(const s of chunk){const leg=byId.get(s.id);if(leg){leg.errorCode='api_connection_failed';applyReference(leg);}}
      }
      completed+=chunk.length;
    }
    const official=legs.filter(x=>x.sourceKind==='official-current'&&x.bestOffer).length;
    const reference=legs.filter(x=>x.sourceKind==='reference').length;
    const unresolved=legs.filter(x=>!x.bestOffer).length;
    sourceStatus.textContent=`查询完成：官网当前报价 ${official} 条${reference?` · 官网核验参考 ${reference} 条`:''}${unresolved?` · 暂无当前价格 ${unresolved} 条`:''}。`;
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

  function itemNative(item){
    const legs=item.type==='roundtrip'?[item.outbound,item.inbound]:[item.outbound];
    if(legs.some(l=>!l.bestOffer)) return '';
    const currencies=[...new Set(legs.map(l=>String(l.bestOffer.currency||'').toUpperCase()))];
    if(currencies.length!==1) return '';
    return nativeMoney(legs.reduce((s,l)=>s+Number(l.bestOffer.amount),0),currencies[0]);
  }

  function itemStatus(item){
    const legs=item.type==='roundtrip'?[item.outbound,item.inbound]:[item.outbound];
    if(legs.every(l=>l.sourceKind==='official-current'&&l.bestOffer)) return {text:'官网当前价',cls:'current'};
    if(legs.some(l=>l.sourceKind==='reference')) return {text:'含官网核验参考',cls:'reference'};
    const air=legs[0].variant.airline;
    return air==='CA'?{text:'国航实时价格接口待接入',cls:'unavailable'}:{text:'实时查询连接异常',cls:'unavailable'};
  }

  function baggageText(leg){
    const o=leg.bestOffer;
    if(leg.sourceKind==='reference'&&o?.baggage_text) return o.baggage_text;
    const opts=Array.isArray(o?.baggage_options)?o.baggage_options:[];
    const hits=opts.filter(x=>/baggage|luggage|bag|багаж/i.test(JSON.stringify(x))).slice(0,8);
    if(hits.length){
      return hits.map(x=>[x.title,x.shortDescription,x.description,x.value,x.size].filter(Boolean).join(' · ')).filter(Boolean).join('<br>');
    }
    return AIRLINES[leg.variant.airline].baggage;
  }

  function statusBox(leg){
    const o=leg.bestOffer;
    if(leg.sourceKind==='official-current'&&o){
      const rows=[
        ['当前最低票价',`${nativeMoney(o.amount,o.currency)} · 含税总价以官网返回为准`],
        ['票价档 / 舱等',[o.bundle,o.service_class].filter(Boolean).join(' · ')||'—'],
        ['订座舱位',o.booking_class||'—'],
        ['当前余票',Number.isFinite(Number(o.available_seats))?`${o.available_seats} 席`:'官网未返回具体数字'],
        ['基础票价',Number.isFinite(Number(o.tax_detail?.base_amount))?nativeMoney(o.tax_detail.base_amount,o.tax_detail.currency||o.currency):'—'],
        ['税费',Number.isFinite(Number(o.tax_detail?.taxes_amount))?nativeMoney(o.tax_detail.taxes_amount,o.tax_detail.currency||o.currency):'—']
      ];
      return `<div class="official-box"><div class="box-title">官网当前可售报价</div>${rows.map(([k,v])=>`<div class="fare-row"><span>${esc(k)}</span><strong${k==='当前余票'?' class="seat-ok"':''}>${esc(v)}</strong></div>`).join('')}</div>`;
    }
    if(leg.sourceKind==='reference'&&o){
      const rows=[['人民币参考价',money(leg.priceCny)],['白航原币',`${nativeMoney(o.amount,o.currency)} · 含税`],['基础票价',nativeMoney(o.tax_detail?.base_amount,o.currency)],['税费',nativeMoney(o.tax_detail?.taxes_amount,o.currency)],['核验时舱位',[o.bundle,o.booking_class?`${o.booking_class} 舱`:null].filter(Boolean).join(' · ')],['核验时余票',`${o.available_seats} 席`],['状态说明','当前实时查询失败；以上仅为官网人工核验记录']];
      return `<div class="reference-box"><div class="box-title">白航官网核验参考</div>${rows.map(([k,v])=>`<div class="fare-row"><span>${esc(k)}</span><strong${k==='核验时余票'?' class="seat-ok"':''}>${esc(v||'—')}</strong></div>`).join('')}</div>`;
    }
    const msg=leg.variant.airline==='CA'?'CTB Flights 的国航实时价格接口尚未独立接入；当前不把班表存在误写成“有票”。':'白航官网实时连接本次未返回可售报价；这不等于该航班无票。';
    return `<div class="fare-box"><div class="box-title">价格状态</div><div class="fare-row"><span>当前结果</span><strong>${esc(msg)}</strong></div></div>`;
  }

  function legDetail(leg,label='航段'){
    const a=AIRLINES[leg.variant.airline], o=leg.bestOffer||{};
    const logo=o.airline_logo||a.logo;
    const arriveSuffix=leg.spec.offset?`<sup>+${leg.spec.offset}</sup>`:'';
    return `<div class="leg-block">
      <div class="leg-label">${esc(label)}</div>
      <div class="airline-line"><div class="airline-id"><div class="airline-logo-wrap"><img class="airline-logo" src="${esc(logo)}" alt="${esc(a.short)} Logo"></div><div class="airline-text"><strong>${esc(a.name)}</strong><small>${esc(a.english)}</small></div></div><div class="flight-no"><small>航班号</small><strong>${esc(leg.spec.flightNumber)}</strong></div></div>
      <div class="timeline"><div class="airport-time"><strong>${esc(leg.spec.depart)}</strong><b>${esc(leg.fromCity)} ${esc(leg.from)}</b><small>${esc(leg.variant.airport)}${leg.spec.terminalFrom?` · ${esc(leg.spec.terminalFrom)}`:''}</small></div><div class="flight-mid"><span>${durationText(leg.spec.duration)}</span><div class="flight-line"></div><span>${leg.variant.direct?'直飞':`经 ${esc(leg.variant.via?.city||'中转')}`}</span></div><div class="airport-time end"><strong>${esc(leg.spec.arrive)}${arriveSuffix}</strong><b>${esc(leg.toCity)} ${esc(leg.to)}</b><small>${leg.to==='MSQ'?'明斯克国家机场':esc(leg.variant.airport)}</small></div></div>
      <div class="chips"><span class="chip">${formatDate(leg.date)} ${week(leg.date)}</span><span class="chip">${esc(leg.spec.aircraft)}</span><span class="chip">${leg.variant.direct?'直飞':'经停/中转'}</span></div>
      ${statusBox(leg)}
      <div class="baggage-wrap"><button class="baggage-toggle" type="button"><span>🧳 行李额度 · 点击展开</span><span>⌄</span></button><div class="baggage-content">${baggageText(leg)}</div></div>
      <a class="official-link" href="${esc(a.official)}" target="_blank" rel="noopener noreferrer">前往${esc(a.short)}官网核对 / 购买 →</a>
    </div>`;
  }

  function renderCard(item,bestPrice){
    const out=item.outbound, a=AIRLINES[out.variant.airline], st=itemStatus(item);
    const route=item.type==='roundtrip'?`${out.variant.city} ⇄ 明斯克`:out.routeLabel;
    const meta=item.type==='roundtrip'?`${formatDate(out.date)} 去 · ${formatDate(item.inbound.date)} 回 · ${out.spec.flightNumber} / ${item.inbound.spec.flightNumber}`:`${formatDate(out.date)} · ${week(out.date)} · ${out.spec.flightNumber}`;
    const details=item.type==='roundtrip'?legDetail(out,'去程')+legDetail(item.inbound,'返程'):legDetail(out,'单程');
    const isBest=Number.isFinite(item.priceCny)&&item.priceCny===bestPrice;
    return `<article class="flight-card${isBest?' best':''}" data-id="${esc(item.id)}"><div class="flight-summary"><div class="summary-route"><div class="summary-brand"><img src="${esc(a.logo)}" alt=""><span class="type-pill${out.variant.direct?'':' stop'}">${out.variant.direct?'直飞航班':'经停/中转'}</span></div><h4>${esc(route)}</h4><small>${esc(meta)}</small></div><div class="summary-price"><span class="price-main">${Number.isFinite(item.priceCny)?money(item.priceCny):'—'}</span>${itemNative(item)?`<span class="price-native">${esc(itemNative(item))}</span>`:''}<span class="price-tag ${st.cls}">${esc(st.text)}</span></div><div class="chevron">⌄</div></div><div class="flight-details">${details}</div></article>`;
  }

  function sortItems(items){
    const v=sortSelect.value;
    return [...items].sort((a,b)=>{
      if(v==='date') return a.date.localeCompare(b.date);
      if(v==='duration') return a.duration-b.duration;
      return (Number.isFinite(a.priceCny)?a.priceCny:Infinity)-(Number.isFinite(b.priceCny)?b.priceCny:Infinity)||a.date.localeCompare(b.date);
    });
  }

  function renderCalendar(items){
    const byDate=new Map();
    for(const item of items){const old=byDate.get(item.date);if(!old||(Number.isFinite(item.priceCny)&&( !Number.isFinite(old.priceCny)||item.priceCny<old.priceCny)))byDate.set(item.date,item);}
    const arr=[...byDate.values()].sort((a,b)=>a.date.localeCompare(b.date));
    const min=Math.min(...arr.filter(x=>Number.isFinite(x.priceCny)).map(x=>x.priceCny),Infinity);
    calendarList.innerHTML=arr.length?arr.map(item=>`<div class="calendar-row${item.priceCny===min?' best':''}"><div class="calendar-date"><strong>${formatDate(item.date)}</strong><small>${week(item.date)}</small></div><div class="calendar-route">${esc(item.type==='roundtrip'?`${item.outbound.variant.city} ⇄ 明斯克`:item.outbound.routeLabel)}<br>${esc(item.outbound.spec.flightNumber)}</div><div class="calendar-price">${Number.isFinite(item.priceCny)?money(item.priceCny):'—'}<small>${itemStatus(item).text}</small></div></div>`).join(''):'<div class="empty">所选时间段没有匹配到计划班期。</div>';
  }

  function render(){
    state.items=buildItems(); const items=sortItems(state.items);
    const prices=items.filter(x=>Number.isFinite(x.priceCny)).map(x=>x.priceCny),best=prices.length?Math.min(...prices):Infinity;
    resultCount.textContent=`${items.length} 个方案`;
    resultTitle.textContent=state.trip==='roundtrip'?'往返航班时间段价格比较':'时间段航班价格比较';
    flightList.innerHTML=items.length?items.map(x=>renderCard(x,best)).join(''):'<div class="empty">所选条件没有匹配到计划班期。</div>';
    renderCalendar(items);
  }

  async function search(){
    if(state.busy||!validate()) return;
    state.busy=true; searchButton.disabled=true; searchButtonText.textContent='正在查询中…';
    results.classList.remove('hidden'); flightList.innerHTML='<div class="loading-card"><div class="spinner"></div><strong>正在查询航空公司当前价格…</strong><small>白航通过 CTB Flights 独立 Cloudflare Function 查询；请稍候。</small></div>'; calendarList.innerHTML='';
    const groups=selectedGroups();
    state.outbound=buildLegs(state.direction,startDate.value,endDate.value,groups);
    const reverse=state.direction==='to-minsk'?'from-minsk':'to-minsk';
    state.inbound=state.trip==='roundtrip'?buildLegs(reverse,returnStart.value,returnEnd.value,groups):[];
    const all=[...state.outbound,...state.inbound];
    if(!all.length){render();sourceStatus.textContent='所选时间段没有匹配到计划班期。';state.busy=false;searchButton.disabled=false;searchButtonText.textContent='搜索时间段内的航班';return;}
    await queryLegs(all); render();
    state.busy=false; searchButton.disabled=false; searchButtonText.textContent='搜索时间段内的航班';
  }

  document.querySelectorAll('[data-trip]').forEach(btn=>btn.addEventListener('click',()=>{document.querySelectorAll('[data-trip]').forEach(x=>x.classList.toggle('active',x===btn));state.trip=btn.dataset.trip;returnRange.classList.toggle('hidden',state.trip!=='roundtrip');}));
  document.querySelectorAll('[data-direction]').forEach(btn=>btn.addEventListener('click',()=>{document.querySelectorAll('[data-direction]').forEach(x=>x.classList.toggle('active',x===btn));state.direction=btn.dataset.direction;}));
  $('toggleAll').addEventListener('click',()=>{const boxes=[...cityGrid.querySelectorAll('input')],all=boxes.every(x=>x.checked);boxes.forEach(x=>x.checked=!all);$('toggleAll').textContent=all?'全选':'取消全选';});
  searchButton.addEventListener('click',search); sortSelect.addEventListener('change',()=>{if(!results.classList.contains('hidden'))render();});
  flightList.addEventListener('click',e=>{const bag=e.target.closest('.baggage-toggle');if(bag){e.stopPropagation();bag.closest('.baggage-wrap').classList.toggle('open');return;}const summary=e.target.closest('.flight-summary');if(summary)summary.closest('.flight-card').classList.toggle('open');});

  renderCities(); initDates();
  document.title=`CTB Flights · 白俄留学生机票比价 · v${VERSION}`;
  document.querySelectorAll('.version').forEach(el=>el.textContent=`v${VERSION}`);
})();
