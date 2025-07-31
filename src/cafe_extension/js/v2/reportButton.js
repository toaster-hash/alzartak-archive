const IS_ALZARTAK = true;

(async () => {
  // 이 스크립트는 'cafe_main' iframe 내부에서만 실행됩니다.
  if (window.name !== "cafe_main") {
    return;
  }

  // 왁물원에서만 실행
  if (
    !(
      window.location.href.includes("27842958") ||
      window.location.href.includes("steamindiegame")
    )
  ) {
    return;
  }

  if (IS_ALZARTAK) {
    const { disable_report_button } = await chrome.storage.local.get([
      "disable_report_button",
    ]);
    if (disable_report_button) {
      return;
    }
  }

  // --- Helper Functions ---

  /**
   * 지정된 셀렉터에 해당하는 요소를 안전하게 찾습니다.
   * 요소가 즉시 발견되지 않으면 최대 limit 회까지 100ms 간격으로 재시도합니다.
   * @param {string} selector - 찾을 CSS 셀렉터
   * @param {Element} [parentElement=document] - 검색을 시작할 부모 요소 (기본값: document)
   * @param {number} [limit=10] - 최대 재시도 횟수
   * @param {number} [current=0] - 현재 재시도 횟수 (내부 사용)
   * @returns {Promise<Element|null>} 찾은 요소 또는 null
   */
  const safeQuerySelector = async (
    selector,
    parentElement = document,
    limit = 10,
    current = 0
  ) => {
    if (current > limit) {
      // console.warn(`[Report Button] 요소 찾기 실패 (최대 시도 초과): ${selector}`);
      return null;
    }
    const result = parentElement.querySelector(selector);
    if (result) {
      return result;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
    return await safeQuerySelector(selector, parentElement, limit, current + 1);
  };

  /**
   * 현재 페이지 URL에서 게시글 ID를 추출합니다.
   * @returns {string|null} 게시글 ID 또는 null
   */
  const getArticleIdFromUrl = () => {
    const url = new URL(window.location.href);
    let articleId = url.searchParams.get("articleid");
    if (articleId) {
      return articleId;
    }
    const pathParts = url.pathname
      .split("/")
      .filter((part) => !isNaN(parseInt(part)) && part !== "");
    if (pathParts.length >= 2) {
      return pathParts[1];
    }
    console.warn("[Report Button] URL에서 게시글 ID를 추출할 수 없습니다.");
    return null;
  };

  /**
   * URL에서 프로필 ID를 추출합니다.
   * @returns {string|null} 프로필 ID 또는 null
   */
  const getProfileIdFromUrl = () => {
    const url = new URL(window.location.href);

    // 1. 직접 URL 경로에서 추출 시도
    if (url.pathname.includes("/members/")) {
      const matches = url.pathname.match(/\/members\/([^\/\?#]+)/);
      if (matches && matches[1]) {
        return matches[1];
      }
    }

    // 2. iframe_url_utf8 파라미터에서 추출 시도
    const iframeUrl = url.searchParams.get("iframe_url_utf8");
    if (iframeUrl) {
      try {
        const decodedUrl = decodeURIComponent(iframeUrl);
        const matches = decodedUrl.match(/\/members\/([^\/\?#]+)/);
        if (matches && matches[1]) {
          return matches[1];
        }
      } catch (e) {
        console.error("[Report Button] iframe URL 디코딩 오류:", e);
      }
    }

    console.warn("[Report Button] URL에서 프로필 ID를 추출할 수 없습니다.");
    return null;
  };

  /**
   * LevelIcon의 style 속성에서 레벨 코드를 추출하고 숫자 레벨로 변환합니다.
   * @param {string} styleAttribute - LevelIcon 요소의 style.backgroundImage 값
   * @returns {number} 변환된 숫자 레벨 (0-7), 실패 시 -1
   */
  const getLevelFromStyle = (styleAttribute) => {
    if (!styleAttribute) return -1;
    // 정규 표현식을 사용하여 "#" 뒤의 레벨 코드를 추출합니다. 예: "1_1", "1_110"
    const match = styleAttribute.match(/#(\d_\d{1,3})-usage/);
    if (!match || !match[1]) return -1;

    const levelCode = match[1];
    const levelMap = {
      "1_1": 0, // 아메바
      "1_110": 1, // 진드기
      "1_120": 2, // 닭둘기
      "1_130": 3, // 왁무새
      "1_140": 4, // 침팬치
      "1_150": "V", // 느그자
      "1_888": "S", // 카페스탭
      "1_999": "M", // 매니저
    };

    return levelMap[levelCode] ?? -1; // 매핑된 값이 없으면 -1 반환
  };

  /**
   * 신고 팝업 창을 엽니다.
   * @param {string} type - 신고 유형 ('article' 또는 'comment')
   * @param {string} id - 신고 대상 ID (게시글: articleId, 댓글: articleId-commentId)
   * @param {string} author - 작성자 닉네임
   * @param {string} content - 내용 (게시글 제목 또는 댓글 내용)
   * @param {number} level - 작성자 레벨 (숫자)
   */
  const openReportPopup = (type, id, author, content, level) => {
    try {
      if (!id) {
        alert(
          "신고 대상 ID를 가져올 수 없습니다. 페이지를 새로고침하거나 개발자에게 문의해주세요."
        );
        console.error(
          `[Report Button] 유효하지 않은 ID (${id}) 로 팝업 호출 시도됨. 타입: ${type}`
        );
        return;
      }

      const queryParams = new URLSearchParams();
      queryParams.set("type", type);
      queryParams.set("id", id);
      queryParams.set("author", author);
      queryParams.set("content", content);
      queryParams.set("level", level.toString());

      const reportBaseUrl = chrome.runtime.getURL(
        IS_ALZARTAK ? "src/report/report.html" : "report.html"
      );
      const popupUrl = `${reportBaseUrl}?${queryParams.toString()}`;
      console.log(`[Report Button] ${type} 신고 팝업 URL: ${popupUrl}`);

      window.open(popupUrl, "_blank", "width=480,height=770");
    } catch (error) {
      console.error(
        `[Report Button] ${type} 신고 팝업 열기 중 오류 발생:`,
        error
      );
      alert(
        "신고 팝업을 여는 중 오류가 발생했습니다. 콘솔 로그를 확인해주세요."
      );
    }
  };

  // --- 게시글 신고 버튼 추가 로직 ---
  const addArticleReportButton = async () => {
    // 현재 페이지가 게시글 읽기 페이지인지 확인 (댓글 기능과 분리)
    const isArticlePage =
      document.location.href.includes("ArticleRead.nhn") ||
      document.location.href.includes("/articles/");
    if (!isArticlePage) {
      return; // 게시글 페이지 아니면 종료
    }

    const articleHeader = await safeQuerySelector(".article_header");
    const buttonArea = await safeQuerySelector(".right_area");

    if (!articleHeader || !buttonArea) {
      return;
    }

    // 이미 버튼이 있는지 확인 (중복 추가 방지)
    if (buttonArea.querySelector(".alzartak-report-button.article")) {
      return;
    }

    const reportButton = document.createElement("button");
    reportButton.className = "alzartak-report-button article"; // 클래스명으로 구분
    reportButton.innerText = "게시글 신고";

    Object.assign(reportButton.style, {
      marginLeft: "10px",
      height: "36px",
      padding: "0 12px",
      backgroundColor: "#ff5c57",
      color: "white",
      border: "none",
      borderRadius: "6px",
      cursor: "pointer",
      zIndex: "1000",
      fontWeight: "bold",
      paddingBottom: "2px",
    });

    articleHeader.style.position = "relative"; // 기준점 설정

    reportButton.addEventListener("click", async (event) => {
      event.stopPropagation(); // 이벤트 버블링 방지

      const nicknameElement = await safeQuerySelector(
        ".nickname",
        articleHeader
      );
      const titleElement = await safeQuerySelector(
        "h3.title_text",
        articleHeader.closest(".ArticleContentBox") ?? document
      ); // 제목은 헤더 바깥에 있을 수 있음
      const levelIconElement = await safeQuerySelector(
        ".LevelIcon",
        articleHeader
      ); // LevelIcon 검색
      const articleId = getArticleIdFromUrl(); // 게시글 ID 가져오기

      const authorName = nicknameElement
        ? nicknameElement.innerText.trim()
        : "";
      const contentText = titleElement ? titleElement.innerText.trim() : "";
      // LevelIcon의 style 속성에서 레벨 추출
      const level = levelIconElement
        ? getLevelFromStyle(levelIconElement.style.backgroundImage)
        : -1;

      openReportPopup("article", articleId, authorName, contentText, level);
    });

    buttonArea.appendChild(reportButton);
  };

  // --- 댓글 신고 버튼 추가 로직 ---
  const addCommentReportButton = async (commentElement) => {
    // 1. 댓글 요소 내에서 필요한 정보 찾기
    const commentTool = commentElement.querySelector(".comment_tool");
    if (!commentTool) return; // 댓글 툴 없으면 처리 불가

    // 버튼 위치 기준점 찾기 (comment_tool의 부모의 부모)
    const buttonContainer = commentElement.querySelector(".comment_nick_info");
    if (!buttonContainer) return;

    // 이미 버튼이 있는지 확인 (중복 추가 방지)
    if (buttonContainer.querySelector(".alzartak-report-button.comment")) {
      return;
    }

    // 2. 버튼 생성 및 스타일링
    const reportButton = document.createElement("button");
    reportButton.className = "alzartak-report-button comment"; // 클래스명으로 구분
    reportButton.innerText = "댓글 신고";

    Object.assign(reportButton.style, {
      position: "absolute",
      top: "-1px", // 상단에 붙임
      right: "-84px", // 우측에서 32px (기존 더보기 버튼 옆)
      width: "max-content",
      padding: "2px 8px", // 크기 약간 줄임
      backgroundColor: "rgba(255, 92, 87, 0.8)", // 약간 투명하게
      color: "white",
      border: "none",
      borderRadius: "4px",
      cursor: "pointer",
      zIndex: "999", // 댓글 내 다른 요소보다 위에
      fontSize: "11px",
      fontWeight: "bold",
    });

    // 기준점에 relative 설정 (이미 설정되어 있을 수 있지만 안전하게)
    buttonContainer.style.position = "relative";

    // 3. 버튼 클릭 시 동작 정의
    reportButton.addEventListener("click", async (event) => {
      event.stopPropagation(); // 이벤트 버블링 방지

      const articleId = getArticleIdFromUrl(); // 게시글 ID는 공통
      const commentId = commentElement.id; // 댓글 li 요소의 ID 사용

      if (!articleId || !commentId) {
        alert("게시글 또는 댓글 ID를 가져올 수 없습니다.");
        console.error(
          `[Report Button] 댓글 신고 ID 오류: articleId=${articleId}, commentId=${commentId}`
        );
        return;
      }

      const reportId = `${articleId}-${commentId}`; // ID 조합

      const nicknameElement = await safeQuerySelector(
        ".comment_nickname",
        commentElement
      );
      const contentElement = await safeQuerySelector(
        ".comment_text_view .text_comment",
        commentElement
      );
      const levelIconElement = await safeQuerySelector(
        ".LevelIcon",
        commentElement
      );

      const authorName = nicknameElement
        ? nicknameElement.innerText.trim()
        : "";
      // 댓글 내용은 여러 span으로 나뉠 수 있으므로 textContent 사용 고려
      const contentText = contentElement
        ? contentElement.textContent.trim()
        : "";
      // LevelIcon의 style 속성에서 레벨 추출
      const level = levelIconElement
        ? getLevelFromStyle(levelIconElement.style.backgroundImage)
        : -1;

      openReportPopup("comment", reportId, authorName, contentText, level);
    });

    // 4. 버튼 추가
    buttonContainer.appendChild(reportButton);
  };

  const addProfileReportButton = async () => {
    // 프로필 페이지인지 확인
    const isProfilePage =
      window.location.href.includes("/members/") ||
      (window.location.href.includes("iframe_url_utf8") &&
        decodeURIComponent(window.location.href).includes("/members/"));

    if (!isProfilePage) {
      return; // 프로필 페이지가 아니면 종료
    }

    // 프로필 헤더 찾기
    const profileHeader = await safeQuerySelector(".subscript_area");
    if (!profileHeader) {
      return;
    }

    // 이미 버튼이 있는지 확인 (중복 추가 방지)
    if (profileHeader.querySelector(".alzartak-report-button.profile")) {
      return;
    }

    // 버튼 생성 및 스타일링
    const reportButton = document.createElement("button");
    reportButton.className = "alzartak-report-button profile";
    reportButton.innerText = "프로필 신고";

    Object.assign(reportButton.style, {
      marginLeft: "6px",
      padding: "0 14px",
      height: "32px",
      backgroundColor: "#ff5c57",
      color: "white",
      border: "none",
      borderRadius: "16px",
      cursor: "pointer",
      fontSize: "12px",
      fontWeight: "bold",
    });

    // 프로필 ID 추출
    const profileId = getProfileIdFromUrl();
    if (!profileId) {
      console.error(
        "[Report Button] 프로필 ID를 추출할 수 없어 버튼을 추가하지 않습니다."
      );
      return;
    }

    // 버튼 클릭 이벤트 설정
    reportButton.addEventListener("click", async (event) => {
      event.stopPropagation(); // 이벤트 버블링 방지

      // 프로필 정보 요소 찾기
      const nicknameElement = await safeQuerySelector(".nick_btn");
      const levelIconElement = await safeQuerySelector(".icon_level");

      const authorName = nicknameElement
        ? nicknameElement.innerText.trim()
        : "";
      const contentText = authorName; // 프로필에서는 작성자명이 내용과 동일

      // 레벨 추출
      const level = levelIconElement
        ? getLevelFromStyle(levelIconElement.style.backgroundImage)
        : -1;

      // 신고 팝업 열기
      openReportPopup("profile", profileId, authorName, contentText, level);
    });

    // 버튼 추가
    profileHeader.appendChild(reportButton);
  };

  // --- 댓글 동적 로딩 처리 (MutationObserver) ---
  const observeComments = () => {
    const commentListContainer = document.querySelector(".comment_list"); // 댓글 목록 컨테이너
    if (!commentListContainer) {
      // 잠시 후 다시 시도
      setTimeout(observeComments, 500);
      return;
    }

    const observer = new MutationObserver((mutationsList) => {
      for (const mutation of mutationsList) {
        if (mutation.type === "childList") {
          mutation.addedNodes.forEach((node) => {
            // 추가된 노드가 li.CommentItem 인지 확인
            if (
              node.nodeType === Node.ELEMENT_NODE &&
              node.matches("li.CommentItem")
            ) {
              addCommentReportButton(node); // 새 댓글에 버튼 추가
            }
            // 추가된 노드 내부에 CommentItem이 있을 수도 있음 (예: 더보기로 여러개 로드)
            else if (node.nodeType === Node.ELEMENT_NODE) {
              node.querySelectorAll("li.CommentItem").forEach((commentItem) => {
                addCommentReportButton(commentItem);
              });
            }
          });
        }
      }
    });

    observer.observe(commentListContainer, { childList: true, subtree: true }); // 자식 노드 추가/삭제 및 하위 트리 변경 감지

    // 초기 로드된 댓글에도 버튼 추가
    commentListContainer
      .querySelectorAll("li.CommentItem")
      .forEach((commentElement) => {
        addCommentReportButton(commentElement);
      });
  };

  // --- 실행 ---

  // 페이지 로딩 상태 확인 후 실행
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      addArticleReportButton(); // 게시글 버튼 추가 시도
      addProfileReportButton(); // 프로필 버튼 추가 시도
      observeComments(); // 댓글 Observer 시작 및 초기 버튼 추가
    });
  } else {
    addArticleReportButton(); // 게시글 버튼 추가 시도
    addProfileReportButton(); // 프로필 버튼 추가 시도
    observeComments(); // 댓글 Observer 시작 및 초기 버튼 추가
  }
})();
