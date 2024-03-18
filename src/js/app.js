import { init as initChartPrice } from './modules/chart-price.js';
import { init as initDataStatistics } from './modules/fetchStatistics.js';
import { init as initChartRadar } from './modules/chart-radar.js';

const unmountClb = [];

$(() => {
  unmountClb.push(initChartRadar());
  unmountClb.push(initChartPrice());
  unmountClb.push(initDataStatistics());
});

window.addEventListener('beforeunload', () => {
  unmountClb.forEach((clb) => clb());
});
