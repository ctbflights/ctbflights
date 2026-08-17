(() => {
  'use strict';

  const { CITY_OPTIONS } = window.CTB_DATA;
  const $ = id => document.getElementById(id);
  const qs = new URLSearchParams(location.search);

  const tripButtons = [...document.querySelectorAll('[data-trip]')];
  const directionButtons = [...document.querySelectorAll('[data-direction]')];
  const cityGrid = $('cityGrid');
  const returnRange = $('returnRange');
  const startDate = $('startDate');
  const endDate = $('endDate');
  const returnStart = $('returnStartDate');
  const returnEnd = $('returnEndDate');
  const adultsInput = $('adultsInput');
  const childrenInput = $('childrenInput');
  const cabinSelect = $('cabinSelect');
  const stopsSelect = $('stopsSelect');
  const searchButton = $('searchButton');
  const searchButtonText = $('searchButtonText');

  let trip = qs.get('trip') === 'roundtrip' ? 'roundtrip' : 'oneway';
  let direction = qs.get('direction') === 'from-minsk' ? 'from-minsk' : 'to-minsk';

  const pad = n => String(n).padStart(2, '0');
  const isoLocal = date => `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}`;
  const plusDays = n => { const d = new Date(); d.setDate(d.getDate()+n); return isoLocal(d); };
  const asInt = (value, fallback) => Number.isInteger(Number(value)) ? Number(value) : fallback;

  function setActive(buttons, key, value) {
    buttons.forEach(btn => btn.classList.toggle('active', btn.dataset[key] === value));
  }

  function renderCities() {
    const requested = new Set((qs.get('cities') || 'PEK,XIY,URC,SYX').split(',').filter(Boolean));
    cityGrid.innerHTML = Object.entries(CITY_OPTIONS).map(([code, item]) => `
      <label class="city-option">
        <input type="checkbox" value="${code}" ${requested.has(code) ? 'checked' : ''}>
        <span class="city-check"></span>
        <span><strong>${item.name}</strong><small>${item.flights} · ${item.note}</small></span>
      </label>`).join('');
  }

  function initDates() {
    const min = isoLocal(new Date());
    [startDate, endDate, returnStart, returnEnd].forEach(el => { el.min = min; });
    startDate.value = qs.get('start') || plusDays(7);
    endDate.value = qs.get('end') || plusDays(21);
    returnStart.value = qs.get('returnStart') || plusDays(30);
    returnEnd.value = qs.get('returnEnd') || plusDays(45);
  }

  function initTravelers() {
    adultsInput.value = Math.min(9, Math.max(1, asInt(qs.get('adults'), 1)));
    childrenInput.value = Math.min(8, Math.max(0, asInt(qs.get('children'), 0)));
    const cabin = qs.get('cabin');
    cabinSelect.value = ['economy','premium_economy','business','first'].includes(cabin) ? cabin : 'economy';
    const stops = qs.get('stops');
    stopsSelect.value = ['0','1','any'].includes(stops) ? stops : 'any';
  }

  function applyState() {
    setActive(tripButtons, 'trip', trip);
    setActive(directionButtons, 'direction', direction);
    returnRange.classList.toggle('hidden', trip !== 'roundtrip');
  }

  function selectedCities() {
    return [...cityGrid.querySelectorAll('input:checked')].map(el => el.value);
  }

  function validate() {
    const cities = selectedCities();
    const adults = asInt(adultsInput.value, 1);
    const children = asInt(childrenInput.value, 0);
    if (!cities.length) { alert('请至少选择一个中国城市。'); return false; }
    if (!startDate.value || !endDate.value || startDate.value > endDate.value) { alert('请选择正确的去程时间范围。'); return false; }
    if (trip === 'roundtrip' && (!returnStart.value || !returnEnd.value || returnStart.value > returnEnd.value)) { alert('请选择正确的返程时间范围。'); return false; }
    if (trip === 'roundtrip' && returnEnd.value < startDate.value) { alert('返程日期不能早于去程日期。'); return false; }
    if (adults < 1 || children < 0 || adults + children > 9) { alert('乘客总数需为 1–9 人，且至少 1 名成人。'); return false; }
    return true;
  }

  tripButtons.forEach(btn => btn.addEventListener('click', () => {
    trip = btn.dataset.trip;
    applyState();
  }));

  directionButtons.forEach(btn => btn.addEventListener('click', () => {
    direction = btn.dataset.direction;
    applyState();
  }));

  $('toggleAll').addEventListener('click', () => {
    const boxes = [...cityGrid.querySelectorAll('input')];
    const all = boxes.every(x => x.checked);
    boxes.forEach(x => { x.checked = !all; });
    $('toggleAll').textContent = all ? '全选' : '取消全选';
  });

  searchButton.addEventListener('click', () => {
    if (!validate()) return;
    searchButton.disabled = true;
    searchButtonText.textContent = '正在进入比价…';

    const params = new URLSearchParams({
      trip,
      direction,
      start: startDate.value,
      end: endDate.value,
      cities: selectedCities().join(','),
      adults: String(asInt(adultsInput.value, 1)),
      children: String(asInt(childrenInput.value, 0)),
      cabin: cabinSelect.value,
      stops: stopsSelect.value
    });
    if (trip === 'roundtrip') {
      params.set('returnStart', returnStart.value);
      params.set('returnEnd', returnEnd.value);
    }
    location.href = `results.html?${params.toString()}`;
  });

  renderCities();
  initDates();
  initTravelers();
  applyState();
})();
