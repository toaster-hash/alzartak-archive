(async () => {
  let config_result = await chrome.storage.local.get(["cafe_viewed_article"]);
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace !== 'local') {
      return;
    }

    if (changes.cafe_viewed_article) {
      config_result.cafe_viewed_article = changes.cafe_viewed_article.newValue;
    }
  });

  const getDocumentUrl = () => {
    if (
      ![
        "ArticleRead.nhn",
        "/articles/",
      ].some((x) => document.location.href.includes(x))
    ) {
      return null;
    }

    // console.log('[ALZARTAK] Article Page Detected:', window.location.href);
    return new URL(window.location.href);
  };

  const getSharedUrl = async () => {
    if (window.name !== 'cafe_main') {
      return null;
    }

    const url = (await safeQuerySelector('#spiButton.naver-splugin'))?.getAttribute('data-url');
    if (!!url) {
      return new URL(url);
    }

    return null;
  };

  const checkViewed = async () => {
    if (!config_result.cafe_viewed_article) {
      return;
    }

    const currentUrl = await getDocumentUrl();
    if (!currentUrl) {
      return;
    }

    const args = currentUrl.pathname.split('/').filter((e) => !Number.isNaN(Number(e)) && e !== '');
    const currentArticleId = Number(currentUrl.searchParams.get('articleid') ?? args[1]);
    const clubid = Number(currentUrl.searchParams.get('clubid') ?? args[0]);

    if (Number.isNaN(currentArticleId) || Number.isNaN(clubid)) {
      return;
    }

    // console.log(`[ALZARTAK] Article Viewed: ${clubid}-${currentArticleId}`);
    await chrome.storage.local.set({ [`cafe-article-${clubid}-${currentArticleId}-viewed`]: true });

    const sharedUrl = await getSharedUrl();
    if (sharedUrl) {
      const sharedArgs = sharedUrl.pathname.split('/');
      const sharedClubId = sharedArgs[1];

      // console.log(`[ALZARTAK] Article Viewed: ${sharedClubId}-${currentArticleId}`);
      await chrome.storage.local.set({ [`cafe-article-${sharedClubId}-${currentArticleId}-viewed`]: true });
    } else {
      // console.log('[ALZARTAK] Shared URL Not Found');
    }
  }

  document.addEventListener("load", checkViewed);
  document.addEventListener("DOMContentLoaded", checkViewed);
  document.addEventListener("readystatechange", checkViewed);
  try {
    checkViewed();
  } catch { }
})();

(async () => {
  let config_result = await chrome.storage.local.get(["cafe_viewed_article"]);
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace !== 'local') {
      return;
    }

    if (changes.cafe_viewed_article) {
      config_result.cafe_viewed_article = changes.cafe_viewed_article.newValue;
    }
  });

  const transformArticle = async (tryCount = 1) => {
    if (!config_result.cafe_viewed_article || window === top || !window.location.href.includes('ArticleRead.nhn')) {
      return;
    }

    if (!document.querySelector('.se-module-oglink')) {
      if (tryCount > 200) {
        return;
      }

      setTimeout(() => {
        transformArticle(tryCount + 1);
      }, 3);

      return;
    }

    const article_link_list = Array.from(document.querySelectorAll('.se-module-oglink a[href]'))
      .map((e) => {
        const url = new URL(e.href);

        return {
          articleId: url.searchParams.get('articleid') ?? url.pathname.split('/').pop(),
          clubid: url.searchParams.get('clubid') ?? url.pathname.split('/')[1],
          element: e.parentElement.closest('.se-section-oglink'),
        }
      });

    console.log('[ALZARTAK] Article Link List:', article_link_list);

    const keyList = article_link_list.map((e) => `cafe-article-${e.clubid}-${e.articleId}-viewed`);
    console.log('[ALZARTAK] Article Key List:', keyList);
    const result = await chrome.storage.local.get(keyList);
    console.log('[ALZARTAK] Article Result:', result);

    article_link_list.forEach((e) => {
      if (result[`cafe-article-${e.clubid}-${e.articleId}-viewed`]) {
        e.element.classList.add('alzartak-viewed-article');
      }
    });
  }

  const handleViewedArticleTransform = async () => {
    if (!config_result.cafe_viewed_article) {
      return;
    }

    const article_list = Array.from(document.querySelectorAll('a.article, div.card_area .tit_area a, ul.article-album-sub > li > a.album-img'));
    const articleLocations = article_list
      .map((e) => {
        const url = new URL(e.href);
        return {
          articleId: url.searchParams.get('articleid'),
          clubid: url.searchParams.get('clubid'),
          element: e.parentElement.closest('tr, div.card_area, li'),
        }
      });

    const keyList = articleLocations.map((e) => `cafe-article-${e.clubid}-${e.articleId}-viewed`);
    const result = await chrome.storage.local.get(keyList);

    articleLocations.forEach((e) => {
      if (result[`cafe-article-${e.clubid}-${e.articleId}-viewed`]) {
        e.element.classList.add('alzartak-viewed-article');
      }
    });

    await transformArticle();
  };

  document.addEventListener('load', handleViewedArticleTransform);
  document.addEventListener('DOMContentLoaded', handleViewedArticleTransform);
  document.addEventListener('readystatechange', handleViewedArticleTransform);

  try {
    handleViewedArticleTransform();
  } catch { }
})();
