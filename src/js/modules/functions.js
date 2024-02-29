export function supportsWebp() {
  const testWebp = (cb) => {
    const webp = new Image();
    const fn = () => {
      cb(true);
    };

    webp.onload = fn;
    webp.onerror = fn;

    webp.src = "data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA";
  }

  testWebp((support) => {
    const className = support === true ? 'webp' : 'no-webp';
    document.documentElement.classList.add(className);
  })
}
