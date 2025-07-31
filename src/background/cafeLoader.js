chrome.webNavigation.onCommitted.addListener(
  async (ev) => {
    const storage_result = await chrome.storage.local.get(["dark_mode"]);
    const tabId = ev.tabId;

    if (ev.url.includes("section") || !ev.url.includes("/")) {
      return;
    }

    if (storage_result.dark_mode) {
      chrome.scripting.insertCSS({
        target: {
          tabId,
          allFrames: true,
        },
        files: ["/src/cafe_extension/darkMode.css"],
      });
    }
  },
  {
    url: [
      {
        hostSuffix: "cafe.naver.com",
      },
    ],
  }
);
