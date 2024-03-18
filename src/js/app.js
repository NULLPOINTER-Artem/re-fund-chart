import $ from 'jquery';
import { init as initChartPrice } from './modules/chart-price.js';
import { init as initDataStatistics } from './modules/fetchStatistics.js';

const unmountClb = [];

$(() => {
  unmountClb.push(initChartPrice());
  unmountClb.push(initDataStatistics());
});

window.addEventListener('beforeunload', () => {
  unmountClb.forEach((clb) => clb());
});
