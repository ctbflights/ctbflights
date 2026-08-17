(() => {
  'use strict';

  const AIRLINES = {
    CA: {
      code: 'CA',
      name: '中国国际航空股份有限公司',
      short: '中国国际航空',
      english: 'Air China Limited',
      logo: '/assets/logos/air-china-black.svg',
      official: 'https://www.airchina.com.cn/zh-CN',
      baggage: '请以当前票价档及中国国际航空官网为准。'
    },
    B2: {
      code: 'B2',
      name: '白俄罗斯航空公司',
      short: '白俄罗斯航空',
      english: 'Belavia Belarusian Airlines',
      logo: '/assets/logos/belavia.svg',
      official: 'https://en.belavia.by/booking/',
      baggage: '如当前票价档未返回明确行李数据，请以白俄罗斯航空官网为准。'
    }
  };

  const VARIANTS = [
    {
      key: 'PEK_CA721', group: 'PEK', city: '北京', airline: 'CA', direct: true,
      airport: '北京首都国际机场', code: 'PEK',
      toMinsk: { flightNumber: 'CA721', weekdays: [1,4], depart: '13:20', arrive: '17:20', offset: 0, duration: 540, aircraft: 'Airbus A330 / A330-200', terminalFrom: 'T3', terminalTo: '', start: '2026-03-30', end: '2026-10-22' },
      fromMinsk: { flightNumber: 'CA722', weekdays: [1,4], depart: '19:20', arrive: '08:35', offset: 1, duration: 495, aircraft: 'Airbus A330-200', terminalFrom: '', terminalTo: 'T3', start: '2026-03-30', end: '2026-10-22' }
    },
    {
      key: 'PEK_CA813', group: 'PEK', city: '北京', airline: 'CA', direct: false,
      airport: '北京首都国际机场', code: 'PEK',
      via: { city: '西安', code: 'XIY', airport: '西安咸阳国际机场' },
      toMinsk: { flightNumber: 'CA813', weekdays: [6], depart: '09:40', arrive: '18:25', offset: 0, duration: 825, aircraft: 'Airbus A330', terminalFrom: 'T3', terminalTo: '', start: '2026-04-04', end: '2026-10-24' },
      fromMinsk: { flightNumber: 'CA814', weekdays: [6], depart: '20:30', arrive: '14:15', offset: 1, duration: 765, aircraft: 'Airbus A330', terminalFrom: '', terminalTo: 'T3', start: '2026-04-04', end: '2026-10-24' }
    },
    {
      key: 'XIY_CA813', group: 'XIY', city: '西安', airline: 'CA', direct: true,
      airport: '西安咸阳国际机场', code: 'XIY',
      toMinsk: { flightNumber: 'CA813', weekdays: [6], depart: '14:20', arrive: '18:25', offset: 0, duration: 545, aircraft: 'Airbus A330', terminalFrom: 'T5', terminalTo: '', start: '2026-04-04', end: '2026-10-24' },
      fromMinsk: { flightNumber: 'CA814', weekdays: [6], depart: '20:30', arrive: '09:55', offset: 1, duration: 505, aircraft: 'Airbus A330', terminalFrom: '', terminalTo: '', start: '2026-04-04', end: '2026-10-24' }
    },
    {
      key: 'URC_B2', group: 'URC', city: '乌鲁木齐', airline: 'B2', direct: true,
      airport: '乌鲁木齐天山国际机场', code: 'URC',
      toMinsk: { flightNumber: 'B2752', weekdays: [1], depart: '22:50', arrive: '00:10', offset: 1, duration: 380, aircraft: 'Boeing 737 MAX 8', terminalFrom: 'T4', terminalTo: '', start: '2026-01-01', end: '2026-09-28' },
      fromMinsk: { flightNumber: 'B2751', weekdays: [1], depart: '10:40', arrive: '21:30', offset: 0, duration: 350, aircraft: 'Boeing 737 MAX 8', terminalFrom: '', terminalTo: 'T4', start: '2026-01-01', end: '2026-09-28' }
    },
    {
      key: 'SYX_B2', group: 'SYX', city: '三亚', airline: 'B2', direct: true,
      airport: '三亚凤凰国际机场', code: 'SYX',
      toMinsk: { flightNumber: 'B2754', weekdays: [3,6], depart: '23:50', arrive: '06:10', offset: 1, duration: 680, aircraft: 'Airbus A330-200', terminalFrom: '', terminalTo: '', start: '2026-08-02', end: '2026-10-24' },
      fromMinsk: { flightNumber: 'B2753', weekdays: [3,6], depart: '07:00', arrive: '22:20', offset: 0, duration: 620, aircraft: 'Airbus A330-200', terminalFrom: '', terminalTo: '', start: '2026-08-02', end: '2026-10-24' }
    }
  ];

  const CITY_OPTIONS = {
    PEK: { name: '北京', flights: 'CA721 / CA813', note: '直飞 + 经西安' },
    XIY: { name: '西安', flights: 'CA813', note: '直飞' },
    URC: { name: '乌鲁木齐', flights: 'B2752 / B2751', note: '白航' },
    SYX: { name: '三亚', flights: 'B2754 / B2753', note: '白航' }
  };

  window.CTB_DATA = { AIRLINES, VARIANTS, CITY_OPTIONS };
})();
