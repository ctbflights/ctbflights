(() => {
  'use strict';

  const AIR_CHINA_LOGO = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAUAAAABlCAMAAAALWMqpAAADAFBMVEUAAADcIy0KEBgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAiLjRFAAAA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';

  const AIRLINES = {
    CA: {
      code: 'CA',
      name: '中国国际航空股份有限公司',
      short: '中国国际航空',
      english: 'Air China Limited',
      logo: AIR_CHINA_LOGO,
      official: 'https://www.airchina.com.cn/zh-CN',
      baggage: '请以当前票价档及中国国际航空官网为准。'
    },
    B2: {
      code: 'B2',
      name: '白俄罗斯航空公司',
      short: '白俄罗斯航空',
      english: 'Belavia Belarusian Airlines',
      logo: '/assets/logos/belavia.svg',
      official: 'https://tickets.belavia.by/websky/search',
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
