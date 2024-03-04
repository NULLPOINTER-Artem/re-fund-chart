/**
 * Chart.js have bundle optimization, auto - this is not optimization (we import all of Chart.js)
 */
import Chart from 'chart.js/auto';

const BACKEND_ENDPOINT = 'https://rfd-backend.vercel.app';

// HELPERS Funcs

function convertTimeTo12HourFormat(time24) {
  const [hours, minutes] = time24.split(':').map(Number);
  const dummyDate = new Date(1970, 0, 1, hours, minutes);

  let hours12 = dummyDate.getHours();
  const amPm = hours12 >= 12 ? 'PM' : 'AM';
  hours12 = hours12 % 12 || 12;

  return `${hours12}:${minutes.toString().padStart(2, '0')} ${amPm}`;
};

let actionBarChart = null;
let chartWrapperEl = null;
let noDataEl = null;
let loader = null;
let chartInstance = null;
let selectedTimeFrame = '';
const fetchedData = {
  time: [],
  data: []
};
const resetFetchedData = () => {
  fetchedData.data.splice(0, fetchedData.data.length);
  fetchedData.time.splice(0, fetchedData.time.length);
};

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

  response.forEach((item) => {
    // convert (from UTC) to locale date
    const [date, time] = item.date.split(' ');
    const price = item.price.toFixed(8);

    fetchedData.time.push(convertTimeTo12HourFormat(time));
    fetchedData.data.push(price);
  });

  handlerChart();
};
const fetchChartData = async (days = 1) => {
  handlerLoading();
  resetFetchedData();
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
const handleTimeFrameSelect = async (format = 'day') => {
  const map = {
    [format === 'day']: () => 1,
    [format === 'week']: () => 7,
    [format === 'month']: () => {
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

// MOUSE POINT HANDLERS

const crosshairPoint = (chart, mousemove) => {
  const {
    ctx,
    data,
    chartArea: {
      top, bottom, left, right,
      width, height,
    },
    scales: { x, y },
  } = chart;

  const coorX = mousemove.offsetX;
  const coorY = mousemove.offsetY;

  chart.update('none');
  ctx.restore();

  ctx.beginPath();
  ctx.fillStyle = '#2FEC2F';
  ctx.fillStyle = '#666';
  ctx.lineWidth = 3;
  ctx.setLineDash([]);

  const angle = Math.PI / 180;
  const segments = width / (fetchedData.time.length - 1);
  const index = Math.floor((coorX - left) / segments);
  const yStart = y.getPixelForValue(data.datasets[0].data[index]);
  const yEnd = y.getPixelForValue(data.datasets[0].data[index + 1]);
  const pointPosition = yStart + (
    (yEnd - yStart) /
    (width / segments) *
    (coorX - x.getPixelForValue(data.labels[index]))
  );

  ctx.arc(
    coorX,
    pointPosition,
    5,
    angle * 0,
    angle * 360,
    false
  );
  ctx.fill();
  ctx.stroke();

  // console.log('x._gridLineItems');
  // console.dir(x._gridLineItems);
  // console.log('data.datasets');
  // console.dir(data.datasets);

  // for (let i = 0; i < segments; i++) {
  //   if (coorX >= x._gridLineItems[i].tx1 && coorX <= x._gridLineItems[i + 1].tx1) {
  //     console.log('data.datasets[0].data[i]');
  //     console.dir(data.datasets[0].data[i]);
  //     const yStart = y.getPixelForValue(data.datasets[0].data[i]);
  //     const yEnd = y.getPixelForValue(data.datasets[0].data[i + 1]);

  //     console.log(`height ${height}`);
  //     console.log(`yStart ${yStart}`);
  //     console.log(`yEnd ${yEnd}`);
  //     console.log(`coorY ${coorY}`);
  //     console.log(`coorX ${coorX}`);
  //     console.log(`coorY calc ${yStart + (
  //       (yEnd - yStart) / (width / segments) * (coorX - x._gridLineItems[i].tx1)
  //     )}`);
  //     console.log(`yEnd - yStart ${yEnd - yStart}`);
  //     console.log(`width / segments ${width / segments}`);
  //     console.log(`coorX - x._gridLineItems[i].tx1 ${coorX - x._gridLineItems[i].tx1}`);
  //     console.log(`res ${((yEnd - yStart) / (width / segments)) * (coorX - x._gridLineItems[i].tx1)}`);
  //     console.log(`finish ${yStart + (
  //       (yEnd - yStart) / (width / segments) * (coorX - x._gridLineItems[i].tx1)
  //     )}`);

  //     const pointPosition = yStart + (
  //       (yEnd - yStart) /
  //       (width / segments) *
  //       (coorX - x._gridLineItems[i].tx1)
  //     );

  //     console.log(`RES RES ${(pointPosition - (pointPosition - coorY))}`);

  //     ctx.arc(
  //       coorX,
  //       pointPosition,
  //       5,
  //       angle * 0,
  //       angle * 360,
  //       false
  //     );
  //     ctx.fill();
  //     ctx.stroke();
  //   }
  // }
};

const mousemoveChart = (chart, mousemove) => {
  crosshairPoint(chart, mousemove);
};

function mousemoveChartHandler(mousemove) {
  mousemoveChart(chartInstance, mousemove);
};

// Chart Helpers

// eslint-disable-next-line no-nested-ternary
const upVal = (ctx, color, gradient = false) => ctx.p0.parsed.y < ctx.p1.parsed.y ? (
  gradient ? (() => {
    const grd = ctx.chart.ctx.createLinearGradient(0, ctx.p0.y / 2, 0, 0);
    grd.addColorStop(0, '#2fec2f40');
    grd.addColorStop(1, color);
    return grd;
  })() : color
) : undefined;
// eslint-disable-next-line no-nested-ternary
const downVal = (ctx, color, gradient = false) => ctx.p0.parsed.y > ctx.p1.parsed.y ? (
  gradient ? (() => {
    const grd = ctx.chart.ctx.createLinearGradient(0, ctx.p0.y / 2, 0, 0);
    grd.addColorStop(0, '#ff000040');
    grd.addColorStop(1, color);
    return grd;
  })() : color
) : undefined;

function chartDestroy() {
  chartInstance.canvas.removeEventListener('mousemove', mousemoveChartHandler);
  chartInstance.destroy();
};

function chartCreate() {
  const contextChart = chartWrapperEl.querySelector('#chart-price').getContext('2d');

  const data = {
    labels: fetchedData.time,
    datasets: [{
      data: fetchedData.data.map(Number),
      borderColor: [],
      borderWidth: 3,
      pointRadius: 0,
      pointHitRadius: 0,
      pointHoverRadius: 0,
      //* MB set target value for draw red/green line on the chart? (for example yesterday latest price)
      fill: true,
      segment: {
        borderColor: ctx => upVal(ctx, '#2FEC2F') || downVal(ctx, '#FF0000'),
        backgroundColor: ctx => upVal(ctx, '#2FEC2F', true) || downVal(ctx, '#FF0000', true),
      },
    }],
  };

  // Setup up & down points
  for (let i = 1; i < data.datasets[0].data.length; i++) {
    if (data.datasets[0].data[i] > data.datasets[0].data[i - 1]) {
      data.datasets[0].borderColor.push('#2FEC2F');
    } else {
      data.datasets[0].borderColor.push('#FF0000');
    }
  }

  chartInstance = new Chart(contextChart, {
    type: 'line',
    data,
    // plugins: [
    //   {
    //     id: 'beforeRenderHook',
    //     beforeDraw(chart, args, options) {
    //       if (chart.config.type !== 'line') return;

    //       const { ctx } = chart;
    //       const dataset = chart.config.data.datasets[0]; // Assuming only one dataset

    //       const { data: dataOfSet } = dataset;
    //       const borderColor = [];

    //       for (let i = 0; i < dataOfSet.length - 1; i++) {
    //         if (dataOfSet[i] < dataOfSet[i + 1]) {
    //           borderColor.push('green'); // Set border color to green for uptrend
    //         } else {
    //           borderColor.push('red'); // Set border color to red for downtrend or flat
    //         }
    //       }

    //       dataset.borderColor = borderColor;

    //       chart.update();
    //     },
    //   }
    // ],
    options: {
      scales: {
        x: {
          // type: 'time',
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
            color: '#fff',
            font: {
              // family: '',
              size: 12,
              weight: 'normal',
              style: 'normal',
            }
          },
          // time: {
          //   displayFormats: {
          //     hour: 'HH:mm',
          //     minute: 'HH:mm',
          //     second: 'HH:mm:ss'
          //   }
          // }
        },
        y: {
          grid: {
            color: '#ffffff1a',
            lineWidth: 1,
          },
          border: {
            display: false,
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
            padding: -4,
            color: '#fff',
            font: {
              // family: '',
              size: 12,
              color: '#fff',
              weight: 'normal',
              style: 'normal',
              letterSpacing: 2
            }
          },
        }
      },
      plugins: {
        // zoom: {
        //   limits: {
        //     x: { min: 'original', max: 'original', minRange: 60 * 1000 },
        //   },
        //   pan: {
        //     enabled: true,
        //     mode: 'x',
        //     modifierKey: 'ctrl',
        //     onPanComplete: startFetch
        //   },
        //   zoom: {
        //     wheel: {
        //       enabled: true,
        //     },
        //     drag: {
        //       enabled: true,
        //     },
        //     pinch: {
        //       enabled: true
        //     },
        //     mode: 'x',
        //     onZoomComplete: startFetch
        //   }
        // },
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: (context) => `$${Number(context.parsed.y).toPrecision(3)}`
          }
        },
      }
    },
  });

  chartInstance.canvas.addEventListener('mousemove', mousemoveChartHandler);
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
