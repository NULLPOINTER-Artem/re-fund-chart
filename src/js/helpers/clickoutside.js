import $ from 'jquery';

export const outsideClick = (element, className) => {
  const listenerCb = (event) => {
    const lastMouseDownWasOutside = !$(event.target).closest(element).length;
    const deltaX = event.offsetX;
    const deltaY = event.offsetY;
    const distSq = (deltaX * deltaX) + (deltaY * deltaY);
    const isDrag = distSq > 3;
    const isDragException = isDrag && !lastMouseDownWasOutside;

    if (
      !element.contains(event.target) &&
      element.classList.contains(className) &&
      !isDragException
    ) {
      element.classList.toggle(className);
      document.removeEventListener('mousedown', listenerCb);
    }
  };

  document.addEventListener('mousedown', listenerCb);
  window.addEventListener('beforeunload', () => {
    document.removeEventListener('mousedown', listenerCb);
  });
}
