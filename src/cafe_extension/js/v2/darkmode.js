(async () => {
  let DARK_MODE_ENABLED = false;

  document.addEventListener('DOMContentLoaded', () => {
    if (top === self) {
      document.body.classList.add('alzartak-color-transition');
    }
  });

  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace !== 'local') {
      return;
    }

    if (changes.dark_mode) {
      DARK_MODE_ENABLED = changes.dark_mode.newValue;
      if (DARK_MODE_ENABLED) {
        enableDarkMode();
      } else {
        disableDarkMode(false);
      }
    }
  });

  const checkDarkModeConfig = async (ignore_reload) => {
    const storage_result = await chrome.storage.local.get(['dark_mode']);
    const changed = DARK_MODE_ENABLED !== storage_result.dark_mode;
    DARK_MODE_ENABLED = storage_result.dark_mode;

    if (changed) {
      if (DARK_MODE_ENABLED) {
        enableDarkMode();
      } else {
        disableDarkMode(ignore_reload);
      }
    }
  }

  const init = async () => {
    checkDarkModeConfig(true);

    if (self !== top) {
      // Add Self Navigation Transitions
      tryTransformArticleColor();
    }
  }

  const tryTransformArticleColor = () => {
    try {
      transformArticleColor(self.frameElement);
    } finally {
      setInterval(async () => {
        await transformArticleColor(self.frameElement)
      }, 100);
    }
  }

  const hexToRgb = (hex) => {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  const transformArticleColor = async (iframe, tryCount = 0) => {
    if (!DARK_MODE_ENABLED) {
      return;
    }

    if (!iframe) {
      return;
    }

    const doc = iframe.contentDocument ?? iframe.contentWindow.document;
    if (DARK_MODE_ENABLED && iframe.id === 'cafe_main') {
      if (!document.location.href.split('?')[0].split('/').includes('articles')) {
        console.log('[ALZARTAK > DARKMODE] Not an article, aborting');
        return;
      }

      if (!doc.querySelector('div.article_viewer')) {
        if (tryCount > 200) {
          console.log('[ALZARTAK > DARKMODE] Could not find article_viewer, aborting');
          return;
        }

        setTimeout(() => {
          transformArticleColor(iframe, tryCount + 1);
        }, 3);

        return;
      }

      /**
      * @type { HTMLSpanElement[] }
      */
      const texts = Array.from(doc.querySelectorAll('.article_viewer span, .article_viewer div, .article_viewer p, .article_viewer b, .article_viewer h1, .article_viewer h2, .article_viewer h3, .article_viewer h4, .article_viewer h5, .article_viewer h6, .article_viewer font, .article_viewer b, .article_viewer p, .article_viewer a, .article_viewer table tr, .article_viewer table td'));

      if (texts.length === 0) {
        return;
      }

      await Promise.all(texts.map(async (e) => {
        const color = e.style.color.replace('rgb', 'rgba').replace('rgba', '').replace('(', '').replace(')', '').replace(/ /g, '').split(',').map(Number).reduce((a, b) => a + b);
        const backgroundColor = e.style.backgroundColor.replace('rgb', 'rgba').replace('rgba', '').replace('(', '').replace(')', '').replace(/ /g, '').split(',').map(Number);
        const backgroundColorSum = backgroundColor.reduce((a, b) => a + b)

        if (!Number.isNaN(backgroundColorSum) && backgroundColorSum > 600) {
          e.style.backgroundColor = 'transparent';
        }

        if (e.style.color !== '' && !Number.isNaN(color)) {
          if ((color / 3) < 70) {
            e.style.color = '#fafafa';
          }
        }

        if (!!e.color) {
          const rgbResult = hexToRgb(e.color);
          const sum = rgbResult.b + rgbResult.g + rgbResult.r;
          if ((sum / 3) < 70) {
            e.color = '#fafafa';
          }
        }
      }));
    }
  }

  const enableDarkMode = () => {
    const style_element = document.createElement('link');
    const style_attr = document.createAttribute('from');
    style_attr.value = 'alzartak_darkmode';

    const css_url = chrome.runtime.getURL('/src/cafe_extension/darkMode.css');
    style_element.rel = "stylesheet preload prefetch prerender";
    style_element.as = "style";
    style_element.href = css_url;

    style_element.attributes.setNamedItem(style_attr);
    (document.body || document.head || document.documentElement).appendChild(style_element);

    tryTransformArticleColor();
  }

  const disableDarkMode = (reload_skip) => {
    Array.from(document.head.querySelectorAll('link[from="alzartak_darkmode"]')).forEach((e) => e.remove());
    if (!reload_skip) {
      window.location.reload();
    }
  }

  init();
})();
