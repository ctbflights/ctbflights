(() => {
  'use strict';

  const VERSION = '1.0.25';
  const BRANDS = {
    CA: {
      name: '中国国际航空股份有限公司',
      short: '中国国际航空',
      logo: '/assets/logos/air-china-black.png'
    },
    B2: {
      name: '白俄罗斯航空公司',
      short: '白俄罗斯航空',
      logo: '/assets/logos/belavia.svg'
    }
  };

  function carrierFromContext(el) {
    const card = el.closest('.flight-card, .leg-block') || el.parentElement;
    const text = card?.textContent || '';
    if (/\bCA\d{3,4}\b/.test(text) || text.includes('中国国际航空')) return 'CA';
    if (/\bB2[-\s]?\d{3,4}\b/.test(text) || text.includes('白俄罗斯航空')) return 'B2';
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

  function repairDetailLogo(img) {
    const carrier = carrierFromContext(img);
    if (!carrier) return;
    const brand = BRANDS[carrier];
    const fallback = ensureFallback(img, carrier);

    img.dataset.ctbCarrier = carrier;
    img.alt = `${brand.name} Logo`;
    img.referrerPolicy = 'no-referrer';
    img.classList.add('ctb-brand-logo', `ctb-logo-${carrier.toLowerCase()}`);

    const expected = new URL(brand.logo, location.origin).href;
    if (img.src !== expected) img.src = brand.logo;

    img.onload = () => {
      img.hidden = false;
      img.style.display = '';
      fallback.hidden = true;
    };
    img.onerror = () => {
      img.hidden = true;
      img.style.display = 'none';
      fallback.hidden = false;
    };

    // The Air China mark already contains AIR CHINA + Chinese calligraphy,
    // so do not print a second company-name block beside it.
    const airlineText = img.closest('.airline-id')?.querySelector('.airline-text');
    if (airlineText) airlineText.classList.toggle('brand-text-hidden', carrier === 'CA');
  }

  function repairSummary(card) {
    const route = card.querySelector('.summary-route');
    if (!route) return;

    const oldBrand = route.querySelector('.summary-brand');
    const pill = oldBrand?.querySelector('.type-pill') || route.querySelector('.type-pill');
    const title = route.querySelector('h4');
    if (!title) return;

    oldBrand?.querySelectorAll('img').forEach(img => img.remove());

    let line = route.querySelector('.route-title-line');
    if (!line) {
      line = document.createElement('div');
      line.className = 'route-title-line';
      title.insertAdjacentElement('beforebegin', line);
      line.appendChild(title);
    }
    if (pill && pill.parentElement !== line) line.appendChild(pill);
    if (oldBrand && oldBrand !== line) oldBrand.remove();
  }

  function repair(root = document) {
    root.querySelectorAll?.('.flight-card').forEach(repairSummary);
    root.querySelectorAll?.('.airline-logo').forEach(repairDetailLogo);
  }

  function updateVersion() {
    document.title = `CTB Flights · 白俄留学生机票比价 · v${VERSION}`;
    document.querySelectorAll('.version').forEach(el => { el.textContent = `v${VERSION}`; });
    document.querySelectorAll('footer span').forEach(el => {
      if (/版本\s*v?1\.0\.\d+/.test(el.textContent || '')) {
        el.textContent = (el.textContent || '').replace(/版本\s*v?1\.0\.\d+/, `版本 v${VERSION}`);
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
