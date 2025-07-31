const wakscordApp = async () => {
  const APPLIED_MESSAGES = [];
  const URI_REGEX =
    /(http(s)?:\/\/|www.)([a-z0-9\w]+\.*)+[a-z0-9]{2,4}([\/a-z0-9-%#?&=\w])+(\.[a-z0-9]{2,4}(\?[\/a-z0-9-%#?&=\w]+)*)*/gi;
  const korean_name_to_english = {
    고세구: "gosegu",
    릴파: "lilpa",
    비챤: "viichan",
    아이네: "ine",
    우왁굳: "wakgood",
    주르르: "jururu",
    징버거: "jingburger",
    "": "",
  };

  //#region Article Fetch Area
  // helper: category_text 없으면 title_text에서 [] 내부 첫 매치를 사용
  const getPrefix = async () => {
    const catPromise = safeQuerySelector(".ArticleTitle .category_text").then(
      (el) => ({ type: "cat", el })
    );
    const titlePromise = safeQuerySelector(".ArticleTitle .title_text").then(
      (el) => ({ type: "title", el })
    );
    const { type, el } = await Promise.race([catPromise, titlePromise]);
    if (!el) {
      return "";
    }
    if (type === "cat" && el.innerText) {
      return el.innerText.replace(/ /g, "").replace(/\[|\]/g, "");
    }
    const title = el.innerText || "";
    const m = title.match(/\[([^\]]+)\]/);
    return m ? m[1] : "";
  };

  const fetchArticleContent = async () => {
    const rawArticle = await safeQuerySelectorAll(
      ".content .se-viewer .se-text-paragraph, .content .se-viewer .se-module-image img"
    );
    const prefix = await getPrefix();

    let article = rawArticle
      .map((e) => ({
        type: e.tagName === "IMG" ? "image" : "text",
        text: e.innerText
          .replace(/\n/g, "<br />")
          .replace(
            URI_REGEX,
            (matched) => `<a href="${matched}" target="__blank">${matched}</a>`
          ),
        imageSrc: e.src,
        href: e.querySelector("a")?.href,
        parentLinkData: e.parentElement?.getAttribute("data-linkdata"),
      }))
      .filter(
        (e) =>
          (e.type === "image" &&
            (e.imageSrc.startsWith("https://cdn.wakscord.xyz") ||
              e.imageSrc.startsWith("https://cdn.wakscord.com") ||
              e.imageSrc.startsWith("https://media.tenor.com"))) ||
          e.type == "text"
      )
      .filter(
        (e) =>
          (e.type === "text" && e.text !== "" && e.text !== "​") ||
          e.type == "image"
      )
      .filter((e) => (e.type === "image" && !!e.imageSrc) || e.type == "text");
    // .filter((e) => !e.text.includes('(사진)') && !e.text.includes('(이모티콘)')) // 사진, 이모티콘 메시지 제외
    if (prefix !== "단체") {
      article = article.filter(
        (e) => !e.text.includes("(사진)") && !e.text.includes("(이모티콘)")
      );
    }

    return article;
  };

  const isWakscord = async () => {
    if (
      !(
        window.location.href.includes("ArticleRead.nhn") ||
        window.location.href.includes("articles/")
      )
    ) {
      return false;
    }

    const boardLink = await safeQuerySelector("a.link_board");
    if (!boardLink) {
      throw new Error("Failed to find current article board");
    }

    const boardLinkInnerText = boardLink?.innerText?.replace(/ /g, "");

    if (boardLinkInnerText?.includes("고멤코드")) {
      return true;
    }

    if (!(await safeQuerySelector(".ArticleTitle .category_text"))) {
      return false;
    }

    return boardLinkInnerText?.includes("왁스코드") ?? false;
  };

  const authorizedFetch = async (url) => {
    return await fetch(url, { credentials: "include" });
  };

  const getArticle = async (articleId, clubid) => {
    const response = await authorizedFetch(
      `https://apis.naver.com/cafe-web/cafe-articleapi/v3/cafes/${clubid}/articles/${articleId}`
    );
    const json = await response.json();

    return json.result.article;
  };
  //#endregion

  const getAvatarUrl = (name) => {
    return `https://api.wakscord.com/v2/avatar/${name}`;
  };

  /**
   * 왁스코드 전용 CSS 추가
   */
  const applyCss = () => {
    console.log(`[WAKSCORD] Applying CSS`);
    const style = `
    .content .se-viewer .se-component {
      display: none !important;
    }

    .ArticleContentBox .ReplyBox {
      margin-top: 20px !important;
    }
  `;

    const el = document.createElement("style");
    el.innerText = style;
    document.head.appendChild(el);
  };

  /**
   * 왁스코드의 안내사항 등을 댓글 입력창의 placeholder로 설정
   */
  const setCommentBoxPlaceHolder = async () => {
    console.log(`[WAKSCORD] Setting Comment Box PlaceHolder`);
    const article = await fetchArticleContent();
    const content = article
      .filter((e) => e.type === "text" && e.text.startsWith("*"))
      .filter((e) => !e.text.includes("알잘딱 확장"))
      .map((e) =>
        e.text.replace(/댓글은/g, "메시지는").replace(/댓글/g, "메시지")
      )
      .join("\n");

    const CommentBox = await safeQuerySelector(
      ".CommentBox textarea.comment_inbox_text"
    );
    if (!CommentBox) {
      return;
    }

    CommentBox.placeholder = content;
    CommentBox.style.height = "69px";
  };

  /**
   * 알잘딱 기능임을 알리는 배너 추가
   */
  const addFuctionBanner = async () => {
    const { wakscord_banner_viewable } = await chrome.storage.local.get([
      "wakscord_banner_viewable",
    ]);
    if (!wakscord_banner_viewable) {
      return;
    }

    console.log(`[WAKSCORD] Adding Function Banner`);
    const element = document.createElement("dlv");
    element.innerHTML = `
    <img src="${chrome.runtime.getURL(
      "/src/cafe_extension/assets/logo-128.png"
    )}">
    <p>알잘딱 확장에서 자동으로 왁스코드 대화형 보기 기능을 활성화했습니다.</p>
  `;
    element.id = "alzartak_wakscord_banner";

    const mainContainer = await safeQuerySelector(".content");
    if (!mainContainer) {
      return;
    }

    mainContainer.appendChild(element);

    await chrome.storage.local.set({
      wakscord_banner_viewable: false,
    });
  };

  /**
   * 댓글창 위로
   */
  const setCommentPosition = async () => {
    console.log("[WAKSCORD] Setting Comment Position");
    const writer = await safeQuerySelector(".CommentWriter");
    if (!writer) {
      return;
    }

    writer.parentNode.firstChild.before(writer);
  };

  /**
   * 최신순 정렬
   */
  const setCommentNewest = async () => {
    console.log("[WAKSCORD] Setting Newest Comment");
    const liveButton = (
      await safeQuerySelectorAll(".comment_tab_button")
    ).filter((e) => e.innerHTML.includes("최신"))[0];
    if (!liveButton) {
      return;
    }

    liveButton.click();
  };

  const addAutoReloadMessage = async () => {
    console.log(`[WAKSCORD] Adding Auto Reload Message`);
    const button = await safeQuerySelector("button.comment_refresh_button");
    if (!!button) {
      const refresh_time = await safeQuerySelector(
        "#alzartak_comment_refresh_time"
      );
      if (!refresh_time) {
        const element = document.createElement("span");
        element.id = "alzartak_comment_refresh_time";
        element.style = "margin-left: 5px; color: #03c75a; font-size: 8pt;";
        element.innerText = "5초 간격으로 자동 새로고침 중!";

        button.parentElement.appendChild(element);
      }
    }
  };

  const replaceCommentText = async () => {
    console.log(`[WAKSCORD] Replacing Comment Text`);
    const commentText = await safeQuerySelector(
      ".CommentBox .comment_option .comment_title"
    );
    if (commentText) {
      commentText.innerText = "메시지";
    }

    const button = await safeQuerySelector(
      ".CommentBox .register_box a.btn_register"
    );
    if (button) {
      button.innerText = "전송";
    }
  };

  /**
   * 왁스코드 일반 코멘트 추가
   */
  const getWakscordComment = (username, comment, time) => {
    const element = document.createElement("div");
    element.classList.add("wakscord_comment");

    if (username.includes("공용")) {
      username = username.replace("공용", "");
      if (username.includes("신규")) {
        username = username.replace("신규", "");
        element.innerHTML = `
        <img class="avatar_everyone" src="${getAvatarUrl(username)}" />
        <span class="comment_everyone ${
          korean_name_to_english[username]
        }">${comment}</span>
        <span class="time">${time}</span>
      `;
      } else {
        element.innerHTML = `
        <img class="avatar_everyone_normal" src="${getAvatarUrl(username)}" />
        <span class="comment_everyone_normal ${
          korean_name_to_english[username]
        }">${comment}</span>
        <span class="time">${time}</span>
      `;
      }
    } else {
      element.innerHTML = `
      <img class="avatar" src="${getAvatarUrl(username)}" />
      <span class="comment">${comment}</span>
      <span class="time">${time}</span>
    `;
    }
    return element;
  };

  /**
   * 왁스코드 배너 추가
   */
  const getWakscordBanner = (banner) => {
    const element = document.createElement("img");
    element.classList.add("wakscord_banner");
    element.src = banner.imageSrc;

    if (typeof banner.parentLinkData === "string") {
      const data = JSON.parse(banner.parentLinkData);

      if (data.link) {
        element.style.cursor = "pointer";
        element.addEventListener("click", () => {
          window.open(data.link, "_blank");
        });
      }
    }

    return element;
  };

  /**
   * 왁스코드 이미지 코멘트 추가
   */
  const getWakscordImageComment = (username, image, time) => {
    const element = document.createElement("div");
    element.classList.add("wakscord_comment");
    if (username.includes("공용")) {
      username = username.replace("공용", "");
      if (username.includes("신규")) {
        username = username.replace("신규", "");
        element.innerHTML = `
        <img class="avatar_everyone" src="${getAvatarUrl(username)}" />
        <dlv class="comment_everyone ${
          korean_name_to_english[username]
        }"><img src="${image}" class="image"/></div>
        <span class="time">${time}</span>
        `;
      } else {
        element.innerHTML = `
        <img class="avatar_everyone_normal" src="${getAvatarUrl(username)}" />
        <dlv class="comment_everyone_normal ${
          korean_name_to_english[username]
        }"><img src="${image}" class="image"/></div>
        <span class="time">${time}</span>
        `;
      }
    } else {
      element.innerHTML = `
      <img class="avatar" src="${getAvatarUrl(username)}" />
      <dlv class="comment"><img src="${image}" class="image"/></dlv>
      <span class="time">${time}</span>
    `;
    }

    return element;
  };

  /**
   * 왁스코드 파일 코멘트 추가
   */
  const getWakscordFileComment = (username, file, time) => {
    const element = document.createElement("div");
    element.classList.add("wakscord_comment");
    if (username.includes("공용")) {
      username = username.replace("공용", "");
      if (username.includes("신규")) {
        username = username.replace("신규", "");
        element.innerHTML = `
        <img class="avatar_everyone" src="${getAvatarUrl(username)}" />
        <dlv class="comment_everyone ${
          korean_name_to_english[username]
        }"><a href="${file}" target="_blank"><i class="fa-solid fa-download"></i> 파일 다운로드</a></dlv>
        <span class="time">${time}</span>
        `;
      } else {
        element.innerHTML = `
        <img class="avatar_everyone_normal" src="${getAvatarUrl(username)}" />
        <dlv class="comment_everyone_normal ${
          korean_name_to_english[username]
        }"><a href="${file}" target="_blank"><i class="fa-solid fa-download"></i> 파일 다운로드</a></dlv>
        <span class="time">${time}</span>
        `;
      }
    } else {
      element.innerHTML = `
      <img class="avatar" src="${getAvatarUrl(username)}" />
      <dlv class="comment"><a href="${file}" target="_blank"><i class="fa-solid fa-download"></i> 파일 다운로드</a></dlv>
      <span class="time">${time}</span>
      `;
    }
    return element;
  };

  /**
   * 왁스코드 음성 코멘트 추가
   */
  const getWakscordVoiceComment = (username, file, time, ext) => {
    const element = document.createElement("div");
    element.classList.add("wakscord_comment");
    if (username.includes("공용")) {
      username = username.replace("공용", "");
      if (username.includes("신규")) {
        username = username.replace("신규", "");
        element.innerHTML = `
        <img class="avatar_everyone" src="${getAvatarUrl(username)}" />
        <dlv class="comment_everyone ${
          korean_name_to_english[username]
        }"><audio controls><source src="${file}" type="audio/${ext}" /> 음성</audio></dlv>
        <span class="time">${time}</span>
        `;
      } else {
        element.innerHTML = `
        <img class="avatar_everyone_normal" src="${getAvatarUrl(username)}" />
        <dlv class="comment_everyone_normal ${
          korean_name_to_english[username]
        }"><audio controls><source src="${file}" type="audio/${ext}" /> 음성</audio></dlv>
        <span class="time">${time}</span>
        `;
      }
    } else {
      element.innerHTML = `
      <img class="avatar" src="${getAvatarUrl(username)}" />
      <dlv class="comment"><audio controls><source src="${file}" type="audio/${ext}" /> 음성</audio></dlv>
      <span class="time">${time}</span>
      `;
    }
    return element;
  };

  /**
   * 왁스코드 댓글 컨테이너 추가
   */
  const createWakscordCommentContainer = async () => {
    console.log(`[WAKSCORD] Creating Comment Container`);
    const element = document.createElement("div");
    element.id = "wakscord_comment_container";

    const mainContainer = await safeQuerySelector(".content");
    if (!mainContainer) {
      return;
    }

    mainContainer.appendChild(element);
  };

  /**
   * 스트리머의 코멘트를 추가
   */
  const appendWakscordComment = async (isInit) => {
    // console.log(`[WAKSCORD] Appending Wakscord Comment`);
    const prefix = await getPrefix();
    let previous_name = "";

    if (!prefix) {
      return;
    }

    const article = (await fetchArticleContent())
      .filter((e) => !e.text.startsWith("START") && !e.text.startsWith("END")) // 시작, 끝 텍스트 제외
      .filter((e) => !e.text.startsWith("*")); // 안내 사항 제외

    const elements = article
      .filter(
        (e) =>
          !APPLIED_MESSAGES.some(
            (applied) =>
              applied.type === e.type &&
              applied.text === e.text &&
              applied.imageSrc === e.imageSrc &&
              applied.href === e.href
          )
      )
      .filter((e) => !/\/cafe\/banner*/.test(e.imageSrc))
      .map((e) => {
        console.log(e);
        APPLIED_MESSAGES.push(e);
        if (prefix === "단체") {
          let name;
          if (e.text.includes(":: ")) {
            name = e.text.split(":: ")[0].split("]")[1].trim();
          } else {
            name = "";
          }

          // console.log(name);
          let input_name;
          if (name !== previous_name && name !== "") {
            input_name = "공용신규" + name;
            previous_name = name;
          } else {
            input_name = "공용" + previous_name;
          }
          // console.log(input_name);
          if (e.type === "image") {
            return getWakscordImageComment(input_name, e.imageSrc, "");
          }

          if (!!e.href) {
            const extension = e.href.split(".").pop();
            if (extension === "ogg") {
              return getWakscordVoiceComment(input_name, e.href, "", "ogg");
            }

            if (extension === "mp3") {
              return getWakscordVoiceComment(input_name, e.href, "", "mp3");
            }

            return getWakscordFileComment(input_name, e.href, "");
          }

          const splited = e.text.split(" ");
          const time = splited[0].replace("[", "").replace("]", "");
          let content = splited.slice(1).join(" ");
          if (content.includes("::")) {
            content = content.split("::")[1].trim();
          }
          return getWakscordComment(input_name, content, time);
        } else {
          if (e.type === "image") {
            return getWakscordImageComment(prefix, e.imageSrc, "");
          }

          if (!!e.href) {
            const extension = e.href.split(".").pop();
            if (extension === "ogg") {
              return getWakscordVoiceComment(prefix, e.href, "", "ogg");
            }

            if (extension === "mp3") {
              return getWakscordVoiceComment(prefix, e.href, "", "mp3");
            }

            return getWakscordFileComment(prefix, e.href, "");
          }

          const splited = e.text.split(" ");
          const time = splited[0].replace("[", "").replace("]", "");
          const content = splited.slice(1).join(" ");

          return getWakscordComment(prefix, content, time);
        }
      })
      .map((e) => {
        if (isInit) {
          e.classList.add("wakscord_comment_anime_disabled");
        }

        return e;
      });

    const container = await safeQuerySelector("#wakscord_comment_container");
    if (!container) {
      return;
    }

    container.append(...elements);

    const banner = article.filter((e) => /\/cafe\/banner*/.test(e.imageSrc))[0];
    if (!!banner) {
      if (container.parentElement.querySelector(".wakscord_banner")) {
        return;
      }

      const bannerElement = getWakscordBanner(banner);
      container.parentElement.insertBefore(bannerElement, container);
    }
  };

  /**
   * 세션 종료 코멘트 추가
   */
  const appendEndComment = async () => {
    console.log(`[WAKSCORD] Appending Wakscord END Comment`);
    const prefix = await getPrefix();

    const article = (await fetchArticleContent()).filter((e) =>
      e.text.startsWith("END")
    );

    if (article.length === 0) {
      return;
    }

    const endDate = article[0].text.replace("END", "").trim();
    let element = getWakscordComment(
      "우왁굳",
      `대화가 종료되었습니다.`,
      endDate
    ); // 우왁굳 -> tempory
    if (prefix === "비챤" && Math.random() > 0.8) {
      element = getWakscordComment(
        "비챤",
        `비챤님이 채팅방을 나갔스비다.`,
        endDate
      );
    }

    element.classList.add("wakscord_danger_comment");

    const container = await safeQuerySelector("#wakscord_comment_container");
    if (!container) {
      return;
    }

    container.append(element);
  };

  const getCurrentArticleId = () => {
    if (
      !["ArticleRead.nhn", "/articles/"].some((x) =>
        document.location.href.includes(x)
      )
    ) {
      return null;
    }

    const url = new URL(window.location.href);
    const args = url.pathname
      .split("/")
      .filter((e) => !Number.isNaN(Number(e)) && e !== "");
    const currentArticleId = Number(args[1]);
    const clubid = Number(args[0]);
    return [clubid, currentArticleId];
  };

  const articleUpdateJob = async () => {
    const [clubid, articleId] = getCurrentArticleId();
    if (!articleId || !clubid) {
      return;
    }

    const article = await getArticle(articleId, clubid);
    const parent = await safeQuerySelector(".article_viewer .content");
    const oldContent = await safeQuerySelector(
      ".article_viewer .content .se-viewer"
    );
    oldContent.remove();
    parent.insertAdjacentHTML("beforeend", article.contentHtml);

    /**
     * @type {HTMLButtonElement}
     */
    const button = await safeQuerySelector("button.comment_refresh_button");
    if (!!button) {
      button.click();
    }

    // console.log('[WAKSCORD] Article Updated');
  };

  const init = async () => {
    if (!(await isWakscord())) {
      return;
    }

    applyCss();
    await addFuctionBanner();

    await createWakscordCommentContainer();
    await appendWakscordComment(true);
    await appendEndComment();

    setTimeout(async () => {
      await Promise.race([
        setCommentBoxPlaceHolder(),
        replaceCommentText(),
        setCommentPosition(),
        setCommentNewest(),
        addAutoReloadMessage(),
      ]);
    }, 0);

    setTimeout(() => {
      setInterval(async () => {
        await articleUpdateJob();
        await appendWakscordComment();
      }, 5000);
    }, 3000);
  };

  await init();
};

(async () => {
  if (window.name !== "cafe_main") return;
  const { wakscord_ui } = await chrome.storage.local.get(["wakscord_ui"]);
  if (!wakscord_ui) {
    return;
  }

  await wakscordApp();
})();
