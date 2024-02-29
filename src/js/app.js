import $ from 'jquery';
import { supportsWebp } from "./modules/functions.js";
import { init as initChartPrice } from './modules/chart-price.js';

$(() => {
  supportsWebp();
  initChartPrice();
});
