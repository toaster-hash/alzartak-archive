// document.documentElement.classList.add("loading");

// 전역 변수로 memberKey 상태 관리
let userProfilePromise;

// 로컬스토리지 관련 함수 추가
function saveReportToLocalStorage(type, id) {
  try {
    // 로컬스토리지에서 기존 신고 내역 가져오기
    const reports = JSON.parse(
      localStorage.getItem("submittedReports") || "[]"
    );

    // 새 신고 내역 추가
    reports.push({ type, id, timestamp: new Date().getTime() });

    // 로컬스토리지에 저장
    localStorage.setItem("submittedReports", JSON.stringify(reports));
    return true;
  } catch (error) {
    console.error("로컬스토리지 저장 오류:", error);
    return false;
  }
}

// 이미 신고한 내역인지 확인하는 함수
function isAlreadyReported(type, id) {
  try {
    // 로컬스토리지에서 기존 신고 내역 가져오기
    const reports = JSON.parse(
      localStorage.getItem("submittedReports") || "[]"
    );

    // 동일한 type, id로 신고한 내역이 있는지 확인
    return reports.some((report) => report.type === type && report.id === id);
  } catch (error) {
    console.error("로컬스토리지 확인 오류:", error);
    return false;
  }
}

window.reportData = {
  reasons: {
    article: [
      "욕설/비속어",
      "비방",
      "광고",
      "댓글 논쟁 및 다툼",
      "왁물원 외 커뮤 언급",
      "기타",
    ],
    comment: ["욕설/비속어", "비방", "광고", "왁물원 외 커뮤 언급", "기타"],
    profile: ["부적절한 프로필"],
  },
  params: new URLSearchParams(window.location.search),
  get type() {
    return this.params.get("type") || "article";
  },
  get author() {
    return this.params.get("author") || "";
  },
  get content() {
    return this.params.get("content") || "";
  },
  get level() {
    return this.params.get("level") || "";
  },
};

async function getProfile() {
  try {
    const res = await fetch(
      "https://apis.naver.com/cafe-web/cafe-cafemain-api/v1.0/cafes/27842958/my",
      { credentials: "include" }
    );

    const data = await res.json();
    const memberKey = data?.result?.memberKey;

    return memberKey;
  } catch (error) {
    return null;
  }
}

// 페이지 초기화와 함께 즉시 사용자 정보를 로드하는 함수
function initUserProfile() {
  // 즉시 사용자 정보 요청 시작 (Promise 저장)
  userProfilePromise = getProfile();

  // 비동기로 사용자 정보 확인 후 처리
  userProfilePromise.then((memberKey) => {
    if (!memberKey) {
      // 로그인되지 않은 경우 즉시 오류 창 표시
      setResultPage(
        false,
        "로그인이 필요해요",
        "신고를 보내기 위해서는 네이버 로그인이 필요합니다.\n로그인 후 다시 시도해주세요."
      );
    }
    // 로딩 상태 제거 (로그인 여부와 상관없이)
    // document.body.classList.remove("loading");
  });
}

// 페이지 로드 즉시 사용자 정보 확인 시작
initUserProfile();

async function sendReport(type, id, reasonType, reason) {
  // 이미 가져온 memberKey를 사용
  const memberKey = await userProfilePromise;

  if (!memberKey) {
    return -1;
  }

  const timestamp = new Date().getTime();
  const data = {
    type,
    id,
    reasonType,
    reason,
    memberKey,
  };

  const res = await fetch("https://report.waktaver.se/report", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Hash: sha256(JSON.stringify(data) + timestamp),
      Timestamp: timestamp,
    },
    body: JSON.stringify(data),
  });

  if (res.ok) {
    return 1;
  } else {
    return 0;
  }
}

function setResultPage(complete, heading, text) {
  const mainContainer = document.querySelector("#main-container");
  const resultContainer = document.querySelector("#result-container");

  const completeIcon = document.querySelector("#result-complete");
  const errorIcon = document.querySelector("#result-error");

  const resultHeading = document.querySelector("#result-heading");
  const resultText = document.querySelector("#result-text");

  const footerButton = document.querySelector(".fotter-button");

  mainContainer.classList.add("hidden");
  resultContainer.classList.remove("hidden");

  footerButton.classList.add("end");
  footerButton.classList.remove("fotter-button-disabled");
  footerButton.textContent = "닫기";
  footerButton.addEventListener("click", () => {
    window.close();
  });

  if (complete) {
    completeIcon.classList.add("result-icon-enabled");
    errorIcon.classList.remove("result-icon-enabled");
  } else {
    completeIcon.classList.remove("result-icon-enabled");
    errorIcon.classList.add("result-icon-enabled");
  }

  resultHeading.textContent = heading;
  resultText.textContent = text;
}

document.addEventListener("DOMContentLoaded", function () {
  const data = window.reportData;
  const type = data.type;
  const id = data.params.get("id");

  // 이미 신고한 내역인지 확인
  if (isAlreadyReported(type, id)) {
    // 이미 신고한 경우 오류 페이지 표시
    setResultPage(
      false,
      "이미 신고한 내용입니다",
      "동일한 내용에 대해 이미 신고를 제출하셨습니다.\n중복 신고는 처리되지 않습니다."
    );
    return; // 추가 코드 실행 방지
  }

  // 타입 텍스트 설정
  document.getElementById("type-text").textContent =
    data.type === "article"
      ? "게시글"
      : data.type === "profile"
        ? "프로필"
        : "댓글";

  // 작성자 정보 설정
  if (data.level === "0") {
    document.getElementById("author-container").innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 12" width="20" height="20"><path fill="#58B721" d="M9.683 5.064C8.328 6.204 5.2 6.71 5.2 6.71s.967-3.091 2.322-4.232c1.355-1.14 2.403-1.034 3-.32.598.713.516 1.764-.839 2.905z"/><path fill="#58B721" d="M5.2 6.833a.122.122 0 01-.116-.16c.189-.578.409-1.146.658-1.701.553-1.232 1.125-2.1 1.7-2.587 1.26-1.06 2.446-1.174 3.174-.307.334.383.46.906.338 1.4-.13.558-.53 1.123-1.192 1.679-.575.484-1.516.913-2.795 1.275a17.557 17.557 0 01-1.767.401zm4.196-5.09c-.526 0-1.14.278-1.795.83-1.119.942-1.983 3.289-2.22 3.982.71-.134 3.106-.643 4.224-1.584.62-.521.993-1.042 1.11-1.546a1.32 1.32 0 00-.287-1.187 1.302 1.302 0 00-1.032-.496z"/><path fill="#58B721" d="M2.174 5.448C3.31 6.404 5.88 6.892 5.88 6.892S5.014 4.366 3.878 3.41c-1.136-.956-1.99-.896-2.46-.333-.471.563-.38 1.414.756 2.37z"/><path fill="#58B721" d="M5.88 7.04c-.009 0-.018 0-.027-.002-.107-.02-2.623-.505-3.775-1.475C.999 4.655.709 3.69 1.303 2.981c.28-.335.663-.493 1.108-.456.476.04 1.003.299 1.564.771 1.154.972 2.011 3.442 2.047 3.547a.15.15 0 01-.142.198zM2.27 5.336c.883.743 2.7 1.203 3.376 1.356-.25-.656-.98-2.419-1.864-3.163-.512-.431-.982-.667-1.395-.7a.95.95 0 00-.855.35c-.48.574-.21 1.36.738 2.16v-.003z"/><path fill="#58B721" d="M6.19 6.197H5.097v4.176H6.19V6.197z"/><path fill="#58B721" d="M6.19 10.5H5.097a.127.127 0 01-.127-.127V6.197a.127.127 0 01.127-.127H6.19a.126.126 0 01.127.127v4.178a.127.127 0 01-.127.125zm-.967-.254h.84V6.324h-.84v3.922z"/></symbol>
      <span class="text-black">${data.author}</span>
    `;
  } else {
    document.getElementById("author-container").innerHTML = `
      <div class="profile-badge profile-badge-${data.level}">
        ${data.level}
      </div>
      <span class="text-black">${data.author}</span>
    `;
  }

  // 콘텐츠 타입 라벨 설정
  const contentTypeLabel = document.getElementById("content-type-label");

  if (data.type === "profile") {
    contentTypeLabel.parentElement.classList.add("hidden");
  } else {
    document.getElementById("content-type-label").textContent =
      data.type === "article" ? "글 제목" : "댓글 내용";
  }

  // 콘텐츠 텍스트 설정
  document.getElementById("content-text").textContent = data.content;

  // 사유 버튼 생성
  const reasonsContainer = document.getElementById("reason-buttons-container");
  data.reasons[data.type].forEach((reason, index) => {
    reasonsContainer.innerHTML += `
        <button class="reason-button" id="reason-button-${index}">
          <div class="reason-button-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" class="reason-button-icon-svg">
              <path d="M7.95783 12.625L15.0203 5.5625C15.187 5.39583 15.3814 5.3125 15.6037 5.3125C15.8259 5.3125 16.0203 5.39583 16.187 5.5625C16.3537 5.72917 16.437 5.92722 16.437 6.15667C16.437 6.38611 16.3537 6.58389 16.187 6.75L8.54117 14.4167C8.3745 14.5833 8.18005 14.6667 7.95783 14.6667C7.73561 14.6667 7.54117 14.5833 7.3745 14.4167L3.79117 10.8333C3.6245 10.6667 3.5445 10.4689 3.55117 10.24C3.55783 10.0111 3.64478 9.81306 3.812 9.64583C3.97922 9.47861 4.17728 9.39528 4.40617 9.39583C4.63505 9.39639 4.83283 9.47972 4.9995 9.64583L7.95783 12.625Z" fill="white"/>
            </svg>
          </div>
          <span class="text-black">${reason}</span>
        </button>
      `;
  });

  // 이벤트 리스너 설정
  const reasonButtons = document.querySelectorAll(".reason-button");
  const reasonInput = document.querySelector(".reason-input");
  const footerButton = document.querySelector(".fotter-button");

  reasonButtons.forEach((button) => {
    button.addEventListener("click", () => {
      reasonButtons.forEach((btn) => {
        btn.classList.remove("reason-button-selected");
      });

      button.classList.add("reason-button-selected");
    });
  });

  footerButton.addEventListener("click", async (e) => {
    if (
      e.target.classList.contains("fotter-button-disabled") ||
      e.target.classList.contains("end")
    ) {
      return;
    }

    const type = data.type;
    const id = data.params.get("id");
    const reason = reasonInput.value;
    const reasonIndex = Array.from(reasonButtons).findIndex((button) =>
      button.classList.contains("reason-button-selected")
    );
    const reasonType = data.reasons[type][reasonIndex];

    if (!reasonType) {
      alert("신고 사유를 선택해주세요.");
      return;
    }

    if (!type || !id || !reasonType) {
      alert("파라미터가 올바르지 않습니다.");
      window.close();
      return;
    }

    if (reason.length < 10) {
      alert("신고 사유를 10자 이상 입력해주세요.");
      return;
    }

    // 제출 전에도 한 번 더 중복 신고 여부 확인
    if (isAlreadyReported(type, id)) {
      setResultPage(
        false,
        "이미 신고한 내용입니다",
        "동일한 내용에 대해 이미 신고를 제출하셨습니다.\n중복 신고는 처리되지 않습니다."
      );
      return;
    }

    e.target.classList.add("fotter-button-disabled");

    // 로그인 상태 다시 확인 (버튼 클릭 시점에서 재확인)
    const memberKey = await userProfilePromise;
    if (!memberKey) {
      setResultPage(
        false,
        "로그인이 필요해요",
        "신고를 보내기 위해서는 네이버 로그인이 필요합니다.\n로그인 후 다시 시도해주세요."
      );
      return;
    }

    sendReport(type, id, reasonType, reason)
      .then((ok) => {
        if (ok === -1) {
          setResultPage(
            false,
            "로그인이 필요해요",
            "신고를 보내기 위해서는 네이버 로그인이 필요합니다.\n로그인 후 다시 시도해주세요."
          );
        } else if (ok === 1) {
          // 신고 성공 시 로컬스토리지에 저장
          saveReportToLocalStorage(type, id);

          setResultPage(
            true,
            "신고를 완료했어요",
            "클린한 왁물원을 만드는 데 도움을 주셔서 감사합니다.\n제보해주신 내용은 면밀히 검토해보겠습니다."
          );
        } else {
          setResultPage(
            false,
            "오류가 발생했어요 [0]",
            "신고를 보내는 도중 오류가 발생했습니다.\n잠시 후 다시 시도해주세요."
          );
        }
      })
      .catch((error) => {
        console.error("Error:", error);
        setResultPage(
          false,
          "오류가 발생했어요 [1]",
          "신고를 보내는 도중 오류가 발생했습니다.\n잠시 후 다시 시도해주세요."
        );
      });
  });
});
