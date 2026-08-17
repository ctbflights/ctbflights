(() => {
  'use strict';

  const { AIRLINES, VARIANTS, CITY_OPTIONS } = window.CTB_DATA;
  const params = new URLSearchParams(location.search);
  const $ = id => document.getElementById(id);

  const AIRPORT_NAMES = {
    MSQ: '明斯克国家机场',
    PEK: '北京首都国际机场',
    XIY: '西安咸阳国际机场',
    URC: '乌鲁木齐天山国际机场',
    SYX: '三亚凤凰国际机场'
  };
  const CITY_NAMES = { MSQ:'明斯克', PEK:'北京', XIY:'西安', URC:'乌鲁木齐', SYX:'三亚' };
  const CABIN_LABELS = { economy:'经济舱', premium_economy:'超级经济舱', business:'商务舱', first:'头等舱' };

  const state = {
    trip: params.get('trip') === 'roundtrip' ? 'roundtrip' : 'oneway',
    direction: params.get('direction') === 'from-minsk' ? 'from-minsk' : 'to-minsk',
    start: params.get('start'),
    end: params.get('end'),
    returnStart: params.get('returnStart'),
    returnEnd: params.get('returnEnd'),
    cities: (params.get('cities') || '').split(',').filter(code => CITY_OPTIONS[code]),
    adults: Math.min(9, Math.max(1, Number(params.get('adults')) || 1)),
    children: Math.min(8, Math.max(0, Number(params.get('children')) || 0)),
    cabin: ['economy','premium_economy','business','first'].includes(params.get('cabin')) ? params.get('cabin') : 'economy',
    stops: ['0','1','any'].includes(params.get('stops')) ? params.get('stops') : 'any',
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
  const durationText = m => Number.isFinite(Number(m)) ? `${Math.floor(Number(m)/60)}h ${String(Number(m)%60).padStart(2,'0')}m` : '—';
  const originalMoney = (amount,currency) => Number.isFinite(Number(amount)) ? `${Number(amount).toLocaleString('zh-CN',{maximumFractionDigits:2})} ${String(currency||'').toUpperCase()}` : '—';
  const cnyMoney = amount => Number.isFinite(Number(amount)) ? `¥${Math.round(Number(amount)).toLocaleString('zh-CN')}` : '—';
  const timePart = value => String(value||'').match(/T(\d{2}:\d{2})/)?.[1] || null;
  const datePart = value => String(value||'').slice(0,10);
  const dayDiff = (a,b) => {
    if(!/^\d{4}-\d{2}-\d{2}$/.test(a||'') || !/^\d{4}-\d{2}-\d{2}$/.test(b||'')) return 0;
    return Math.round((Date.parse(`${b}T00:00:00Z`)-Date.parse(`${a}T00:00:00Z`))/86400000);
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
  function allowedVariant(variant){
    if(state.stops==='0') return variant.direct;
    return true;
  }

  function buildLegs(direction,start,end){
    const chosen = state.cities.length ? state.cities : Object.keys(CITY_OPTIONS);
    const out=[];
    for(const variant of VARIANTS.filter(v=>chosen.includes(v.group)&&allowedVariant(v))){
      const spec=specOf(variant,direction);
      for(const dateObj of dateList(start,end)){
        if(!operating(spec,dateObj)) continue;
        const ep=endpoints(variant,direction), date=isoDate(dateObj);
        out.push({
          id:`${direction}|${variant.key}|${date}`,
          variant,variantKey:variant.key,direction,date,spec,
          from:ep.from,to:ep.to,fromCity:ep.fromCity,toCity:ep.toCity,
          routeLabel:routeLabel(variant,direction)
        });
      }
    }
    return out;
  }

  function makeItems(){
    const outbound=buildLegs(state.direction,state.start,state.end);
    if(state.trip==='oneway') return outbound.map(leg=>({
      id:leg.id,type:'oneway',outbound:leg,date:leg.date,offer:null,errorCode:null,sourceKind:null,provider:null
    }));

    const reverse=state.direction==='to-minsk'?'from-minsk':'to-minsk';
    const inbound=buildLegs(reverse,state.returnStart,state.returnEnd);
    const pairs=[];
    for(const out of outbound){
      for(const back of inbound.filter(x=>x.variantKey===out.variantKey&&x.date>=out.date)){
        pairs.push({
          id:`${out.id}__${back.id}`,type:'roundtrip',outbound:out,inbound:back,date:out.date,
          offer:null,errorCode:null,sourceKind:null,provider:null
        });
      }
    }
    return pairs;
  }

  function apiItem(item){
    const out=item.outbound;
    const search={
      id:item.id,
      origin:out.from,
      destination:out.to,
      departure_date:out.date,
      preferred_carrier:out.variant.airline,
      preferred_flight_number:out.spec.flightNumber,
      direct:out.variant.direct,
      max_stops:out.variant.direct?0:1,
      adults:state.adults,
      children:state.children,
      cabin_class:state.cabin
    };
    if(item.type==='roundtrip'){
      search.return_date=item.inbound.date;
      search.preferred_return_carrier=item.inbound.variant.airline;
      search.preferred_return_flight_number=item.inbound.spec.flightNumber;
    }
    return search;
  }

  function offerRank(offer){ return offer?.price_status==='verified'?0:1; }
  function itemSortPrice(item){
    if(!item.offer) return Infinity;
    if(String(item.offer.currency).toUpperCase()==='CNY') return Number(item.offer.amount);
    return Number(item.offer.amount) || Infinity;
  }
  function isVerified(item){ return item.offer?.price_status==='verified'; }

  function applyResult(item,result){
    item.errorCode=result?.code||result?.error||null;
    item.sourceKind=result?.source_kind||null;
    item.provider=result?.provider||null;
    const offers=Array.isArray(result?.offers)?result.offers.filter(o=>Number.isFinite(Number(o?.amount))):[];
    offers.sort((a,b)=>offerRank(a)-offerRank(b)||Number(a.amount)-Number(b.amount));
    item.offer=offers[0]||null;
  }

  async function queryItems(){
    const byId=new Map(state.items.map(x=>[x.id,x]));
    const searches=state.items.map(apiItem);
    let done=0;
    for(let i=0;i<searches.length;i+=8){
      const chunk=searches.slice(i,i+8);
      $('queryStatus').innerHTML=`<span class="status-dot"></span>正在查询 Ignav 当前票价… ${done}/${searches.length}`;
      try{
        const response=await fetch('/api/search',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({searches:chunk})});
        const data=await response.json().catch(()=>({}));
        if(!response.ok) throw new Error(data?.code||`HTTP ${response.status}`);
        const returned=new Set();
        for(const result of data?.results||[]){
          const item=byId.get(result?.id);
          if(item){ applyResult(item,result); returned.add(result.id); }
        }
        for(const search of chunk){
          if(!returned.has(search.id)){
            const item=byId.get(search.id);
            if(item){item.offer=null;item.errorCode='missing_result';}
          }
        }
      }catch(error){
        for(const search of chunk){
          const item=byId.get(search.id);
          if(item){item.offer=null;item.errorCode='api_connection_failed';}
        }
      }
      done+=chunk.length;
      renderProgress();
    }

    const verified=state.items.filter(x=>x.offer&&isVerified(x)).length;
    const unverified=state.items.filter(x=>x.offer&&!isVerified(x)).length;
    const total=verified+unverified;
    $('queryStatus').innerHTML=total
      ? `<span class="status-dot"></span>查询完成 · ${verified} 个已核验价格${unverified?` · ${unverified} 个参考价`:''} · 数据源 Ignav`
      : `<span class="status-dot"></span>查询完成 · Ignav 当前未返回与计划航班匹配的可售报价`;
  }

  function statusFor(item){
    if(item.offer){
      return item.offer.price_status==='verified'
        ? {text:'已核验价格',className:'live'}
        : {text:'参考价 · 待官网确认',className:'muted'};
    }
    if(item.errorCode==='ignav_not_configured') return {text:'Ignav 接口待配置',className:'muted'};
    if(item.errorCode==='no_current_offer') return {text:'暂无当前可售报价',className:'muted'};
    if(item.errorCode==='flight_not_found') return {text:'当前结果未匹配到该计划航班',className:'muted'};
    if(['ignav_auth_failed','ignav_billing_or_limit','ignav_upstream_failed','ignav_timeout','ignav_transport_failed','api_connection_failed'].includes(item.errorCode)) return {text:'实时票价源暂时不可用',className:'muted'};
    return {text:'暂未获得实时报价',className:'muted'};
  }

  function carrierInfo(item,legKey='outbound'){
    const live=item.offer?.[legKey];
    const first=live?.segments?.[0];
    const code=String(first?.marketing_carrier_code||item[legKey]?.variant?.airline||'').toUpperCase();
    const known=AIRLINES[code];
    return known || {
      code,
      name:first?.operating_carrier_name||live?.carrier||code||'航空公司',
      short:live?.carrier||first?.operating_carrier_name||code||'航空公司',
      english:'',
      logo:'',
      official:'#',
      baggage:'请以航空公司官网为准。'
    };
  }

  function liveSegments(item,legKey){
    const segments=item.offer?.[legKey]?.segments;
    return Array.isArray(segments)&&segments.length?segments:[];
  }

  function flightNumbers(item,legKey){
    const segs=liveSegments(item,legKey);
    if(!segs.length) return item[legKey].spec.flightNumber;
    return segs.map(s=>`${String(s.marketing_carrier_code||'').toUpperCase()}${s.flight_number||''}`).filter(Boolean).join(' + ');
  }

  function airportName(code,leg){
    if(AIRPORT_NAMES[code]) return AIRPORT_NAMES[code];
    if(code===leg?.variant?.via?.code) return leg.variant.via.airport;
    return code;
  }

  function segmentListHtml(item,legKey){
    const segs=liveSegments(item,legKey);
    if(!segs.length) return '';
    const rows=[];
    segs.forEach((seg,index)=>{
      if(index>0){
        const prev=segs[index-1];
        const prevUtc=Date.parse(prev?.arrival_time_utc||'');
        const nextUtc=Date.parse(seg?.departure_time_utc||'');
        const mins=Number.isFinite(prevUtc)&&Number.isFinite(nextUtc)?Math.max(0,Math.round((nextUtc-prevUtc)/60000)):null;
        rows.push(`<div class="transfer-row">${esc(CITY_NAMES[seg.departure_airport]||seg.departure_airport)}转机${Number.isFinite(mins)?` · ${durationText(mins)}`:''}</div>`);
      }
      rows.push(`<div class="segment-row">
        <strong>${esc(`${seg.marketing_carrier_code||''}${seg.flight_number||''}`)}</strong>
        <span>${esc(seg.departure_airport)} ${esc(timePart(seg.departure_time_local)||'—')} → ${esc(seg.arrival_airport)} ${esc(timePart(seg.arrival_time_local)||'—')}</span>
        <small>${esc(durationText(seg.duration_minutes))}${seg.aircraft?` · ${esc(seg.aircraft)}`:''}</small>
      </div>`);
    });
    return `<div class="segment-list">${rows.join('')}</div>`;
  }

  function legDetail(item,legKey,label){
    const leg=item[legKey];
    const live=item.offer?.[legKey];
    const segs=liveSegments(item,legKey);
    const first=segs[0];
    const last=segs[segs.length-1];
    const airline=carrierInfo(item,legKey);
    const depart=first?timePart(first.departure_time_local):leg.spec.depart;
    const arrive=last?timePart(last.arrival_time_local):leg.spec.arrive;
    const depDate=first?datePart(first.departure_time_local):leg.date;
    const arrDate=last?datePart(last.arrival_time_local):leg.date;
    const offset=first&&last?Math.max(0,dayDiff(depDate,arrDate)):Number(leg.spec.offset||0);
    const from=first?.departure_airport||leg.from;
    const to=last?.arrival_airport||leg.to;
    const duration=live?.duration_minutes||leg.spec.duration;
    const connectionCount=Math.max(0,segs.length-1);
    const aircraft=[...new Set(segs.map(s=>s.aircraft).filter(Boolean))].join(' + ')||leg.spec.aircraft;
    const logo=airline.logo?`<img class="detail-logo carrier-${esc(airline.code.toLowerCase())}" src="${airline.logo}" alt="${esc(airline.short)}">`:'';

    return `<div class="leg-detail">
      <div class="detail-label">${esc(label)}</div>
      <div class="airline-detail-head">
        <div class="airline-brand-detail">${logo}<div><strong>${esc(airline.name)}</strong>${airline.english?`<small>${esc(airline.english)}</small>`:''}</div></div>
        <div class="flight-number"><small>航班号</small><strong>${esc(flightNumbers(item,legKey))}</strong></div>
      </div>
      <div class="timeline">
        <div><strong>${esc(depart||'—')}</strong><b>${esc(CITY_NAMES[from]||leg.fromCity)} ${esc(from)}</b><small>${esc(airportName(from,leg))}</small></div>
        <div class="timeline-mid"><span>${esc(durationText(duration))}</span><i></i><span>${connectionCount?`${connectionCount} 次转机`:'直飞'}</span></div>
        <div class="timeline-end"><strong>${esc(arrive||'—')}${offset?`<sup>+${offset}</sup>`:''}</strong><b>${esc(CITY_NAMES[to]||leg.toCity)} ${esc(to)}</b><small>${esc(airportName(to,leg))}</small></div>
      </div>
      <div class="detail-chips"><span>${formatDate(leg.date)} ${week(leg.date)}</span><span>${esc(aircraft)}</span><span>${connectionCount?`${connectionCount} 次转机`:'直飞'}</span></div>
      ${segmentListHtml(item,legKey)}
    </div>`;
  }

  function baggageHtml(item){
    const bags=item.offer?.bags;
    const lines=[];
    if(bags && Object.prototype.hasOwnProperty.call(bags,'checked')) lines.push(`托运行李 × ${esc(bags.checked)}`);
    if(bags && Object.prototype.hasOwnProperty.call(bags,'carry_on')) lines.push(`随身行李 × ${esc(bags.carry_on)}`);
    if(!lines.length) lines.push('Ignav 当前结果未返回明确行李额度，请以航空公司官网为准。');
    else lines.push('未返回的行李字段不代表 0 件；具体重量、尺寸以对应票价规则为准。');
    lines.push('额外行李加购价格：当前 Ignav 结果未提供，购买前请在航司官网确认。');
    return lines.map(esc).join('<br>');
  }

  function fareBox(item){
    if(!item.offer){
      return `<div class="fare-box"><div class="fare-title">价格信息</div><div class="fare-row"><span>当前结果</span><strong>${esc(statusFor(item).text)}</strong></div></div>`;
    }
    const offer=item.offer;
    const rows=[
      ['当前票价',originalMoney(offer.amount,offer.currency)],
      ['价格状态',offer.price_status==='verified'?'已核验':'未核验 · 仅作参考'],
      ['数据来源','Ignav Flight Prices API'],
      ['舱等',CABIN_LABELS[offer.cabin_class||state.cabin]||offer.cabin_class||'—'],
      ['联程状态',offer.requires_self_transfer?'⚠ 需要自行转机 / 分票':'正常联程 · 无需自行转机']
    ];
    return `<div class="fare-box ${offer.price_status==='verified'?'live-box':''}"><div class="fare-title">当前票价信息</div>${rows.map(([k,v])=>`<div class="fare-row"><span>${esc(k)}</span><strong>${esc(v)}</strong></div>`).join('')}${offer.price_status==='unverified'?'<div class="fare-warning">该金额是搜索参考价，最终价格请在航司或 OTA 购买页确认。</div>':''}</div>`;
  }

  function bookingArea(item){
    const airline=carrierInfo(item,'outbound');
    if(!item.offer?.ignav_id){
      return airline.official&&airline.official!=='#'?`<div class="booking-box"><a class="official-link" href="${airline.official}" target="_blank" rel="noopener noreferrer">前往${esc(airline.short)}官网查看 →</a></div>`:'';
    }
    return `<div class="booking-box">
      <button class="booking-fetch" type="button" data-item-id="${esc(item.id)}">获取购买链接</button>
      <div class="booking-result"><small>点击后由 Ignav 查询本行程可用的航空公司官网 / OTA 购买入口。</small></div>
    </div>`;
  }

  function detailsHtml(item){
    const legs=item.type==='roundtrip'
      ?legDetail(item,'outbound','去程')+legDetail(item,'inbound','返程')
      :legDetail(item,'outbound','单程航班详情');
    return `${legs}${fareBox(item)}<div class="baggage-block"><button type="button" class="baggage-toggle">🧳 行李额度 <span>⌄</span></button><div class="baggage-content">${baggageHtml(item)}</div></div>${bookingArea(item)}`;
  }

  function routeForItem(item){
    const live=item.offer?.outbound;
    const segs=Array.isArray(live?.segments)?live.segments:[];
    if(segs.length){
      const first=segs[0], last=segs[segs.length-1];
      const from=CITY_NAMES[first.departure_airport]||first.departure_airport;
      const to=CITY_NAMES[last.arrival_airport]||last.arrival_airport;
      return item.type==='roundtrip'?`${from} ⇄ ${to}`:`${from} → ${to}`;
    }
    return item.type==='roundtrip'?`${item.outbound.fromCity} ⇄ ${item.outbound.toCity}`:item.outbound.routeLabel;
  }

  function summaryMeta(item){
    if(item.type==='roundtrip') return `${formatDate(item.outbound.date)} 去 · ${formatDate(item.inbound.date)} 回 · ${flightNumbers(item,'outbound')} / ${flightNumbers(item,'inbound')}`;
    return `${formatDate(item.outbound.date)} · ${week(item.outbound.date)} · ${flightNumbers(item,'outbound')}`;
  }

  function connectionLabel(item){
    const segs=liveSegments(item,'outbound');
    const count=segs.length?Math.max(0,segs.length-1):(item.outbound.variant.direct?0:1);
    return count?`${count} 次转机`:'直飞航班';
  }

  function displayPrice(item){
    if(!item.offer) return '—';
    return String(item.offer.currency).toUpperCase()==='CNY'?cnyMoney(item.offer.amount):originalMoney(item.offer.amount,item.offer.currency);
  }

  function cardHtml(item,bestId){
    const airline=carrierInfo(item,'outbound');
    const status=statusFor(item);
    const isBest=item.id===bestId;
    const logo=airline.logo?`<img class="summary-logo carrier-${esc(airline.code.toLowerCase())}" src="${airline.logo}" alt="${esc(airline.short)}">`:`<strong>${esc(airline.short)}</strong>`;
    return `<article class="flight-card${isBest?' best':''}" data-id="${esc(item.id)}">
      <button class="flight-summary" type="button">
        <div class="summary-route"><div class="route-line"><h3>${esc(routeForItem(item))}</h3><span class="route-tag${connectionLabel(item)==='直飞航班'?'':' stop'}">${esc(connectionLabel(item))}</span></div><small>${esc(summaryMeta(item))}</small></div>
        <div class="summary-airline">${logo}</div>
        <div class="summary-price"><strong>${esc(displayPrice(item))}</strong><small>${esc(status.text)}</small>${isBest?'<em>最低可靠价</em>':''}</div>
        <span class="chevron">⌄</span>
      </button>
      <div class="flight-details">${detailsHtml(item)}</div>
    </article>`;
  }

  function bestItemId(items){
    const verified=items.filter(x=>x.offer&&isVerified(x));
    const pool=verified.length?verified:items.filter(x=>x.offer);
    if(!pool.length) return null;
    return [...pool].sort((a,b)=>itemSortPrice(a)-itemSortPrice(b)||a.date.localeCompare(b.date))[0]?.id||null;
  }

  function renderCalendar(items){
    const byDate=new Map();
    for(const item of items){
      const current=byDate.get(item.date);
      if(!current){byDate.set(item.date,item);continue;}
      if(isVerified(item)!==isVerified(current)){
        if(isVerified(item)) byDate.set(item.date,item);
      }else if(itemSortPrice(item)<itemSortPrice(current)) byDate.set(item.date,item);
    }
    const list=[...byDate.values()].sort((a,b)=>a.date.localeCompare(b.date));
    const bestId=bestItemId(list);
    $('calendarList').innerHTML=list.length?list.map(item=>{
      const status=statusFor(item);
      return `<div class="calendar-row${item.id===bestId?' best':''}">
        <div class="calendar-date"><strong>${formatDate(item.date)}</strong><small>${week(item.date)}</small></div>
        <div class="calendar-route"><span>${esc(routeForItem(item))}</span><small>${esc(flightNumbers(item,'outbound'))}</small></div>
        <div class="calendar-price"><strong>${esc(displayPrice(item))}</strong><small>${item.id===bestId?'最低可靠价':esc(status.text)}</small></div>
      </div>`;
    }).join(''):'<div class="empty">所选时间段没有匹配到计划班期。</div>';
  }

  function sortedItems(){
    const value=$('sortSelect').value;
    return [...state.items].sort((a,b)=>{
      if(value==='date') return a.date.localeCompare(b.date);
      if(value==='duration'){
        const da=Number(a.offer?.outbound?.duration_minutes||a.outbound.spec.duration)+(a.inbound?Number(a.offer?.inbound?.duration_minutes||a.inbound.spec.duration):0);
        const db=Number(b.offer?.outbound?.duration_minutes||b.outbound.spec.duration)+(b.inbound?Number(b.offer?.inbound?.duration_minutes||b.inbound.spec.duration):0);
        return da-db;
      }
      if(isVerified(a)!==isVerified(b)) return isVerified(a)?-1:1;
      return itemSortPrice(a)-itemSortPrice(b)||a.date.localeCompare(b.date);
    });
  }

  function renderProgress(){
    const items=sortedItems();
    const bestId=bestItemId(items);
    $('resultCount').textContent=`${items.length} 个方案`;
    $('flightList').innerHTML=items.length?items.map(x=>cardHtml(x,bestId)).join(''):'<div class="empty">所选条件没有匹配到计划班期。</div>';
    renderCalendar(items);
  }

  function searchSummary(){
    const cityNames=(state.cities.length?state.cities:Object.keys(CITY_OPTIONS)).map(c=>CITY_OPTIONS[c]?.name).filter(Boolean).join(' / ');
    const direction=state.direction==='to-minsk'?'中国 → 明斯克':'明斯克 → 中国';
    const pax=`${state.adults} 成人${state.children?` + ${state.children} 儿童`:''}`;
    const cabin=CABIN_LABELS[state.cabin]||state.cabin;
    const stopLabel=state.stops==='0'?'仅直飞':state.stops==='1'?'最多 1 次转机':'不限经停';
    const dates=state.trip==='roundtrip'?`${state.start||'—'} 至 ${state.end||'—'} · 返程 ${state.returnStart||'—'} 至 ${state.returnEnd||'—'}`:`${state.start||'—'} 至 ${state.end||'—'}`;
    $('searchSummary').textContent=`${direction} · ${dates} · ${cityNames} · ${pax} · ${cabin} · ${stopLabel}`;
  }

  function editLink(){ $('editSearch').href=`index.html?${params.toString()}`; }

  async function loadBookingLinks(button){
    const item=state.items.find(x=>x.id===button.dataset.itemId);
    if(!item?.offer?.ignav_id) return;
    const box=button.closest('.booking-box');
    const resultBox=box.querySelector('.booking-result');
    button.disabled=true;
    button.textContent='正在获取购买链接…';
    try{
      const response=await fetch('/api/booking-links',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({ignav_id:item.offer.ignav_id})});
      const data=await response.json().catch(()=>({}));
      if(!response.ok) throw new Error(data?.code||`HTTP ${response.status}`);
      const links=(data?.booking_options||[]).flatMap(option=>option?.links||[]).filter(x=>x?.url);
      links.sort((a,b)=>(a.provider_type==='airline'?-1:0)-(b.provider_type==='airline'?-1:0));
      if(!links.length){
        const airline=carrierInfo(item,'outbound');
        resultBox.innerHTML=airline.official&&airline.official!=='#'?`<a class="official-link" href="${airline.official}" target="_blank" rel="noopener noreferrer">当前未返回预填购买链接，前往${esc(airline.short)}官网 →</a>`:'当前没有可用购买链接。';
      }else{
        resultBox.innerHTML=`<div class="booking-links">${links.slice(0,6).map(link=>`<a href="${esc(link.url)}" target="_blank" rel="noopener noreferrer"><span><strong>${esc(link.provider_name||'购票渠道')}</strong><small>${esc(link.provider_type==='airline'?'航空公司官网':'第三方平台')}${link.fare_name?` · ${esc(link.fare_name)}`:''}</small></span><b>${link.price?esc(originalMoney(link.price.amount,link.price.currency)):'打开购买页'} →</b></a>`).join('')}</div>`;
      }
      button.textContent='刷新购买链接';
    }catch(error){
      resultBox.textContent='购买链接暂时获取失败，请稍后重试。';
      button.textContent='重新获取购买链接';
    }finally{
      button.disabled=false;
    }
  }

  async function init(){
    if(!state.start||!state.end){ location.href='index.html'; return; }
    if(state.trip==='roundtrip'&&(!state.returnStart||!state.returnEnd)){ location.href='index.html'; return; }
    searchSummary(); editLink();
    state.items=makeItems();
    renderProgress();
    if(!state.items.length){ $('queryStatus').innerHTML='<span class="status-dot"></span>所选时间段没有匹配到计划班期。'; return; }
    await queryItems();
    renderProgress();
  }

  $('sortSelect').addEventListener('change',renderProgress);
  $('flightList').addEventListener('click',event=>{
    const booking=event.target.closest('.booking-fetch');
    if(booking){ event.preventDefault(); event.stopPropagation(); loadBookingLinks(booking); return; }
    const baggage=event.target.closest('.baggage-toggle');
    if(baggage){ event.preventDefault(); event.stopPropagation(); baggage.closest('.baggage-block').classList.toggle('open'); return; }
    const summary=event.target.closest('.flight-summary');
    if(summary) summary.closest('.flight-card').classList.toggle('open');
  });

  init();
})();
