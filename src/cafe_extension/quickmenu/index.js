let commandList = [];
let historyList = [];
let isOpen = false;

window.addEventListener("focus", () => {
  document.getElementById("input").focus();
});

let port = null;
document.addEventListener("DOMContentLoaded", () => {
  chrome.tabs.getCurrent((tab) => {
    port = chrome.tabs.connect(tab.id, { name: "alzartak-quickmenu" });
    port.onMessage.addListener((msg) => {
      switch (msg.type) {
        case "appandCommands":
          commandList.push(...msg.data);
          break;
        case "setCommands":
          commandList = msg.data;
          break;
        case "updateDiabledByCommandType":
          commandList.map((e) => {
            if (e.commandType === msg.data.commandType) {
              e.isDisabled = msg.data.isDisabled;

              const searchResultElement = document.querySelector(`div.searchResult[uniqcommandkey="${e.uniqKey}"]`);
              if(!searchResultElement) {
                return;
              }

              if (e.isDisabled) {
                if (searchResultElement.classList.contains('searchResultDisabled')) {
                  return;
                }

                searchResultElement.classList.add('searchResultDisabled');
                searchResultElement.querySelector('.subtitle').innerHTML = e.isDisabled
                  ? e.disabledReason ?? e.commandCategoryName
                  : e.commandCategoryName;
              } else {
                if (!searchResultElement.classList.contains('searchResultDisabled')) {
                  return;
                }

                searchResultElement.classList.remove('searchResultDisabled');
                searchResultElement.querySelector('.subtitle').innerHTML = e.isDisabled
                  ? e.disabledReason ?? e.commandCategoryName
                  : e.commandCategoryName;
              }
            }
          });
          break;
        case "setHistory":
          historyList = msg.data;
          break;
        case "openTab":
          chrome.tabs.create({ url: msg.data.url, active: false });
          break;
      }
    });
  });
});

document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("input");
  const icon = document.getElementById("searchIcon");
  let recentSearchString = "";

  const closeQuickMenu = () => {
    input.value = "";
    port.postMessage({ type: "close" });
    document
      .querySelectorAll(".searchResult, .searchTip")
      .forEach((e) => e.remove());
    recentSearchString = "";
    isOpen = false;
  };

  // Close Quick Menu on outer click
  document.body.addEventListener("click", (e) => {
    if (e.target !== document.body) {
      return;
    }

    closeQuickMenu();
    return;
  });

  let timer = null;
  input.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeQuickMenu();
      return;
    }

    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
      const results = Array.from(
        document.querySelectorAll(".searchResult")
      ).filter((e) => !e.classList.contains("searchResultDisabled"));
      if (results.length <= 0) {
        return;
      }

      const currentIndex = results.findIndex((e) =>
        e.classList.contains("searchResultActive")
      );
      if (currentIndex === -1) {
        results[0].classList.add("searchResultActive");
        return;
      }

      if (e.key === "ArrowUp") {
        let targetIndex = currentIndex - 1;
        if (targetIndex < 0) {
          targetIndex = 0;
        }

        results[currentIndex].classList.remove("searchResultActive");
        results[targetIndex].classList.add("searchResultActive");
        return;
      }

      if (e.key === "ArrowDown") {
        let targetIndex = currentIndex + 1;
        if (targetIndex >= results.length) {
          targetIndex = 0;
        }

        results[currentIndex].classList.remove("searchResultActive");
        results[targetIndex].classList.add("searchResultActive");
        return;
      }

      return;
    }

    if (e.key === "Enter") {
      const activeResult = document.querySelector(".searchResultActive");
      if (!activeResult) {
        return;
      }

      const onSelectData = JSON.parse(
        activeResult.attributes.getNamedItem("onSelectData").value
      );
      port.postMessage(onSelectData);

      closeQuickMenu();
      return;
    }

    if (!!timer) {
      clearTimeout(timer);
    }

    handleSearchIcon(true);

    // Search With Delay (User Typing)
    timer = setTimeout(() => doSearch(input.value), 500);
  });

  const handleSearchIcon = (searching) => {
    if (searching) {
      icon.classList.remove("fa-bolt");
      icon.classList.add("fa-spinner");
      icon.classList.add("fa-spin");
    } else {
      icon.classList.add("fa-bolt");
      icon.classList.remove("fa-spinner");
      icon.classList.remove("fa-spin");
    }
  };

  const getCommandElement = (commands) => {
    const elements = [];
    if (commands.length > 0) {
      let isFirstCommand = true;
      const result = commands.slice(0, 5).map((e, index) => {
        const el = document.createElement("div");
        el.classList.add("searchResult");
        if (e.isDisabled) {
          el.classList.add("searchResultDisabled");
        } else if (isFirstCommand) {
          isFirstCommand = false;
          el.classList.add("searchResultActive");
        }

        const onSelectAttr = document.createAttribute("onSelectData");
        onSelectAttr.value = JSON.stringify(e.onSelectData);

        const uniqCommandKeyAttr = document.createAttribute("uniqCommandKey");
        uniqCommandKeyAttr.value = e.uniqKey;

        el.attributes.setNamedItem(onSelectAttr);
        el.attributes.setNamedItem(uniqCommandKeyAttr);

        el.innerHTML = `
            <i class="${e.commandIcon} icon"></i>
            <div class="container">
              <span class="title">${e.commandName}</span>
              <span class="subtitle">${
                e.isDisabled
                  ? e.disabledReason ?? e.commandCategoryName
                  : e.commandCategoryName
              }</span>
            </div>
          `;

        if (!e.isDisabled) {
          el.addEventListener("click", () => {
            port.postMessage(e.onSelectData);
            closeQuickMenu();
          });
        }

        return el;
      });

      elements.push(...result);

      if (commands.length > 5) {
        const el = document.createElement("span");
        el.classList.add("searchTip");
        el.innerText = `${(
          commands.length - 5
        ).toLocaleString()}개의 결과가 더 있습니다. 검색 범위를 좀 더 좁혀보세요.`;
        elements.push(el);
      }

      document
        .querySelectorAll(".searchResult, .searchTip")
        .forEach((e) => e.remove());
    } else {
      // 검색 결과 없음
      document
        .querySelectorAll(".searchResult, .searchTip")
        .forEach((e) => e.remove());
    }

    return elements;
  };

  const doSearch = (searchString) => {
    if (searchString !== input.value) {
      console.log("User is typing, ignoring", searchString, input.value);
      return;
    }

    const elements = [];

    if (
      searchString.replace(/[A-Za-z]| /g, "").length === 0 &&
      searchString.replace(/ /g, "").length > 5
    ) {
      const converted = inko.en2ko(searchString);
      const el = document.createElement("span");
      el.classList.add("searchTip");
      el.innerHTML = `<i class="fa-solid fa-arrows-rotate"></i> 한/영 변환된 "${converted}" 검색어로 검색한 결과입니다.`;
      elements.push(el);

      searchString = converted;
    }

    if (searchString.replace(/ /g, "") === "") {
      // Recent
      const commands = commandList
        .filter((e) => historyList.includes(e.uniqKey))
        .sort(
          (a, b) =>
            historyList.indexOf(b.uniqKey) - historyList.indexOf(a.uniqKey)
        );

      if (commands.length === 0) {
        handleSearchIcon(false);
        return;
      }

      const el = document.createElement("span");
      el.classList.add("searchTip");
      el.innerHTML = `<i class="fa-solid fa-clock-rotate-left"></i> 최근 사용한 명령 리스트`;
      elements.push(el);

      elements.push(...getCommandElement(commands));
      document.body.append(...elements);
      handleSearchIcon(false);
      return;
    }

    if (recentSearchString === searchString) {
      handleSearchIcon(false);
      return;
    }

    recentSearchString = searchString;

    const searchArgs = searchString.toLowerCase().split(" ");
    const commands = commandList
      .filter((command) => {
        return command.keywords
          .map(
            (keyword) =>
              !searchArgs.map((arg) => keyword.includes(arg)).some((e) => !e)
          )
          .some((e) => e === true);
      })
      .map((e) => {
        e.score = Math.max(
          ...e.keywords.map((keyword) => {
            const temp = String(keyword);
            searchArgs.forEach((arg) => temp.replace(arg, ""));
            return temp.length;
          })
        );

        return e;
      })
      .sort((a, b) => a.score - b.score);

    elements.push(...getCommandElement(commands));
    document.body.append(...elements);
    handleSearchIcon(false);
  };

  window.addEventListener("focus", () => {
    // View History
    if (!isOpen) {
      isOpen = true;
      handleSearchIcon(true);
      doSearch("");
    }
  });
});
