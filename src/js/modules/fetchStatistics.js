const BACKEND_URL = 'https://rfd-backend.vercel.app';
// Data for RFD burnt block
const ENDPOINT_FEES = '/unclaimedFees'; // every 5 minute
// Data for statistics price block & overview block
const ENDPOINT_ALL_DATA = '/getAllData'; // every 1 minute

async function fetchFees() {
  const controller = new AbortController();

  const TIMER_TIME = 1000 * 60 * 5; // 5 minute
  let timer = null;
  const timerClb = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}${ENDPOINT_FEES}`, {
        signal: controller.signal,
      });
      if (!response.ok) throw new Error('Network error - not ok response!');

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      // Use fetched data
      console.log('data unclaimed fees');
      console.dir(data);
    } catch (error) {
      console.error('Error during fetching Unclaimed-Fees:', error);
    }
  };

  // fetch data & run timer
  await timerClb();
  timer = setInterval(timerClb, TIMER_TIME);

  return {
    controller,
    timer
  }
};

async function fetchAllData() {
  const controller = new AbortController();

  const TIMER_TIME = 1000 * 60; // 1 minute
  let timer = null;
  const timerClb = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}${ENDPOINT_ALL_DATA}`, {
        signal: controller.signal,
      });
      if (!response.ok) throw new Error('Network error - not ok response!');

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      // Use fetched data
      console.log('data All-Data');
      console.dir(data);
      // eslint-disable-next-line no-use-before-define
      setPriceStatistics(data);
    } catch (error) {
      console.error('Error during fetching All-Data:', error);
    }
  };

  // fetch data & run timer
  await timerClb();
  timer = setInterval(timerClb, TIMER_TIME);

  return {
    controller,
    timer
  }
};

function findChildrenByClassName(parent, selector, results = []) {
  if (!parent || !selector) return results;
  const { children } = parent;
  if (!children || !children.length) return results;

  // eslint-disable-next-line no-restricted-syntax
  for (const child of children) {
    if (child.matches(selector)) {
      results.push(child);
    }

    findChildrenByClassName(child, selector, results);
  }
  return results;
}

function setValueToElement(element, value) {
  if (!element || !value) return;
  // eslint-disable-next-line no-param-reassign
  element.textContent = value || element.textContent;
};

function setPriceStatistics(data) {
  if (!data) return;

  const statisticDataContainer = document.querySelector('.statistics_data');
  if (!statisticDataContainer) return;

  const IS_INCREASED_PERCENT_CLASS_NAME = 'is-increased';
  const IS_DECREASED_PERCENT_CLASS_NAME = 'is-decreased';
  const setStatusPercent = (value) => {
    if (!value || typeof value === 'string') return '';
    return value > 0 ? IS_INCREASED_PERCENT_CLASS_NAME : IS_DECREASED_PERCENT_CLASS_NAME;
  };
  const setPercentValue = (parentEl, percentValue) => {
    if (!parentEl) return;
    const CLASS_NAME = '.statistics_percentage';
    const percentValueEl = findChildrenByClassName(
      parentEl,
      CLASS_NAME
    )[0];

    if (percentValueEl) {
      const percentPriceValue = Number(percentValue) || '';
      const status = setStatusPercent(percentPriceValue);

      setValueToElement(
        percentValueEl,
        // eslint-disable-next-line no-nested-ternary
        percentPriceValue ?
          status === IS_INCREASED_PERCENT_CLASS_NAME
            ? `+${percentPriceValue}%`
            : `${percentPriceValue}%`
          : ''
      );

      percentValueEl.classList.remove(IS_DECREASED_PERCENT_CLASS_NAME);
      percentValueEl.classList.remove(IS_INCREASED_PERCENT_CLASS_NAME);
      percentValueEl.classList.add(status);
    }
  };

  // statistics price block
  const statisticsPriceBlock = findChildrenByClassName(
    statisticDataContainer,
    '.statistics_price'
  )[0];

  if (statisticsPriceBlock) {
    // set price-value
    setValueToElement(
      findChildrenByClassName(
        statisticsPriceBlock,
        '.statistics_price-value'
      )[0],
      Number(data.current_price).toFixed(8) || ''
    );

    // set percent-value
    setPercentValue(statisticsPriceBlock, data.price_change_percentage_24h);
  }

  // statistics relative-price block
  const statisticsRelativePriceBlock = findChildrenByClassName(
    statisticDataContainer,
    '.statistics_relative-price'
  )[0];

  if (statisticsRelativePriceBlock) {
    const statisticCurrencyList = Array.from(
      findChildrenByClassName(
        statisticsRelativePriceBlock,
        '.statistics_currency'
      )
    );
    // btc eth
    const btcCurrency = statisticCurrencyList.find((item) => item.dataset.name === 'btc');
    const ethCurrency = statisticCurrencyList.find((item) => item.dataset.name === 'eth');

    if (btcCurrency) {
      setValueToElement(
        findChildrenByClassName(
          btcCurrency,
          '.statistics_currency-value'
        )[0],
        Number(data.current_price_btc).toFixed(8) || ''
      );

      setPercentValue(btcCurrency, Number(data.price_change_percentage_24h_btc).toFixed(3) || '');
    }

    if (ethCurrency) {
      setValueToElement(
        findChildrenByClassName(
          ethCurrency,
          '.statistics_currency-value'
        )[0],
        Number(data.current_price_eth).toFixed(8) || ''
      );

      setPercentValue(ethCurrency, Number(data.price_change_percentage_24h_eth).toFixed(3) || '');
    }
  }
};

export const init = () => {
  const { timer: timerFetchFees, controller: controllerFetchFees } = fetchFees();
  const { timer: timerFetchAllData, controller: controllerFetchAllData } = fetchAllData();

  return () => {
    controllerFetchFees.abort(); // stop request
    clearInterval(timerFetchFees); // clear timer
    controllerFetchAllData.abort();
    clearInterval(timerFetchAllData);
  };
};
