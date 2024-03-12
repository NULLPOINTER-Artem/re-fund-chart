/**
 * Chart.js have bundle optimization, auto - this is not optimization (we import all of Chart.js)
 */
import Chart, { Tooltip } from 'chart.js/auto';
import { format } from 'date-fns';
import zoomPlugin from 'chartjs-plugin-zoom';
import 'chartjs-adapter-date-fns';

Chart.register(zoomPlugin);

// TODO: (*****) Pan x & y axis for manipulate with step-size
/*
  https://www.youtube.com/watch?v=5SxDxAUPIMk&list=PLc1g3vwxhg1UlBvTOSZ3VJUjC_s6S2cMD&index=30
  We can create smth similar to this bottom-bar in this video but using mouse drag instead grab-time action
  The coin-market use several charts at once for it, I no know, how to do it, I have to find my own solution
*/
// TODO: (***) (Equal) -> find intersection points for fill them by correct gradient color
// TODO: (****) Increase performance on mobile

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

// Y-axis element for mouse-drag manipulation with step size
let yAxisEl = null;
// event handlers
let yMouseDownClb = null;
let yMouseUpClb = null;
let yMouseMoveClb = null;

// X-axis element for mouse-drag manipulation with step size
let xAxisEl = null;
// event handlers
let xMouseDownClb = null;
let xMouseUpClb = null;
let xMouseMoveClb = null;

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

  const XextraSpace = 0.05;
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
          suggestedMin: Xmin,
          suggestedMax: Xmax,
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
              size: 14,
              weight: 'bold',
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
          suggestedMin: Ymin,
          suggestedMax: Ymax,
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
                Number(val).toFixed(8)
                  .toLowerCase()
                  .split('').join('\u200A'.repeat(1))
                : null
            ),
            display: true,
            mirror: true,
            backdropColor: '#000',
            labelOffset: -11,
            backdropPadding: 0,
            padding: 0,
            color: '#fff',
            z: 2,
            font: {
              // family: '',
              size: 14,
              weight: 'bold',
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
              if (zoomLevel >= MAX_ZOOM_LEVEL) context.chart.zoom(0.8);
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
              const priceFormatted = `$${Number(price).toFixed(8).replace('.', '\u200A,\u200A')}`.toLowerCase().split('').join('\u200A'.repeat(1));

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

  // Custom tooltip position
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

  // Setup mouse-drag Y-axis board
  let previousClientY = 0;
  const YAddSpace = 0.02;

  if (yAxisEl) {
    yMouseDownClb = (event) => {
      previousClientY = event.changedTouches ? event.changedTouches[0].clientY : event.clientY;

      // init move event
      document.addEventListener('mousemove', yMouseMoveClb);
      document.addEventListener('touchmove', yMouseMoveClb);
    };

    yMouseUpClb = () => {
      // remove move event
      document.removeEventListener('mousemove', yMouseMoveClb);
      document.removeEventListener('touchmove', yMouseMoveClb);
    };

    yMouseMoveClb = (event) => {
      const { clientY } = event.changedTouches ? event.changedTouches[0] : event;
      const scaleMinY = +chartInstance.options.scales.y.min;
      const scaleMaxY = +chartInstance.options.scales.y.max;
      const yAddZoomSpace = (scaleMaxY - scaleMinY) * YAddSpace;

      if (clientY < previousClientY) {
        // Increase period of Y-axis (min/max)    
        chartInstance.options.scales.y.min = scaleMinY + yAddZoomSpace;
        chartInstance.options.scales.y.max = scaleMaxY - yAddZoomSpace;
      } else if (
        clientY > previousClientY && (
          scaleMinY > 0 &&
          scaleMaxY > 0
        )
      ) {
        // Decrease period of Y-axis (min/max)
        chartInstance.options.scales.y.min = scaleMinY - yAddZoomSpace;
        chartInstance.options.scales.y.max = scaleMaxY + yAddZoomSpace;
      }

      previousClientY = clientY;
      chartInstance.update('none');
    };

    yAxisEl.addEventListener('mousedown', yMouseDownClb);
    yAxisEl.addEventListener('touchstart', yMouseDownClb);
    document.addEventListener('mouseup', yMouseUpClb);
    document.addEventListener('touchend', yMouseUpClb);
  }

  // Setup mouse-drag Y-axis board
  let previousClientX = 0;
  const XAddSpace = 0.01;

  if (xAxisEl) {
    xMouseDownClb = (event) => {
      previousClientX = event.changedTouches ? event.changedTouches[0].clientX : event.clientX;

      // init move event
      document.addEventListener('mousemove', xMouseMoveClb);
      document.addEventListener('touchmove', xMouseMoveClb);
    };

    xMouseUpClb = () => {
      // remove move event
      document.removeEventListener('mousemove', xMouseMoveClb);
      document.removeEventListener('touchmove', xMouseMoveClb);
    };

    xMouseMoveClb = (event) => {
      const { clientX } = event.changedTouches ? event.changedTouches[0] : event;
      const { min: scaleMinX, max: scaleMaxX } = chartInstance.options.scales.x;
      const xAddZoomSpace = (scaleMaxX - scaleMinX) * XAddSpace;

      if (clientX < previousClientX) {
        // Increase period of X-axis (min/max)    
        chartInstance.options.scales.x.min = scaleMinX + xAddZoomSpace;
        chartInstance.options.scales.x.max = scaleMaxX - xAddZoomSpace;
      } else if (
        clientX > previousClientX && (
          scaleMinX > 0 &&
          scaleMaxX > 0
        )
      ) {
        // Decrease period of X-axis (min/max)
        chartInstance.options.scales.x.min = scaleMinX - xAddZoomSpace;
        chartInstance.options.scales.x.max = scaleMaxX + xAddZoomSpace;
      }

      previousClientX = clientX;
      chartInstance.update('none');
    };

    xAxisEl.addEventListener('mousedown', xMouseDownClb);
    xAxisEl.addEventListener('touchstart', xMouseDownClb);
    document.addEventListener('mouseup', xMouseUpClb);
    document.addEventListener('touchend', xMouseUpClb);
  }
};

export const init = async () => {
  chartWrapperEl = document.querySelector('.chart__wrapper');
  noDataEl = document.querySelector('.chart__empty-text');
  loader = document.querySelector('.chart__loader');

  // toolbar - time frames
  actionBarChart = document.querySelector('.chart__action-bar');
  const btnDay = document.querySelector('.chart__btn-day');

  // X/Y-axis boards
  yAxisEl = document.querySelector('.chart__y-axis');
  xAxisEl = document.querySelector('.chart__x-axis');

  if (actionBarChart) actionBarChart.addEventListener('click', handleActionBar);

  // default time frame == 'day'
  btnDay.dispatchEvent(new Event('click', {
    bubbles: true,
    cancelable: true,
  }));

  return () => {
    chartDestroy();

    if (yAxisEl) {
      yAxisEl.addEventListener('mousedown', yMouseDownClb);
      yAxisEl.addEventListener('touchstart', yMouseDownClb);
      document.addEventListener('mouseup', yMouseUpClb);
      document.addEventListener('touchend', yMouseUpClb);
      if (yMouseUpClb) yMouseUpClb(); // remove mouse/touch-move event listener
    }

    if (xAxisEl) {
      xAxisEl.addEventListener('mousedown', xMouseDownClb);
      xAxisEl.addEventListener('touchstart', xMouseDownClb);
      document.addEventListener('mouseup', xMouseUpClb);
      document.addEventListener('touchend', xMouseUpClb);
      if (xMouseUpClb) xMouseUpClb(); // remove mouse/touch-move event listener
    }
  };
};
