(async () => {
  if (window.name !== 'cafe_main') return;

  let config_result = await chrome.storage.local.get(['cafe_img_download_btn_short']);
  const handleImgShortDownload = () => {
    if (config_result.cafe_img_download_btn_short === true) {
      if (!document.getElementById('alzartak-cafe-img-short-style')) {
        const el = document.createElement('style');
        el.id = 'alzartak-cafe-img-short-style';
  
        el.innerHTML = `
          .layer_img_save a.btn_save {
            display: none !important;
          }
  
          .layer_img_save .save_option {
            display: block !important;
            top: -25px !important;
          }
        `;
  
        document.head.appendChild(el);
      }
    } else {
      document.getElementById('alzartak-cafe-img-short-style')?.remove();
    }
  }

  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace !== 'local') {
      return;
    }

    if (changes.cafe_img_download_btn_short) {
      config_result.cafe_img_download_btn_short = changes.cafe_img_download_btn_short.newValue;
      handleImgShortDownload();
    }
  });

  document.addEventListener('load', handleImgShortDownload);
  try {
    handleImgShortDownload();
  } catch {}
})();
