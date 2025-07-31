// Cafe Main Window Location Keeper
(async () => {
  if (window.name !== 'cafe_main') {
    return;
  }

  let config_result = await chrome.storage.local.get(["cafe_keep_location"]);
  if (config_result.cafe_keep_location !== true) {
    return;
  }

  if (
    ![
      "ArticleRead.nhn",
      "/articles/",
      "about:blank",
      "members",
      "introduction",
      "popular",
    ].some((x) => document.location.href.includes(x))
  ) {
    window.parent.history.replaceState(null, null, document.location.href);
    return;
  }

  const tryPostUrl = (limit = 1) => {
    const url = document.body
      .querySelector("#spiButton.naver-splugin")
      ?.getAttribute("data-url");
    if (!!url) {
      window.parent.history.replaceState(null, null, url);
    } else {
      if (limit > 50) {
        return;
      }

      setTimeout(() => {
        tryPostUrl(limit + 1);
      }, 100);
    }
  };

  document.addEventListener('DOMContentLoaded', tryPostUrl);
  try {
    tryPostUrl();
  } catch {}
})();
