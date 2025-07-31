(async () => {
  if (top !== self) {
    return;
  }

  let result = await chrome.storage.local.get(['cafe_top_button']);
  const doJob = () => {
    if (window.location.href.includes('storyphoto')) {
      return;
    }

    const topButton = document.body.querySelector('#alzartak-top-button');
    if (!result.cafe_top_button) {
      if (!!topButton) {
        topButton.remove();
      }

      return;
    }

    if (!!topButton) {
      return;
    }

    const element = document.createElement('button');
    element.id = 'alzartak-top-button';
    element.addEventListener('click', () => {
      window.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    });

    element.innerHTML = '<i class="fa-solid fa-angles-up"></i>';

    const container = document.createElement('div');
    container.classList.add('alzartak-top-button-container');
    container.appendChild(element);
    document.body.appendChild(container);
  }

  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace !== 'local') {
      return;
    }

    if (changes.cafe_top_button) {
      result.cafe_top_button = changes.cafe_top_button.newValue;
      doJob();
    }
  });

  document.addEventListener('DOMContentLoaded', doJob);

  try {
    doJob();
  } catch { }
})();
