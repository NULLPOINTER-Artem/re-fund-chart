import { init as initChartPrice } from './modules/chart-price.js';

const unmountClb = [];

$(() => {
  unmountClb.push(initChartPrice());
});

window.addEventListener('beforeunload', () => {
  unmountClb.forEach((clb) => clb());
});
