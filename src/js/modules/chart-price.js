/**
 * Chart.js have bundle optimization, auto - this is not optimization (we import all of Chart.js)
 */
import Chart from 'chart.js/auto';

const BACKEND_ENDPOINT = 'https://rfd-backend.vercel.app';

function convertTimeTo12HourFormat(time24) {
  const [hours, minutes] = time24.split(':').map(Number);
  const dummyDate = new Date(1970, 0, 1, hours, minutes);

  let hours12 = dummyDate.getHours();
  const amPm = hours12 >= 12 ? 'PM' : 'AM';
  hours12 = hours12 % 12 || 12;

  return `${hours12}:${minutes.toString().padStart(2, '0')} ${amPm}`;
};

const selectedTimeFrame = 'day';
const fetchedData = {
  time: [],
  data: []
};
// format = 'day' | 'week' | 'month'
//* mb output all in time without date, just expend time period (day | week | month)
const transformDataInChartData = (response = []) => {
  response.forEach((item) => {
    // convert (from UTC) to locale date
    const [date, time] = item.date.split(' ');
    const price = item.price.toFixed(8);

    fetchedData.time.push(convertTimeTo12HourFormat(time));
    fetchedData.data.push(price);
  });
};
const fetchChartData = async (days = 1) => {
  let response = null;

  try {
    response = await fetch(`${BACKEND_ENDPOINT}/getChartData/${days}`);

    if (response.status && response.status === 200) {
      return await response.json();
    }

    throw new Error(response.error || 'Error while fetching chart price data');
  } catch (err) {
    console.error(`FETCH-CHART-PRICE ${err}`);
  }

  return [];
};

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

export const init = async () => {
  const contextChart = document.querySelector('#chart-price').getContext('2d');
  const btnMonth = document.querySelector('.chart-month');

  if (btnMonth) {
    btnMonth.addEventListener('click', () => handleTimeFrameSelect('month'));
  }

  // default time frame == 'day'
  await handleTimeFrameSelect(selectedTimeFrame);

  console.log('fetchedData');
  console.dir(fetchedData);

  /**
   * datasets: [{
        data: fetchedData.data.map((item, index) => ({
          x: fetchedData.time[index],
          y: item
        }))
      }]
   */

  // eslint-disable-next-line no-nested-ternary
  const upVal = (ctx, color, gradient = false) => ctx.p0.parsed.y < ctx.p1.parsed.y ? (
    gradient ? (() => {
      const grd = ctx.chart.ctx.createLinearGradient(0, ctx.p0.y, 0, 0);
      grd.addColorStop(0, '#2fec2f40');
      grd.addColorStop(1, color);
      return grd;
    })() : color
  ) : undefined;
  // eslint-disable-next-line no-nested-ternary
  const downVal = (ctx, color, gradient = false) => ctx.p0.parsed.y > ctx.p1.parsed.y ? (
    gradient ? (() => {
      const grd = ctx.chart.ctx.createLinearGradient(0, ctx.p0.y, 0, 0);
      grd.addColorStop(0, '#ff000040');
      grd.addColorStop(1, color);
      return grd;
    })() : color
  ) : undefined;

  const data = {
    labels: fetchedData.time,
    datasets: [{
      data: fetchedData.data.map(Number),
      borderColor: [],
      borderWidth: 3,
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

  const chartInstance = new Chart(contextChart, {
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
          grid: {
            display: false
          },
          border: {
            display: false
          },
        },
        y: {
          border: {
            display: false,
          },
          ticks: {
            callback: (val, i, ticks) => (i < ticks.length - 1 ? Number(val).toPrecision(3) : null),
            display: true,
            mirror: true,
            labelOffset: -7,
            padding: -4
          },
        }
      },
      plugins: {
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

  return () => {
    chartInstance.destroy();
    btnMonth.removeEventListener('click', handleMonthSelect);
  };
};
