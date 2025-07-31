(async () => {
  let register_block = false;
  let registered = false;

  const doRegister = () => {
    if (registered) {
      return;
    }

    const submit_btn = document.body.querySelector('.WritingHeader .tool_area a');
    if (!submit_btn) {
      setTimeout(() => doRegister(), 100);
      return;
    }

    registered = true;
    submit_btn.addEventListener('click', (e) => {
      if (register_block) {
        alert('[알잘딱] 말머리 필수 기능이 설정되어 있습니다. 말머리를 선택해주세요.');
        e.preventDefault();
        e.stopImmediatePropagation();
        return false;
      }
    }, true);
  }


  setInterval(async () => {
    const writting_wrap = document.body.querySelector('.WritingWrap');
    if (!writting_wrap) {
      return;
    }

    doRegister();
    const result = await chrome.storage.local.get(['cafe_write_subtitle_protection']);
    if (!result.cafe_write_subtitle_protection) {
      register_block = false;
      document.body.querySelector('.WritingHeader .tool_area a .BaseButton__txt').innerText = ' 등록 ';
      document.body.querySelector('.WritingHeader .tool_area a .BaseButton__txt').style.color = null;
      return;
    }

    const subtitle_btn = document.body.querySelector('.column_category .FormSelectButton button');
    const subtitle_exists = !subtitle_btn.disabled;

    /**
     * @type {HTMLButtonElement}
     */
    const selected_subtitle = document.body.querySelector('.column_category .FormSelectButton button');
    const user_selected = selected_subtitle.innerText.replace(/ /g, '') !== '말머리선택';

    const notice_element = document.body.querySelector('p.notice_text');
    const exclude_board = notice_element && notice_element.innerText.split('\n').some((e) => e.includes('말머리') && e.includes('않아도'));

    if (subtitle_exists && !user_selected && !exclude_board) {
      register_block = true;
      document.body.querySelector('.WritingHeader .tool_area a .BaseButton__txt').innerText = ' 말머리 선택 필수! ';
      document.body.querySelector('.WritingHeader .tool_area a .BaseButton__txt').parentElement.style = 'background-color: rgba(250,0,0,0.1) !important;';
      document.body.querySelector('.WritingHeader .tool_area a .BaseButton__txt').style.color = '#ff0000';
    } else {
      register_block = false;
      document.body.querySelector('.WritingHeader .tool_area a .BaseButton__txt').innerText = ' 등록 ';
      document.body.querySelector('.WritingHeader .tool_area a .BaseButton__txt').style.color = null;
      document.body.querySelector('.WritingHeader .tool_area a .BaseButton__txt').parentElement.style = '';
    }
  }, 1000);
})();
