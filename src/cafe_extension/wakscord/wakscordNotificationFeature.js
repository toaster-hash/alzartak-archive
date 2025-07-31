const wakscordOverlayApp = async () => {
  const articleCache = {};

  const getListFetchUrl = async () => {
    const elements = await safeQuerySelectorAll('ul.cafe-menu-list a[target="cafe_main"]');
    const targetElement = elements.find((e) => e.innerText.replace(/ /g, '').includes('왁스코드'));
    return new URL(targetElement.href);
  }

  const getCurrentCafeInfo = async () => {
    const url = await getListFetchUrl();
    return {
      cafe_id: Number(url.searchParams.get('search.clubid')),
      menu_id: Number(url.searchParams.get('search.menuid')),
    }
  }

  const authorizedFetch = async (url) => {
    return await fetch(url, { credentials: 'include' });
  }

  const getArticle = async (articleId, clubid) => {
    const response = await authorizedFetch(`https://apis.naver.com/cafe-web/cafe-articleapi/v2/cafes/${clubid}/articles/${articleId}`);
    const json = await response.json();

    return json.result.article;
  }

  const fetchDomElement = async (url) => {
    // console.time('fetchDomElement');
    const response = await authorizedFetch(url);
    // console.timeLog('fetchDomElement', 'got response from server');
    const buffer = await response.arrayBuffer();
    // console.timeLog('fetchDomElement', 'got arrayBuffer');
    const decoder = new TextDecoder('euc-kr');
    const decoded = decoder.decode(buffer);
    // console.timeLog('fetchDomElement', 'Text Decoded');

    const document = (new DOMParser()).parseFromString(decoded, 'text/html');
    // console.timeEnd('fetchDomElement');

    return document;
  }

  const fetchArticleIdList = async () => {
    const url = await getListFetchUrl();
    let doc = await fetchDomElement(url);
    const targetBoard = Array.from(doc.querySelectorAll('div.article-board'))
      .find((e) => e.id !== 'upperArticleList');
    const articles = Array.from(targetBoard.querySelectorAll('table > tbody > tr'));
    const articleIdList = articles
      .map((e) => {
        return e.querySelector('.board-number .inner_number')?.innerText?.trim();
      })
      .filter((e) => !!e)
    
    doc = undefined;
    return articleIdList;
  }

  const fetchArticleList = async () => {
    const cafeInfo = await getCurrentCafeInfo();
    const idList = await fetchArticleIdList();

    const now = new Date();
    const articleList = await Promise.all(idList.map(async (id) => {
      if (articleCache[id]) {
        const data = articleCache[id];
        data.fetchType = 'cached';

        return data;
      }

      const articleData = await getArticle(id, cafeInfo.cafe_id);
      const data = {
        id: articleData.id,
        title: articleData.subject.replace(/\n/g, ' ').replace('  ', ' '),
        head: articleData.head,
        writeDate: new Date(articleData.writeDate),
        dateDiffInMinutes: (now - new Date(articleData.writeDate)) / 1000 / 60,
        href: `https://cafe.naver.com/ArticleRead.nhn?clubid=${cafeInfo.cafe_id}&articleid=${articleData.id}`,
      }

      articleCache[id] = data;
      data.fetchType = 'fetched';

      return data;
    }));

    return articleList.filter((e) => !!e.head);
  }

  const addWakscordNotificationContainer = async () => {
    const element = document.createElement('div');
    element.id = 'wakscord-notification-container';
    document.body.appendChild(element);
    console.log(`[WAKSCORD] Notification Container Appended`);
  }

  const addWakscordNotification = async ({ id, href, title, head }) => {
    const container = await safeQuerySelector('#wakscord-notification-container');
    const element = document.createElement('div');
    element.classList.add('wakscord-notification');
    element.classList.add(head);

    element.id = `wakscord-notification-${id}`;
    element.style.background = `url("${chrome.runtime.getURL(`/src/cafe_extension/assets/wakscord_banner/${head}.webp`)}") no-repeat`;
    element.innerHTML = `
      <img class="logo" src="${chrome.runtime.getURL(`/src/cafe_extension/assets/기본_투명.png`)}" />
      <div class="metadata">
        <div class="notification-subtitle">왁스코드 채팅 알림</div>
        <div class="notification-title"><b>[${head}]</b> ${title}</div>
        <div class="notification-info">클릭 시 게시글로 이동합니다.</div>
      </dlv>
    `;

    element.addEventListener('click', async () => {
      (await safeQuerySelector(`#wakscord-notification-${id}`)).remove();
      window.open(href, '_blank');
    });

    setTimeout(async () => {
      const el = await safeQuerySelector(`#wakscord-notification-${id}`);
      el.classList.add('fade-out');

      setTimeout(() => {
        el.remove();
      }, 500);
    }, 15 * 1000);

    container.appendChild(element);
  }

  const doNotificationJob = async () => {
    const MODE = 'PROD';
    const cafeInfo = await getCurrentCafeInfo();
    const article_list = await fetchArticleList();

    if (MODE === 'DEBUG') {
      await chrome.storage.local.set({ [`wakscord_notification_last_id_${cafeInfo.cafe_id}`]: 0 });
    }

    const { [`wakscord_notification_last_id_${cafeInfo.cafe_id}`]: wakscord_notification_last_id } = await chrome.storage.local.get([`wakscord_notification_last_id_${cafeInfo.cafe_id}`]);
    const notification_article_list = article_list
      .filter((e) => e.dateDiffInMinutes < (MODE === 'DEBUG' ? 99999999 : 2))
      .filter((e) => MODE === 'DEBUG' ? true : e.id > (wakscord_notification_last_id ?? 0));

    if (notification_article_list.length === 0) {
      // 전달할 알림이 없음
      return;
    }

    await chrome.storage.local.set({ [`wakscord_notification_last_id_${cafeInfo.cafe_id}`]: notification_article_list.reduce((a, b) => a > b ? a : b) });
    if (MODE === 'DEBUG') {
      await chrome.storage.local.set({ [`wakscord_notification_last_id_${cafeInfo.cafe_id}`]: 0 });
    }

    for (const article of notification_article_list) {
      await addWakscordNotification(article);
    }

    try {
      const effect = new Audio(chrome.runtime.getURL(`/src/cafe_extension/assets/notification.mp3`));
      effect.volume = 0.5;
      effect.play();
    } catch (err) {
      console.log(`[WAKSCORD] Failed to play notification sound: ${err}`);
    }
  }

  const doArticleCacheCleanJob = () => {
    Object.keys(articleCache).forEach((key) => {
      articleCache[key] = undefined;
    });
  }

  const init = async () => {
    await addWakscordNotificationContainer();

    setTimeout(async () => {
      await doNotificationJob();
    }, 500);

    setInterval(async () => {
      await doNotificationJob();
    }, 60000);

    setInterval(() => {
      doArticleCacheCleanJob();
    }, 10 * 60000);

    console.log(`[WAKSCORD] Notification Initiated!`);
  };

  await init();
}

(async () => {
  if (top !== self) return;
  const { wakscord_notification } = await chrome.storage.local.get(['wakscord_notification']);
  if (!wakscord_notification) {
    return;
  }

  await wakscordOverlayApp();
})();
