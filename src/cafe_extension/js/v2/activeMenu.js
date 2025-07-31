(async () => {
  if (self !== top) {
    return;
  }

  let config_result = await chrome.storage.local.get(['cafe_active_menu']);
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace !== 'local') {
      return;
    }

    if (changes.cafe_active_menu) {
      config_result.cafe_active_menu = changes.cafe_active_menu.newValue;
    }
  });

  const checkActiveMenu = () => {
    if (!config_result.cafe_active_menu) {
      return;
    }

    const selected_menu = document.querySelector('#cafe-menu .cafe-menu-list .b');
    if (!!selected_menu && selected_menu.id !== "") {
      const first_parent = selected_menu.parentNode;
      first_parent.parentNode.classList.add('alzartak-active-menu');
    }

    Array.from(document.body.getElementsByClassName('alzartak-active-menu'))
      .forEach((e) => {
        const result = e.querySelector(`.b`);
        if (!result) {
          e.classList.remove('alzartak-active-menu');
        }
      });
  }

  document.querySelector('iframe[name="cafe_main"]')?.addEventListener('load', async () => {
    console.log('[ActiveMenu] Cafe main iframe loaded, checking active menu');
    checkActiveMenu();
  });

  setTimeout(() => {
    checkActiveMenu();
  }, 500);
})();
