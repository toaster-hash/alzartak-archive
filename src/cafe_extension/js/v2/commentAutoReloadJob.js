(async () => {
  if (window.name !== 'cafe_main') {
    return;
  }

  let result = await chrome.storage.local.get(['cafe_comment_auto_reload', 'cafe_comment_newest']);
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace !== 'local') {
      return;
    }

    if (changes.cafe_comment_newest) {
      result.cafe_comment_auto_reload = changes.cafe_comment_auto_reload.newValue;
    }

    if (changes.cafe_comment_newest) {
      result.cafe_comment_newest = changes.cafe_comment_newest.newValue;
    }
  });

  const tryAutoReload = (count = 0) => {
    if (!result.cafe_comment_auto_reload || count > 50) {
      return;
    }

    /**
    * @type {HTMLButtonElement}
    */
    const button = document.body.querySelector('button.comment_refresh_button');
    if (!button) {
      setTimeout(() => tryAutoReload(count + 1), 100);
      return;
    }

    const refresh_time = document.body.querySelector('#alzartak_comment_refresh_time');
    if (!refresh_time) {
      const element = document.createElement('span');
      element.id = 'alzartak_comment_refresh_time';
      element.style = 'margin-left: 5px; color: #03c75a; font-size: 8pt;';
      element.innerText = '5초 간격으로 자동 새로고침 중!';
      
      button.parentElement.appendChild(element);
    }

    setInterval(() => {
      button.click();
    }, 5000);
  }

  const tryNewest = (count = 0) => {
    if (!result.cafe_comment_newest || count > 50) {
      return;
    }

    /**
    * @type {HTMLLinkElement}
    */
    const liveButton = Array.from(document.body.querySelectorAll('.comment_tab_button')).filter((e) => e.innerHTML.includes('최신'))[0];
    if (!liveButton) {
      setTimeout(() => tryNewest(count + 1), 100);
      return;
    }

    liveButton.click();
  }

  try {
    tryAutoReload();
    tryNewest();
  } catch {}
})();
