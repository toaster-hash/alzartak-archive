(async () => {
  let config_result = await chrome.storage.local.get(['cafe_pretendard']);
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace !== 'local') {
      return;
    }

    if (changes.cafe_pretendard) {
      config_result.cafe_pretendard = changes.cafe_pretendard.newValue;
      if (config_result.cafe_pretendard) {
        changeFont();
      } else {
        window.location.reload();
      }
    }
  });

  const changeFont = () => {
    if (config_result.cafe_pretendard === true) {
      const sheet = new CSSStyleSheet();
      sheet.title = 'alzartak-font';
      sheet.replaceSync(`
        body {
          font-family: 'Pretendard';
        }
        
        .se-viewer, .se-viewer:lang(ko-KR) {
          font-family: 'Pretendard';
        }

        .se-viewer .se-ff-, .se-viewer:lang(ko-KR) .se-ff- {
          font-family: 'Pretendard' !important;
        }

        .se-viewer .se-ff-system, .se-viewer:lang(ko-KR) .se-ff-system {
          font-family: 'Pretendard' !important;
        }

        .CafeEditor .se-body .se-ff-system, .CafeEditor .se-body:lang(ko-KR) .se-ff-system, .WritingTag .tag_input_box .tag_input {
          font-family: 'Pretendard' !important;
        }

        button, textarea {
          font-family: 'Pretendard' !important;
        }
      `);

      document.adoptedStyleSheets.push(sheet);
    }
  }

  document.addEventListener('readystatechange', changeFont);
  document.addEventListener('DOMContentLoaded', changeFont);
  document.addEventListener('load', changeFont);
  try {
    changeFont();
  } catch {}
})();
