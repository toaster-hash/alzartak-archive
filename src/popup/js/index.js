window.addEventListener('load', async () => {
  console.log('starting loading');
  /**
   * @type {HTMLInputElement[]}
   */
  const options = Array.from(document.getElementsByClassName('option'));
  const option_id_list = options.map((e) => e.id);
  const result = await chrome.storage.local.get(option_id_list);

  options.forEach((e) => {
    const checked = result[e.id];
    e.checked = checked;

    e.addEventListener('click', async () => {
      console.log([e.id, e.checked]);
      await chrome.storage.local.set({ [e.id]: e.checked });
    });
  });

  document.getElementById('license').addEventListener('click', () => {
    openLicense();
  });

  document.getElementById('showRelease').addEventListener('click', () => {
    showReleaseNote();
  });

  const manifestData = chrome.runtime.getManifest();
  document.getElementById('version').innerText = `알잘딱 v${manifestData.version}`;
  document.body.querySelector('.release-note span.title').innerHTML = `🙌 알잘딱 v${manifestData.version} 업데이트 완료 안내`;

  const release_result = await chrome.storage.local.get([`release_note_${manifestData.version}`, 'release_note']);
  document.body.querySelector('.release-note span.description').innerHTML = release_result.release_note;

  if (!release_result[`release_note_${manifestData.version}`]) {
    await showReleaseNote();
  } else {
    await closeReleaseNote();
  }

  document.getElementById('release-note-close').addEventListener('mousedown', async () => {
    closeReleaseNote();
  });
});

function openLicense() {
  chrome.tabs.create({url: chrome.runtime.getURL('/src/popup/license.html')});
}

async function showReleaseNote() {
  const manifestData = chrome.runtime.getManifest();
  await chrome.storage.local.set({
    [`release_note_${manifestData.version}`]: false
  });

  document.getElementById('relase-note').style.display = 'flex';
}

async function closeReleaseNote() {
  const manifestData = chrome.runtime.getManifest();
  await chrome.storage.local.set({
    [`release_note_${manifestData.version}`]: true
  });

  document.getElementById('relase-note').style.display = 'none';
}