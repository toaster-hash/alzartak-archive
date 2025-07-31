const badge_options = [
  {
    url_includes: 'cafe.naver.com',
    badge_text: 'C',
    badge_color: '#fafafa',
    popup: '/src/popup/cafe.html',
  },
  {
    url_includes: 'twitch.tv',
    badge_text: 'T',
    badge_color: '#fafafa',
    popup: '/src/popup/twitch.html',
  },
]

chrome.tabs.onUpdated.addListener(async (id, info) => {
  const { url } = await chrome.tabs.get(id)

  for (const option of badge_options) {
    if (String(url).includes(option.url_includes)) {
      chrome.action.setBadgeBackgroundColor({ tabId: id, color: option.badge_color });
      chrome.action.setBadgeText({ tabId: id, text: option.badge_text });
      chrome.action.setPopup({
        tabId: id,
        popup: option.popup,
      });

      return;
    }
  }

  chrome.action.setBadgeText({ text: '' });
});