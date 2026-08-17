(() => {
  'use strict';

  const VERSION = '1.0.21';
  const BRANDS = {
    CA: {
      name: '中国国际航空股份有限公司',
      short: '中国国际航空',
      // Air China wordmark sourced from Air China Limited; official-site asset is the fallback.
      logo: 'https://upload.wikimedia.org/wikipedia/commons/3/3b/Air_China_wordmark.svg',
      fallbackLogo: 'https://webresource.airchina.com.cn/_next/static/media/logo.85385003.png'
    },
    B2: {
      name: '白俄罗斯航空公司',
      short: '白俄罗斯航空',
      logo: '/assets/logos/belavia.svg',
      fallbackLogo: null
    }
  };

  function carrierFromContext(el) {
    const card = el.closest('.flight-card, .leg-block') || el.parentElement;
    const text = card?.textContent || '';
    if (/\bCA\d{3,4}\b/.test(text) || text.includes('中国国际航空')) return 'CA';
    if (/\bB2\d{3,4}\b/.test(text) || text.includes('白俄罗斯航空')) return 'B2';
    return null;
  }

  function ensureFallback(img, carrier) {
    let fallback = img.nextElementSibling;
    if (!fallback || !fallback.classList.contains('brand-logo-fallback')) {
      fallback = document.createElement('span');
      fallback.className = 'brand-logo-fallback';
      img.insertAdjacentElement('afterend', fallback);
    }
    fallback.textContent = BRANDS[carrier].short;
    fallback.hidden = true;
    return fallback;
  }

  function setBrandLayout(img, carrier) {
    img.dataset.ctbCarrier = carrier;
    img.alt = `${BRANDS[carrier].name} Logo`;
    img.referrerPolicy = 'no-referrer';
    img.classList.add('ctb-brand-logo', `ctb-logo-${carrier.toLowerCase()}`);

    const airlineId = img.closest('.airline-id');
    const logoWrap = img.closest('.airline-logo-wrap');
    const summaryBrand = img.closest('.summary-brand');
    if (airlineId) airlineId.classList.add(`ctb-brand-${carrier.toLowerCase()}`);
    if (logoWrap) logoWrap.classList.add(`ctb-wrap-${carrier.toLowerCase()}`);
    if (summaryBrand) summaryBrand.classList.add(`ctb-summary-${carrier.toLowerCase()}`);
  }

  function repairImage(img) {
    const carrier = carrierFromContext(img);
    if (!carrier) return;
    const brand = BRANDS[carrier];
    const fallback = ensureFallback(img, carrier);
    setBrandLayout(img, carrier);

    const primary = carrier === 'B2' ? new URL(brand.logo, location.origin).href : brand.logo;
    const secondary = brand.fallbackLogo;

    // Never keep the old hand-built Air China SVG.
    if (carrier === 'CA' && img.src.includes('/assets/logos/air-china.svg')) {
      img.dataset.ctbLogoStage = 'primary';
      img.classList.remove('ctb-dark-logo');
      img.src = primary;
    } else if (!img.dataset.ctbLogoStage) {
      img.dataset.ctbLogoStage = 'primary';
      img.classList.remove('ctb-dark-logo');
      if (img.src !== primary) img.src = primary;
    }

    img.onload = () => {
      img.hidden = false;
      img.style.display = '';
      fallback.hidden = true;
    };

    img.onerror = () => {
      if (carrier === 'CA' && secondary && img.dataset.ctbLogoStage !== 'official-fallback') {
        img.dataset.ctbLogoStage = 'official-fallback';
        img.classList.add('ctb-dark-logo');
        img.src = secondary;
        return;
      }
      img.hidden = true;
      img.style.display = 'none';
      fallback.hidden = false;
    };
  }

  function repair(root = document) {
    root.querySelectorAll?.('.summary-brand img, .airline-logo').forEach(repairImage);
  }

  function updateVersion() {
    document.title = `CTB Flights · 白俄留学生机票比价 · v${VERSION}`;
    document.querySelectorAll('.version').forEach(el => { el.textContent = `v${VERSION}`; });
    document.querySelectorAll('footer span').forEach(el => {
      const text = el.textContent || '';
      if (/版本\s*v?1\.0\.\d+/.test(text)) {
        el.textContent = text.replace(/版本\s*v?1\.0\.\d+/, `版本 v${VERSION}`);
      }
    });
  }

  let queued = false;
  const scheduleRepair = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      repair(document);
      updateVersion();
    });
  };

  new MutationObserver(scheduleRepair).observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['src']
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scheduleRepair, { once: true });
  } else {
    scheduleRepair();
  }
})();
