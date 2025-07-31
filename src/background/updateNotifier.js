// Check for update notes
const manifestData = chrome.runtime.getManifest();

const release_data = {
  release_note_html: `
  이번 버전에서는 아래 내용이 수정 / 추가 되었습니다.<br/>
  - 용량 최적화<br/>
  - 게시글에 포함된 링크에도 확인한 글은 반투명 상태로 표기하도록 변경<br/>
  - 게시판 하이라이트 기능 성능 패치<br/>
  - 새로고침 위치 기억 기능 성능 패치<br/>
  - 닉네임, 프사 가리기 기능 제거<br/>
  - [왁물원 전용] 자유게시판일 경우 말머리 필수 기능 비활성화<br/>
  <br/>
  `,
  release_note_notification_title: `알잘딱 확장 프로그램 업데이트 완료!`,
  release_note_notification_body: `왁스코드 채팅 알림 기능이 추가되었습니다.`,
  slient_update: true,
}

const app = async () => {
  await chrome.storage.local.set({
    release_note: release_data.release_note_html,
  });

  const note_key = `release_note_${manifestData.version}`;
  const release_result = await chrome.storage.local.get([note_key]);
  if ((release_result[note_key] === undefined || release_result[note_key] === null) && release_data.slient_update !== true) {
    // Send Release Notification
    chrome.notifications.create({
      type: 'basic',
      iconUrl: '/128.png',
      title: release_data.release_note_notification_title,
      message: release_data.release_note_notification_body,
      priority: 2,
    });

    await chrome.storage.local.set({
      [`release_note_${manifestData.version}`]: false,
    });
  }

  // 형은 신이야 형 요청으로 제거
  // const quickmenu_result = await chrome.storage.local.get(['cafe_quickmenu']);
  // if (quickmenu_result.cafe_quickmenu === undefined || quickmenu_result.cafe_quickmenu === null) {
  //   await chrome.storage.local.set({
  //     cafe_quickmenu: true,
  //   });
  // }

  const wakscord_result = await chrome.storage.local.get(['wakscord_ui']);
  if (wakscord_result.wakscord_ui === undefined || wakscord_result.wakscord_ui === null) {
    await chrome.storage.local.set({
      wakscord_ui: true,
    });
  }

  // const wakscord_notification_result = await chrome.storage.local.get(['wakscord_notification']);
  // if (wakscord_notification_result.wakscord_notification === undefined || wakscord_notification_result.wakscord_notification === null) {
  //   await chrome.storage.local.set({
  //     wakscord_notification: true,
  //   });
  // }
}

app();
