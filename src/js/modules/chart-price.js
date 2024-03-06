/**
 * Chart.js have bundle optimization, auto - this is not optimization (we import all of Chart.js)
 */
import Chart, { Tooltip } from 'chart.js/auto';
import { format } from 'date-fns';
import zoomPlugin from 'chartjs-plugin-zoom';
import 'chartjs-adapter-date-fns';

Chart.register(zoomPlugin);

const BACKEND_ENDPOINT = 'https://rfd-backend.vercel.app';

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
    if (chartWrapperEl) chartWrapperEl.classList.remove('active');
    if (loader) loader.classList.remove('active');
    noDataEl.classList.add('active');

    if (actionBarChart && actionBarChart.classList.contains('disabled')) {
      actionBarChart.classList.remove('disabled');
    }
  }
};

const handlerLoading = (show = true) => {
  if (loader) {
    if (chartWrapperEl) chartWrapperEl.classList.remove('active');
    if (noDataEl) noDataEl.classList.remove('active');

    if (show) {
      actionBarChart.classList.add('disabled');
      loader.classList.add('active');
    }
    else {
      actionBarChart.classList.remove('disabled');
      loader.classList.remove('active');
    }
  }
};

const handlerChart = () => {
  if (chartWrapperEl) {
    if (noDataEl) noDataEl.classList.remove('active');
    if (loader) loader.classList.remove('active');
    chartWrapperEl.classList.add('active');
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
    x: item.date,
    y: item.price.toFixed(8)
  }));

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
    if (actionBtn.dataset.action === selectedTimeFrame) actionBtn.classList.add('active');
    else actionBtn.classList.remove('active');
  });

  // fetch data
  await handleTimeFrameSelect(selectedTimeFrame);

  // update the chart
  if (chartInstance) {
    // eslint-disable-next-line no-use-before-define
    chartDestroy();
    // eslint-disable-next-line no-use-before-define
    chartCreate();
  }
}

// Chart Helpers

// eslint-disable-next-line no-nested-ternary
const upVal = (ctx, color, gradient = false) => ctx.p0.parsed.y < ctx.p1.parsed.y ? (
  gradient ? (() => {
    const grd = ctx.chart.ctx.createLinearGradient(0, 0, 0, ctx.chart.height - (ctx.chart.height * 0.05));
    grd.addColorStop(0.5, color);
    grd.addColorStop(1, '#2fec2f00');
    return grd;
  })() : color
) : undefined;
// eslint-disable-next-line no-nested-ternary
const downVal = (ctx, color, gradient = false) => ctx.p0.parsed.y > ctx.p1.parsed.y ? (
  gradient ? (() => {
    const grd = ctx.chart.ctx.createLinearGradient(0, 0, 0, ctx.chart.height - (ctx.chart.height * 0.05));
    grd.addColorStop(0.5, color);
    grd.addColorStop(1, '#ff000000');
    return grd;
  })() : color
) : undefined;

function chartDestroy() {
  chartInstance.destroy();
};

function chartCreate() {
  const contextChart = chartWrapperEl.querySelector('#chart-price').getContext('2d');

  const data = {
    datasets: [{
      data: fetchedData,
      borderColor: [],
      borderWidth: 2,
      //* MB set target value for draw red/green line on the chart? (for example yesterday latest price)
      //* You can use context.chart.chartArea.(top/left/bottom/right) for x & y gradient point (start/end) colors
      fill: true,
      segment: {
        borderColor: ctx => upVal(ctx, '#2fec2f') || downVal(ctx, '#ff0000'),
        backgroundColor: ctx => upVal(ctx, '#2fec2f40', true) || downVal(ctx, '#ff000040', true),
      },
    }],
  };

  // Setup up & down point colors
  const dataSet = data.datasets[0];
  for (let i = 1; i < dataSet.data.length; i++) {
    if (dataSet.data[i].y > dataSet.data[i - 1].y) {
      dataSet.borderColor.push('#2FEC2F');
    } else {
      dataSet.borderColor.push('#FF0000');
    }
  }

  chartInstance = new Chart(contextChart, {
    type: 'line',
    data,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      aspectRatio: 1,
      spanGaps: true,
      animations: false,
      interaction: {
        intersect: false,
        mode: 'index',
      },
      elements: {
        point: {
          radius: 0,
          hoverBackgroundColor: (ctx) => {
            const { dataIndex } = ctx;
            return data.datasets[0].borderColor[dataIndex];
          },
        },
      },
      scales: {
        x: {
          type: 'time',
          position: 'bottom',
          grid: {
            display: false
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
            displayFormats: displayTimeFormats,
          },
        },
        y: {
          position: 'left',
          grid: {
            color: '#ffffff1a',
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
          pan: {
            enabled: true,
            mode: 'xy',
          },
          zoom: {
            mode: 'xy',
            pinch: {
              enabled: true,
            },
            wheel: {
              enabled: true,
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
              const priceFormatted = `$${price.replace('.', '\u200A,\u200A')}`.toLowerCase().split('').join('\u200A'.repeat(1));

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
          // yAlign: 'bottom',
          // xAlign: 'center',
          borderColor: (ctx) => {
            const dataPoint = ctx.tooltip.dataPoints[0].dataIndex;
            const dataset = ctx.tooltip.dataPoints[0].datasetIndex;

            return ctx.tooltip.chart.data.datasets[dataset].borderColor[dataPoint];
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
    const positionOffsetY = 5;

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
    cancelable: true
  }));

  chartCreate();

  return () => {
    chartDestroy();
  };
};
