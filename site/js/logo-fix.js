(() => {
  'use strict';

  let airChinaDataUri = null;
  let attempted = false;

  function fallbackMarkup(img) {
    const wrap = document.createElement('span');
    wrap.className = 'airchina-fallback';
    wrap.innerHTML = '<span class="airchina-fallback-mark">凤凰</span><span class="airchina-fallback-text"><b>AIR CHINA</b><small>中国国际航空公司</small></span>';
    img.replaceWith(wrap);
  }

  function applyLogo() {
    document.querySelectorAll('img.carrier-ca').forEach((img) => {
      if (img.dataset.ctbLogoFixed === '1') return;
      img.dataset.ctbLogoFixed = '1';
      if (airChinaDataUri) {
        img.src = airChinaDataUri;
        img.removeAttribute('srcset');
        img.onerror = () => fallbackMarkup(img);
      } else if (attempted) {
        fallbackMarkup(img);
      }
    });
  }

  async function loadOfficialLocalLogo() {
    try {
      const response = await fetch('/assets/logos/air-china-black.svg?v=1.1.1', { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const text = await response.text();
      const match = text.match(/href=["'](data:image\/png;base64,[^"']+)["']/i);
      if (!match) throw new Error('embedded_png_missing');
      airChinaDataUri = match[1];
    } catch (error) {
      console.warn('[CTB Flights] Air China local logo fallback:', error);
    } finally {
      attempted = true;
      applyLogo();
    }
  }

  const observer = new MutationObserver(applyLogo);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  loadOfficialLocalLogo();
  applyLogo();
})();
