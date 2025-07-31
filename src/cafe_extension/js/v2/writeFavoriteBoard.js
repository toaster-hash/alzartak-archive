(async () => {
  const fetchWithSession = async (url, options) => {
    const result = await fetch(url, {
      credentials: "include",
      ...options,
    });
  
    return result.text();
  };
  
  const getFavoriteBoardList = async (club_id) => {
    return JSON.parse(await fetchWithSession(
      "https://cafe.naver.com/FavoriteCafeMenuListViewAjax.nhn",
      {
        method: "POST",
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: `clubId=${club_id}`
      }
    ));
  };

  if (self !== top) {
    return;
  }

  if (!window.location.href.includes('/write')) {
    return;
  }

  const config_result = await chrome.storage.local.get([
    "write_favorite_board",
  ]);
  if (!config_result.write_favorite_board) {
    return;
  }

  const doJob = async (count = 0) => {
    const cafe_id = document.querySelector('div[cafeid]')?.getAttribute('cafeid');
    if (!cafe_id && count < 10) {
      setTimeout(() => doJob(count + 1), 1000);
      return;
    }

    const favoriteBoardList = await getFavoriteBoardList(cafe_id);
    if (!favoriteBoardList.isSuccess) {
      return;
    }

    const menu_name_list = favoriteBoardList.result.map((e) => e.menuName);
    const menu_el_list = Array.from(document.body.querySelectorAll('ul.option_list span.option_text'));
    const included_menu_el_list = menu_el_list.filter((e) => menu_name_list.includes(e.innerHTML)).reverse()
    const option_list = document.body.querySelector('ul.option_list');

    included_menu_el_list.forEach((e) => {
      option_list.firstChild.before(e.parentElement.parentElement);
      e.parentElement.parentElement.classList.add('alzartak-write-favorite-board')
      const element = document.createElement('div');
      element.classList.add('right-note');
      element.innerText = '즐겨찾기한 게시판';
      e.parentElement.appendChild(element);
    });
  };

  try {
    doJob();
  } catch { }
})();
