(() => {
  'use strict';
  const VERSION = '1.1.1';
  window.CTB_VERSION = VERSION;
  document.querySelectorAll('[data-version]').forEach(el => { el.textContent = `v${VERSION}`; });
  const baseTitle = document.body?.dataset?.page === 'results'
    ? 'CTB Flights · 时间段航班价格比较'
    : 'CTB Flights · 白俄留学生机票比价';
  document.title = `${baseTitle} · v${VERSION}`;
})();
