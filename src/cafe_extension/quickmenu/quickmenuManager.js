const DEFAULT_COMMANDS = [
  {
    uniqKey: 'articleAction-articleHeart',
    commandType: 'articleAction',
    commandName: `이 게시글 좋아요`,
    commandCategoryName: '게시글의 좋아요를 누릅니다.',
    commandIcon: 'fa-solid fa-heart',
    isDisabled: true,
    keywords: [
      '좋아요'
    ],
    onSelectData: {
      type: 'articleHeart',
      uniqCommandKey: 'articleAction-articleHeart',
    },
    disabledReason: '게시글을 보고 있을때에만 사용할 수 있습니다.',
  },
  {
    uniqKey: 'articleAction-articleCommentScroll',
    commandType: 'articleAction',
    commandName: `댓글 작성`,
    commandCategoryName: '댓글 작성 구역으로 바로 이동합니다.',
    commandIcon: 'fa-solid fa-comment',
    isDisabled: true,
    keywords: [
      '댓글작성',
    ],
    onSelectData: {
      type: 'articleCommentScroll',
      uniqCommandKey: 'articleAction-articleCommentScroll',
    },
    disabledReason: '게시글을 보고 있을때에만 사용할 수 있습니다.',
  },
  {
    uniqKey: 'articleAction-articleImageDownload',
    commandType: 'articleAction',
    commandName: `게시글 이미지 전체 다운로드`,
    commandCategoryName: '게시글에 있는 모든 이미지를 다운로드 합니다.',
    commandIcon: 'fa-solid fa-image',
    isDisabled: true,
    keywords: [
      '이미지',
      '다운로드',
      '전체',
    ],
    onSelectData: {
      type: 'articleImageDownload',
      uniqCommandKey: 'articleAction-articleImageDownload',
    },
    disabledReason: '게시글을 보고 있을때에만 사용할 수 있습니다.',
  },
  {
    uniqKey: 'articleWriteAction-articleWrite',
    commandType: 'articleWriteAction',
    commandName: `글 작성하기`,
    commandCategoryName: '카페 글을 작성합니다.',
    commandIcon: 'fa-solid fa-pen-nib',
    isDisabled: false,
    keywords: [
      '글작성',
      '글쓰기',
    ],
    onSelectData: {
      type: 'articleWrite',
      uniqCommandKey: 'articleWriteAction-articleWrite',
    },
    disabledReason: '카페에 가입된 상태에서 사용할 수 있습니다.',
  },
  {
    uniqKey: 'globalAction-recentClear',
    commandType: 'globalAction',
    commandName: `최근 사용 명령어 초기화`,
    commandCategoryName: '최근 사용한 명령어를 초기화 합니다.',
    commandIcon: 'fa-solid fa-trash',
    isDisabled: false,
    keywords: [
      '최근',
      '초기화',
      '제거',
    ],
    onSelectData: {
      type: 'recentClear',
    },
  },
];

(async () => {
  if (top !== self) {
    return;
  }

  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace !== 'local') {
      return;
    }

    if (changes.cafe_quickmenu) {
      window.location.reload();
    }
  });

  const quickmenu_result = await chrome.storage.local.get(['cafe_quickmenu']);
  if (!quickmenu_result.cafe_quickmenu) {
    return;
  }

  const addIframe = () => {
    if (!!document.getElementById('alzartak-quickmenu')) {
      return;
    }

    const el = document.createElement('iframe');
    el.id = 'alzartak-quickmenu';
    el.name = 'alzartak-quickmenu';
    el.src = chrome.runtime.getURL('/src/cafe_extension/quickmenu/index.html');

    el.style.display = 'none';
    el.allowTransparency = 'true';
    el.style.backgroundColor = 'transparent';
    el.style.position = 'fixed';
    el.style.top = 0;
    el.style.left = 0;
    el.style.width = '100vw';
    el.style.height = '100vh';
    el.style.zIndex = 99999999;

    document.body.appendChild(el);
  }

  let connectedPort = null;
  let { ['cafe-quickmenu-command-history']: commandHistory } = await chrome.storage.local.get('cafe-quickmenu-command-history');
  commandHistory = commandHistory ?? [];

  chrome.runtime.onConnect.addListener((port) => {
    if (port.name !== 'alzartak-quickmenu') {
      return;
    }

    console.log('[QuickMenu] Connected with iframe');
    connectedPort = port;
    port.onMessage.addListener((msg) => {
      handleIframeEvent(msg);
    });

    sendInitData(port);
    document.querySelector('iframe[name="cafe_main"]')?.addEventListener('load', async () => {
      console.log('[QuickMenu] Cafe main iframe loaded, rechecking function usable');
      checkFunctionUsable(port);
    });
  });

  const sendInitData = (port) => {
    if (!port && !!connectedPort) {
      port = connectedPort;
    }

    if (!port) {
      return;
    }

    const date = new Date();
    console.log('[QuickMenu] Send init data to iframe');
    port.postMessage({
      type: 'setHistory',
      data: commandHistory,
    });

    const groupTitleList = Array.from(document.querySelectorAll('div.cafe-menu-tit a[onclick]'));
    const boardCommandList = Array.from(document.querySelectorAll('ul.cafe-menu-list a[target="cafe_main"]'))
      .map((e) => {
        const groupId = e.closest('ul.cafe-menu-list').id;
        const groupName = groupTitleList.find((e) => e.attributes.getNamedItem('onclick').value.includes(groupId))?.innerText
        if (groupName?.includes('추억의 게시판')) {
          return null;
        }

        const url = new URL(e.href);
        if (['전체글보기', '인기글'].some((cond) => e.innerText.includes(cond))) {
          return {
            uniqKey: `boardNavigate-${url.searchParams.get('search.clubid')}-${url.searchParams.get('search.menuid')}`,
            commandType: 'boardNavigate',
            commandName: `"${e.innerText.replace(/\n|\t|\r/g, '')}" 페이지로 이동하기`,
            commandCategoryName: '페이지 이동',
            commandIcon: 'fa-solid fa-arrow-right',
            isDisabled: false,
            keywords: [
              e.innerText.replace(/ |\n|\t|\r/g, '').toLowerCase().replace('게시판', ''),
              e.innerText.replace(/\n|\t|\r/g).toLowerCase().replace('게시판', '')
                .split(' ').map((e) => e[0]).join(''),
            ],
            onSelectData: {
              type: 'boardNavigate',
              href: e.href,
              uniqCommandKey: `boardNavigate-${url.searchParams.get('search.clubid')}-${url.searchParams.get('search.menuid')}`
            }
          }
        } else {
          return {
            uniqKey: `boardNavigate-${url.searchParams.get('search.clubid')}-${url.searchParams.get('search.menuid')}`,
            commandType: 'boardNavigate',
            commandName: `"${e.innerText.replace(/\n|\t|\r/g, '')}" 게시판으로 이동하기`,
            commandCategoryName: '게시판 이동',
            commandIcon: 'fa-solid fa-arrow-right',
            isDisabled: false,
            keywords: [
              e.innerText.replace(/ |\n|\t|\r/g, '').toLowerCase().replace('게시판', ''),
              e.innerText.replace(/\n|\t|\r/g).toLowerCase()
                .split(' ').map((e) => e[0]).join(''),
            ],
            onSelectData: {
              type: 'boardNavigate',
              href: e.href,
              uniqCommandKey: `boardNavigate-${url.searchParams.get('search.clubid')}-${url.searchParams.get('search.menuid')}`
            }
          }
        }
      })
      .filter((e) => !!e);

    const commandList = DEFAULT_COMMANDS.concat(boardCommandList);

    port.postMessage({
      type: 'setCommands',
      data: commandList,
    });

    console.log('[QuickMenu] Sent init data to iframe', `took: ${new Date().getTime() - date.getTime()}ms`);
    checkFunctionUsable(port);
  };

  const checkFunctionUsable = (port) => {
    const date = new Date();
    console.log('[QuickMenu] Checking Function Usable');
    const cafeWriteAvailable = document.querySelector('div.cafe-write-btn a[onclick]')?.attributes.getNamedItem('onclick')?.value?.includes('writeBoard') ?? false;
    const isArticle = (document.querySelector('iframe[name="cafe_main"]')?.contentWindow?.location?.href ?? '').includes('ArticleRead.nhn');

    port.postMessage({
      type: 'updateDiabledByCommandType',
      data: {
        commandType: 'articleWriteAction',
        isDisabled: !cafeWriteAvailable,
      },
    });

    port.postMessage({
      type: 'updateDiabledByCommandType',
      data: {
        commandType: 'articleAction',
        isDisabled: !isArticle,
      },
    });

    console.log('[QuickMenu] Checked Function Usable', `took: ${new Date().getTime() - date.getTime()}ms`);
  }

  const handleIframeEvent = (ev) => {
    /**
     * @type {HTMLIFrameElement}
     */
    const iframe = document.querySelector('iframe[name="cafe_main"]');
    switch (ev.type) {
      case 'close':
        document.getElementById('alzartak-quickmenu').style.display = 'none';
        window.focus();
        return;
      case 'boardNavigate':
        addCommandHistory(ev.uniqCommandKey);
        const boardNaviagateElement = Array.from(document.querySelectorAll('ul.cafe-menu-list a[target="cafe_main"]'))
          .find((e) => e.href === ev.href)
        
        if (boardNaviagateElement) {
          boardNaviagateElement.click();
          return;
        }

        window.location.href = ev.href;
        return;
      case 'articleWrite':
        addCommandHistory(ev.uniqCommandKey);
        const boardWriteElement = document.querySelector('div.cafe-write-btn a[onclick]');
        if (boardWriteElement) {
          boardWriteElement.click();
          return;
        }

        const cafe_id = document.querySelector('div[cafeid]')?.getAttribute('cafeid');
        if (!cafe_id) {
          alert('카폐 정보를 찾는데 실패했습니다. 개발자에게 문의해주세요. 불편을 드려 죄송합니다.');
          return;
        }

        window.location.href = `https://cafe.naver.com/ca-fe/cafes/${cafe_id}/articles/write?boardType=L`;
        return;
      case 'articleCommentScroll':
        addCommandHistory(ev.uniqCommandKey);
        iframe.contentWindow.document.querySelector('div.CommentWriter')?.scrollIntoView({ behavior: 'smooth', block: 'center' });

        const tryFoucus = () => {
          window.focus();
          iframe.contentWindow.focus();
          iframe.contentWindow.document.querySelector('div.CommentWriter div.comment_inbox textarea')?.focus();
        }

        tryFoucus();
        setTimeout(tryFoucus, 100);
        return;
      case 'articleHeart':
        addCommandHistory(ev.uniqCommandKey);
        iframe.contentWindow.document.querySelector('div.like_article a[aria-pressed="false"] span.u_ico')?.click();
        return;
      case 'articleImageDownload':
        addCommandHistory(ev.uniqCommandKey);
        iframe.contentWindow.document.querySelectorAll('a.se-module-image-link.__se_image_link.__se_link[data-linkdata]')
          .forEach((e) => {
            const data = JSON.parse(e.attributes.getNamedItem('data-linkdata')?.value);
            if (!data.src) {
              return;
            }

            const url = new URL(data.src);
            url.searchParams.set('type', 'attachment');

            connectedPort?.postMessage({
              type: 'openTab',
              data: {
                url: url.href,
              },
            });
          });
        return;
      case 'recentClear':
        commandHistory = [];
        connectedPort?.postMessage({
          type: 'setHistory',
          data: commandHistory,
        });
    
        chrome.storage.local.set({ ['cafe-quickmenu-command-history']: commandHistory });
        return;
    }
  }

  const addCommandHistory = async (uniqKey) => {
    if (!uniqKey || commandHistory.includes(uniqKey)) {
      return;
    }

    if (commandHistory.length >= 5) {
      commandHistory.shift();
    }

    commandHistory.push(uniqKey);
    connectedPort?.postMessage({
      type: 'setHistory',
      data: commandHistory,
    });

    await chrome.storage.local.set({ ['cafe-quickmenu-command-history']: commandHistory });
  }

  document.addEventListener('DOMContentLoaded', addIframe);
  document.addEventListener('load', addIframe);

  document.addEventListener('DOMContentLoaded', () => sendInitData());
  document.addEventListener('load', () => sendInitData());

  try {
    addIframe();
    sendInitData();
  } catch { }
})();

(async () => {
  document.addEventListener('keydown', (e) => {
    if (window.location.href.toLowerCase().includes('manage')) {
      return;
    }

    if ((e.key === 'Q' && e.altKey && e.shiftKey) || (e.key === 'Q' && e.ctrlKey && e.shiftKey)) {
      /**
       * @type {HTMLIFrameElement}
       */
      const el = document.getElementById('alzartak-quickmenu') ?? window.parent?.document.getElementById('alzartak-quickmenu');
      if (!el) {
        return;
      }

      el.style.display = 'block';
      el.contentWindow.focus();
    }
  });
})();
