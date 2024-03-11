/**
 * Chart.js have bundle optimization, auto - this is not optimization (we import all of Chart.js)
 */
import Chart, { Tooltip } from 'chart.js/auto';
import { format } from 'date-fns';
import zoomPlugin from 'chartjs-plugin-zoom';
import 'chartjs-adapter-date-fns';

Chart.register(zoomPlugin);

const BACKEND_ENDPOINT = 'https://rfd-backend.vercel.app';
const MAX_ZOOM_LEVEL = 10;

// Styles
const CSS_CLASS_ACTIVE = 'active';
const GREEN_COLOR_RGBA = 'rgba(47, 236, 47, 1)';
const RED_COLOR_RGBA = 'rgba(255, 0, 0, 1)';
const GRAY_COLOR_RGBA = 'rgba(64, 64, 64, 1)';
const changeAlphaColor = (color, alpha) => {
  if (typeof color !== 'string' || color.includes('#')) return color;

  const colorAlpha = color.split(',');

  if (colorAlpha.length === 4) colorAlpha[colorAlpha.length - 1] = ` ${alpha})`;
  else {
    const [lastColorCode] = colorAlpha[colorAlpha.length - 1].trim().split(')');
    colorAlpha[colorAlpha.length - 1] = ` ${lastColorCode}`;
    colorAlpha.push(` ${alpha})`);
  }

  return colorAlpha.join(',');
};

let targetValue = 0;
const setTargetValue = (data) => {
  if (data && data.length) targetValue = Number(data[0].y);
};
let actionBarChart = null;
let chartWrapperEl = null;
let noDataEl = null;
let loader = null;
let chartInstance = null;
let selectedTimeFrame = '';
const displayTimeFormats = {
  month: 'MMM yyyy',
  week: 'dd MMM',
  day: 'd',
  hour: "h\u200A:\u200Amm aaaaa'm'",
  minute: "h\u200A:\u200Amm aaaaa'm'",
  second: "h\u200A:\u200Amm\u200A:\u200Ass aaaaa'm'",
};
/*
  Type FetchedData = {
    x: Date | string,
    y: number | string
  }
*/
let fetchedData = [];
const resetFetchedData = () => fetchedData.splice(0, fetchedData.length);

// FETCH DATA HANDLERS

const handlerNoData = () => {
  if (noDataEl) {
    if (chartWrapperEl) chartWrapperEl.classList.remove(CSS_CLASS_ACTIVE);
    if (loader) loader.classList.remove(CSS_CLASS_ACTIVE);
    noDataEl.classList.add(CSS_CLASS_ACTIVE);

    if (actionBarChart && actionBarChart.classList.contains('disabled')) {
      actionBarChart.classList.remove('disabled');
    }
  }
};

const handlerLoading = (show = true) => {
  if (loader) {
    if (chartWrapperEl) chartWrapperEl.classList.remove(CSS_CLASS_ACTIVE);
    if (noDataEl) noDataEl.classList.remove(CSS_CLASS_ACTIVE);

    if (show) {
      actionBarChart.classList.add('disabled');
      loader.classList.add(CSS_CLASS_ACTIVE);
    }
    else {
      actionBarChart.classList.remove('disabled');
      loader.classList.remove(CSS_CLASS_ACTIVE);
    }
  }
};

const handlerChart = () => {
  if (chartWrapperEl) {
    if (noDataEl) noDataEl.classList.remove(CSS_CLASS_ACTIVE);
    if (loader) loader.classList.remove(CSS_CLASS_ACTIVE);
    chartWrapperEl.classList.add(CSS_CLASS_ACTIVE);
  }
};

// format = 'day' | 'week' | 'month'
//* mb output all in time without date, just expend time period (day | week | month)
const transformDataInChartData = (response = []) => {
  if (!response.length) {
    handlerNoData();
    return;
  }

  resetFetchedData();

  fetchedData = response.map((item) => ({
    x: Date.parse(item.date),
    y: +item.price.toFixed(8)
  }));

  setTargetValue(fetchedData);
  handlerChart();
};
const fetchChartData = async (days = 1) => {
  handlerLoading();
  let response = null;

  try {
    response = await fetch(`${BACKEND_ENDPOINT}/getChartData/${days}`);
    response = await response.json();

    if (response.error) throw new Error(response.error || 'Error while fetching chart price data');

    handlerLoading(false);
    return response;
  } catch (err) {
    console.error(`FETCH-CHART-PRICE ${err}`);
    handlerNoData();
  }

  return [];
};

// TIME FRAME HANDLERS

// month NO 0-index bases (use 1-12)
const getDaysInMonth = (month, year) => {
  const lastDayOfMonth = new Date(year, month, 0);
  return lastDayOfMonth.getDate();
};
// format = 'day' | 'week' | 'month'
const handleTimeFrameSelect = async (formatTimeFrame = 'day') => {
  const map = {
    [formatTimeFrame === 'day']: () => 1,
    [formatTimeFrame === 'week']: () => 7,
    [formatTimeFrame === 'month']: () => {
      const currentDate = new Date();
      return getDaysInMonth(currentDate.getMonth() + 1, currentDate.getFullYear())
    },
  };

  const response = await fetchChartData((map.true && map.true()) || 1);
  transformDataInChartData(response);
};

async function handleActionBar(event) {
  if (event.target.dataset.action === selectedTimeFrame) return;

  // set selected time frame
  selectedTimeFrame = event.target.dataset.action;
  const allActionBtn = [].slice.call(this.querySelectorAll('button[data-type=action]'));

  allActionBtn.forEach((actionBtn) => {
    if (actionBtn.dataset.action === selectedTimeFrame) actionBtn.classList.add(CSS_CLASS_ACTIVE);
    else actionBtn.classList.remove(CSS_CLASS_ACTIVE);
  });

  // fetch data
  await handleTimeFrameSelect(selectedTimeFrame);

  // update the chart
  if (chartInstance) {
    // eslint-disable-next-line no-use-before-define
    chartDestroy();
    // eslint-disable-next-line no-use-before-define
    chartCreate();
  } else {
    // eslint-disable-next-line no-use-before-define
    chartCreate();
  }
}

// Chart Helpers

function chartDestroy() {
  chartInstance.destroy();
};

const borderGradient = (ctx, chartArea, data, scales) => {
  const theData = data.datasets[0].data;
  if (!theData.length) return null;

  const {
    left, right,
    top, bottom,
    width, height
  } = chartArea;
  const { x, y } = scales;
  const gradientBorder = ctx.createLinearGradient(0, 0, 0, bottom);

  let shift = y.getPixelForValue(theData[0].y) / bottom;
  if (shift > 1) shift = 1;
  else if (shift < 0) shift = 0;

  gradientBorder.addColorStop(0, GREEN_COLOR_RGBA);
  gradientBorder.addColorStop(shift, GREEN_COLOR_RGBA);
  gradientBorder.addColorStop(shift, RED_COLOR_RGBA);
  gradientBorder.addColorStop(1, RED_COLOR_RGBA);

  return gradientBorder;
};
const belowGradient = (ctx, chartArea, data, scales) => {
  const theData = data.datasets[0].data;
  if (!theData.length) return null;

  const {
    left, right,
    top, bottom,
    width, height
  } = chartArea;
  const { x, y } = scales;
  const gradientBackground = ctx.createLinearGradient(
    0, y.getPixelForValue(theData[0].y),
    0, bottom
  );

  gradientBackground.addColorStop(0, changeAlphaColor(RED_COLOR_RGBA, 0));
  gradientBackground.addColorStop(1, changeAlphaColor(RED_COLOR_RGBA, 0.25));

  return gradientBackground;
};
const aboveGradient = (ctx, chartArea, data, scales) => {
  const theData = data.datasets[0].data;
  if (!theData.length) return null;

  const {
    left, right,
    top, bottom,
    width, height
  } = chartArea;
  const { x, y } = scales;
  const gradientBackground = ctx.createLinearGradient(
    0, y.getPixelForValue(theData[0].y),
    0, top
  );

  gradientBackground.addColorStop(0, changeAlphaColor(GREEN_COLOR_RGBA, 0));
  gradientBackground.addColorStop(1, changeAlphaColor(GREEN_COLOR_RGBA, 0.25));

  return gradientBackground;
};

function chartCreate() {
  const contextChart = chartWrapperEl.querySelector('#chart-price').getContext('2d');
  let previousTooltipBorderColor = '';
  let previousPointBackgroundColor = '';

  const data = {
    datasets: [{
      data: fetchedData,
      borderColor(context) {
        const { chart } = context;
        const {
          ctx,
          chartArea,
          data: ctxData,
          scales
        } = chart;

        // case of chart initialization
        if (!chartArea) return null;

        return borderGradient(ctx, chartArea, ctxData, scales);
      },
      borderWidth: 2,
      fill: {
        target: {
          value: targetValue,
        },
        below(context) {
          const { chart } = context;
          const {
            ctx,
            chartArea,
            data: ctxData,
            scales
          } = chart;

          // case of chart initialization
          if (!chartArea) return null;

          return belowGradient(ctx, chartArea, ctxData, scales);
        },
        above(context) {
          const { chart } = context;
          const {
            ctx,
            chartArea,
            data: ctxData,
            scales
          } = chart;

          // case of chart initialization
          if (!chartArea) return null;

          return aboveGradient(ctx, chartArea, ctxData, scales);
        },
      },
    }],
  };

  const XextraSpace = 0.01;
  const YextraSpace = 0.2;
  const Xmin = Math.min(...fetchedData.map((item) => item.x));
  const Xmax = Math.max(...fetchedData.map((item) => item.x));
  const Ymin = Math.min(...fetchedData.map((item) => item.y));
  const Ymax = Math.max(...fetchedData.map((item) => item.y));

  const xExtraZoomSpace = (Xmax - Xmin) * XextraSpace;
  const yExtraZoomSpace = (Ymax - Ymin) * YextraSpace;

  chartInstance = new Chart(contextChart, {
    type: 'line',
    data,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      aspectRatio: 1,
      spanGaps: true,
      animations: false,
      layout: {
        autoPadding: true
      },
      interaction: {
        intersect: false,
        mode: 'index',
      },
      elements: {
        point: {
          radius: 0,
          hoverBorderWidth: 2,
          hoverRadius: 5,
          hoverBackgroundColor: (ctx) => {
            const { dataIndex } = ctx;
            const valuePoint = +data.datasets[0].data[dataIndex].y;

            if (valuePoint > targetValue) previousPointBackgroundColor = changeAlphaColor(GREEN_COLOR_RGBA, 0.5);
            if (valuePoint < targetValue) previousPointBackgroundColor = changeAlphaColor(RED_COLOR_RGBA, 0.5);

            return previousPointBackgroundColor;
          },
        },
      },
      scales: {
        x: {
          type: 'time',
          position: 'bottom',
          min: Xmin,
          max: Xmax,
          grid: {
            display: false,
          },
          border: {
            display: false
          },
          ticks: {
            autoSkip: true,
            autoSkipPadding: 50,
            maxRotation: 0,
            backdropPadding: 0,
            color: '#fff',
            font: {
              // family: '',
              size: 12,
              weight: 'normal',
              style: 'normal',
            },
            major: {
              enabled: true,
            },
            padding: 10,
            showLabelBackdrop: false,
          },
          time: {
            minUnit: 'minute',
            displayFormats: displayTimeFormats,
          },
        },
        y: {
          position: 'left',
          min: Ymin,
          max: Ymax,
          grid: {
            color: GRAY_COLOR_RGBA,
            lineWidth: 1,
          },
          border: {
            display: false,
            width: 0,
          },
          ticks: {
            callback: (val, i, ticks) => (
              i < ticks.length - 1 ?
                String(Number(val).toPrecision(3))
                  .toLowerCase()
                  .split('').join('\u200A'.repeat(1))
                : null
            ),
            display: true,
            mirror: true,
            labelOffset: -11,
            backdropPadding: 0,
            padding: 0,
            color: '#fff',
            font: {
              // family: '',
              size: 12,
              color: '#fff',
              weight: 'normal',
              style: 'normal',
            },
          },
        }
      },
      plugins: {
        zoom: {
          limits: {
            x: {
              min: Xmin - xExtraZoomSpace,
              max: Xmax + xExtraZoomSpace,
            },
            y: {
              min: Ymin - yExtraZoomSpace,
              max: Ymax + yExtraZoomSpace,
            },
          },
          pan: {
            enabled: true,
            mode: 'xy',
            scaleMode: 'x',
          },
          zoom: {
            mode: 'x',
            scaleMode: 'x',
            pinch: {
              enabled: true,
            },
            wheel: {
              enabled: true,
              speed: 0.05,
            },
            onZoom(context) {
              const zoomLevel = context.chart.getZoomLevel();
              if (zoomLevel >= MAX_ZOOM_LEVEL) context.chart.zoom(0.99);
            },
          },
        },
        legend: {
          display: false
        },
        tooltip: {
          enabled: true,
          animations: false,
          displayColors: false,
          callbacks: {
            label: () => null,
            title: (chart) => {
              const { raw: { x: date, y: price } } = chart[0];
              const dateFormatted = format(date, 'MMM d yyyy').toLowerCase().split('').join('\u200A'.repeat(1));
              const timeFormatted = format(date, "h\u200A:\u200Amm aaaaa'm'").toLowerCase().split('').join('\u200A'.repeat(1));
              const priceFormatted = `$${String(price).replace('.', '\u200A,\u200A')}`.toLowerCase().split('').join('\u200A'.repeat(1));

              return `${dateFormatted}\n${timeFormatted}\n${priceFormatted}`;
            },
          },
          bodyAlign: 'center',
          titleAlign: 'left',
          titleMarginBottom: -0.5,
          titleFont: {
            size: 12,
            weight: 'bold',
            style: 'normal',
          },
          borderColor: (ctx) => {
            const dataPoint = ctx.tooltip.dataPoints[0].dataIndex;
            const dataset = ctx.tooltip.dataPoints[0].datasetIndex;
            const valuePoint = +ctx.tooltip.chart.data.datasets[dataset].data[dataPoint].y;

            if (valuePoint > targetValue) previousTooltipBorderColor = GREEN_COLOR_RGBA;
            if (valuePoint < targetValue) previousTooltipBorderColor = RED_COLOR_RGBA;

            return previousTooltipBorderColor;
          },
          borderWidth: 1,
          backgroundColor: '#000',
          padding: 7,
          position: 'customTooltipPosition',
        },
      }
    },
  });

  Tooltip.positioners.customTooltipPosition = (items) => {
    const position = Tooltip.positioners.average(items);
    const positionOffsetY = 10;

    if (!position) return false;

    return {
      x: position.x,
      y: position.y - positionOffsetY,
      xAlign: 'center',
      yAlign: 'bottom'
    }
  };
};

export const init = async () => {
  chartWrapperEl = document.querySelector('.chart__wrapper');
  noDataEl = document.querySelector('.chart__empty-text');
  loader = document.querySelector('.chart__loader');
  actionBarChart = document.querySelector('.chart__action-bar');
  const btnDay = document.querySelector('.chart__btn-day');

  if (actionBarChart) actionBarChart.addEventListener('click', handleActionBar);

  // default time frame == 'day'
  btnDay.dispatchEvent(new Event('click', {
    bubbles: true,
    cancelable: true,
  }));

  return () => {
    chartDestroy();
  };
};
