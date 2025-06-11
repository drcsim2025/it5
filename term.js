document.addEventListener("DOMContentLoaded", () => {
  // 다크모드 상태 복원
  if (sessionStorage.getItem("darkMode") === "on") {
    document.body.classList.add("dark-mode");
    toggleDarkBtn.setAttribute("aria-pressed", true);
  } else {
    toggleDarkBtn.setAttribute("aria-pressed", false);
  }

  if (typeof terms === "undefined") {
    console.error("terms 배열이 정의되지 않았습니다.");
    return;
  }

  renderTerms(terms);
  setupSearch(terms);
  setupQuiz(terms);
});

// 퀴즈 데이터 (같은 용어들로 문제+보기 구성)
// 각 문제는 정답인 인덱스를 맞게 섞어서 설정
let quizData = [];

function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

// 퀴즈 생성: terms중 랜덤 5문제를 뽑아 보기 4개씩 섞어서 만듦
function generateQuizData() {
  quizData = [];
  const shuffledTerms = [...terms];
  shuffleArray(shuffledTerms);
  const pickCount = Math.min(5, shuffledTerms.length);
  for (let i = 0; i < pickCount; i++) {
    const question = shuffledTerms[i].term;
    const answer = shuffledTerms[i].desc;

    // 보기 3개 랜덤으로 추출 (정답 제외)
    let options = [answer];
    const others = terms.filter((t) => t.term !== question);
    shuffleArray(others);
    for (let j = 0; j < 3; j++) {
      options.push(others[j].desc);
    }
    shuffleArray(options);

    const answerIndex = options.indexOf(answer);

    quizData.push({
      question,
      options,
      answer: answerIndex,
    });
  }
}

// UI 요소 참조
const menuBtn = document.getElementById("menuBtn");
const menuBox = document.getElementById("menuBox");
const showTermsBtn = document.getElementById("showTermsBtn");
const showQuizBtn = document.getElementById("showQuizBtn");
const toggleDarkBtn = document.getElementById("toggleDarkBtn");
const contentArea = document.getElementById("contentArea");
const searchBox = document.getElementById("searchBox");
const searchBtn = document.getElementById("searchBtn");
const autocompleteList = document.getElementById("autocompleteList");
const searchForm = document.getElementById("searchForm");

// 메뉴 열기/닫기
function toggleMenu() {
  const isOpen = menuBox.classList.toggle("open");
  menuBtn.setAttribute("aria-expanded", isOpen);
  menuBox.setAttribute("aria-hidden", !isOpen);
  if (isOpen) {
    menuBox.focus();
  }
}
menuBtn.addEventListener("click", toggleMenu);

// 메뉴 항목 클릭 시 메뉴 닫기
function closeMenu() {
  menuBox.classList.remove("open");
  menuBtn.setAttribute("aria-expanded", false);
  menuBox.setAttribute("aria-hidden", true);
  menuBtn.focus();
}

// // 용어 카드 새 창 열기 <코드삭제예정> 현재페이지에서 실행되도록 변경할것 주석처리함!
// function openTermInNewWindow(term) {
//   const url = `term.html?term=${encodeURIComponent(term)}`;
//   window.open(
//     url,
//     "_blank",
//     "width=480,height=400,scrollbars=yes,resizable=yes"
//   );
// }

function showTermDetail(term, pushState = true) {
  const found = terms.find((t) => t.term === term);
  if (!found) {
    contentArea.innerHTML = `<p>용어 정보를 찾을 수 없습니다.</p>`;
    return;
  }

  if (pushState) {
    history.pushState(
      { view: "detail", term },
      "",
      `#term=${encodeURIComponent(term)}`
    );
  }
  //카드 눌렀을때 상세보기섹션 주석
  contentArea.innerHTML = `
        <section class="term-detail fade-in" tabindex="0">
          <h2>${found.term}</h2>
          <p id = "term-desc">${found.desc}</p>
          <form id="fo1">
            <p>${found.ex}</p>
            </form><br>
          ${
            found.ex2
              ? `
            <form id="fo2">
              <p>${found.ex2}</p>
            </form>`
              : ""
          }
          <button id="backToListBtn">목록으로</button>
        </section>
      `;

  const backBtn = document.getElementById("backToListBtn");
  backBtn.addEventListener("click", () => {
    history.pushState({ view: "list" }, "", "#list");
    showTerms();
  });

  contentArea.querySelector(".term-detail").focus();
}

// 용어 카드 보여주기 (필터링 가능)
function showTerms(filter = "") {
  contentArea.innerHTML = "";
  let filteredTerms = terms;
  if (filter.trim() !== "") {
    const lowerFilter = filter.trim().toLowerCase();
    filteredTerms = terms.filter(
      (t) =>
        t.term.toLowerCase().includes(lowerFilter) ||
        t.desc.toLowerCase().includes(lowerFilter)
    );
  }
  if (filteredTerms.length === 0) {
    contentArea.innerHTML = `<p>검색 결과가 없습니다.</p>`;
    return;
  }
  filteredTerms.forEach(({ term, desc }) => {
    const card = document.createElement("article");
    card.className = "term-card";
    card.tabIndex = 0;
    card.setAttribute("role", "button");
    card.setAttribute("aria-label", `${term} 용어 설명 보기`);
    card.innerHTML = `<h3>${term}</h3><p>${
      desc.length > 100 ? desc.slice(0, 100) + "..." : desc // 카드내용상세 <<검색용키워드 주석지우지말기
    }</p>`;
    // card.addEventListener("click", () => openTermInNewWindow(term));
    // card.addEventListener("keydown", (e) => {
    //   if (e.key === "Enter" || e.key === " ") {
    //     e.preventDefault();
    //     openTermInNewWindow(term);
    //   }

    card.addEventListener("click", () => showTermDetail(term));
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        showTermDetail(term);
      }
    });
    contentArea.appendChild(card);
  });
}

// 자동완성 리스트 보여주기
function updateAutocomplete() {
  const val = searchBox.value.trim().toLowerCase();
  if (val.length === 0) {
    autocompleteList.innerHTML = "";
    autocompleteList.hidden = true;
    searchBox.setAttribute("aria-expanded", "false");
    return;
  }
  const matched = terms
    .filter(
      (t) =>
        t.term.toLowerCase().includes(val) || t.desc.toLowerCase().includes(val)
    )
    .slice(0, 10);

  if (matched.length === 0) {
    autocompleteList.innerHTML = "";
    autocompleteList.hidden = true;
    searchBox.setAttribute("aria-expanded", "false");
    return;
  }
  autocompleteList.innerHTML = matched
    .map(
      (t) =>
        `<li role="option" tabindex="0" data-term="${t.term}">${t.term}</li>`
    )
    .join("");
  autocompleteList.hidden = false;
  searchBox.setAttribute("aria-expanded", "true");
}

// 자동완성 항목 클릭 시 검색 실행
autocompleteList.addEventListener("click", (e) => {
  if (e.target.tagName === "LI") {
    const term = e.target.dataset.term;
    searchBox.value = term;
    autocompleteList.innerHTML = "";
    autocompleteList.hidden = true;
    searchBox.setAttribute("aria-expanded", "false");
    searchTerm(term);
  }
});

// 자동완성 항목 키보드 내비게이션 & 선택
autocompleteList.addEventListener("keydown", (e) => {
  if (e.key === "ArrowDown" || e.key === "ArrowUp") {
    e.preventDefault();
    const items = [...autocompleteList.querySelectorAll("li")];
    if (items.length === 0) return;
    let idx = items.findIndex((item) => item.classList.contains("active"));
    if (idx === -1) idx = 0;
    else items[idx].classList.remove("active");
    if (e.key === "ArrowDown") {
      idx = (idx + 1) % items.length;
    } else {
      idx = (idx - 1 + items.length) % items.length;
    }
    items.forEach((item) => item.classList.remove("active"));
    items[idx].classList.add("active");
    items[idx].focus();
  } else if (e.key === "Enter") {
    e.preventDefault();
    const active = autocompleteList.querySelector("li.active");
    if (active) {
      const term = active.dataset.term;
      searchBox.value = term;
      autocompleteList.innerHTML = "";
      autocompleteList.hidden = true;
      searchBox.setAttribute("aria-expanded", "false");
      searchTerm(term);
    }
  }
});

// 검색 실행 함수
function searchTerm(term) {
  // 메뉴 닫기
  closeMenu();

  // 필터링된 용어 보여주기
  showTerms(term);
}

// 검색창 입력 이벤트
searchBox.addEventListener("input", updateAutocomplete);

// 폼 제출 (검색) 처리
searchForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const val = searchBox.value.trim();
  if (val !== "") {
    autocompleteList.innerHTML = "";
    autocompleteList.hidden = true;
    searchBox.setAttribute("aria-expanded", "false");
    searchTerm(val);
  }
});

// 메뉴 버튼들 클릭 이벤트
showTermsBtn.addEventListener("click", () => {
  closeMenu();
  searchBox.value = "";
  autocompleteList.innerHTML = "";
  autocompleteList.hidden = true;
  searchBox.setAttribute("aria-expanded", "false");
  showTerms();
});

homeBtn.addEventListener("click", () => {
  closeMenu();
  window.location.href = "home.html";
});

showQuizBtn.addEventListener("click", () => {
  closeMenu();
  generateQuizData();
  showStartButton();
});
// 다크모드시 다크모드풀림방지 로컬저장
toggleDarkBtn.addEventListener("click", () => {
  const isDark = document.body.classList.toggle("dark-mode");
  toggleDarkBtn.setAttribute("aria-pressed", isDark);
  // 상태 저장
  sessionStorage.setItem("darkMode", isDark ? "on" : "off");
});

// 퀴즈 관련 코드
let currentQuizIndex = 0;
let score = 0;
function showStartButton() {
  // 퀴즈시작 버튼
  contentArea.innerHTML = "";

  const startSection = document.createElement("section");
  startSection.id = "quizBox";

  startSection.style.display = "flex";
  startSection.style.flexDirection = "column";
  startSection.style.alignItems = "center";
  startSection.style.justifyContent = "center";
  startSection.style.height = "300px"; // 원하는 높이로 조절
  startSection.style.marginTop = "50px"; // 상단 여백
  const startQuizBtn = document.createElement("button");
  startQuizBtn.textContent = "퀴즈 시작";

  // 버튼 스타일
  startQuizBtn.style.fontSize = "1.2rem";
  startQuizBtn.style.padding = "12px 24px";
  startQuizBtn.style.borderRadius = "8px";
  startQuizBtn.style.border = "none";
  startQuizBtn.style.backgroundColor = "#fc96aa";
  startQuizBtn.style.color = "white";
  startQuizBtn.style.cursor = "pointer";
  startQuizBtn.style.boxShadow = "0 4px 8px rgba(0,0,0,0.2)";
  startQuizBtn.style.transition = "0.3s";

  startQuizBtn.addEventListener("click", () => {
    showQuiz();
    renderQuizQuestion();
  });

  startSection.appendChild(startQuizBtn);
  contentArea.appendChild(startSection);
}

function showQuiz() {
  if (quizData.length === 0) {
    contentArea.innerHTML = "<p>퀴즈 데이터가 없습니다.</p>";
    return;
  }
  score = 0;
  currentQuizIndex = 0;
  renderQuizQuestion();
}

function renderQuizQuestion() {
  contentArea.innerHTML = "";
  const quizBox = document.createElement("section");
  quizBox.id = "quizBox";
  quizBox.setAttribute("aria-live", "polite");
  const current = quizData[currentQuizIndex];

  // 문제 표시
  const questionP = document.createElement("p");
  questionP.id = "question";
  questionP.textContent = `${currentQuizIndex + 1}. 다음 중 "${
    current.question
  }"의 설명으로 가장 적절한 것은?`;
  quizBox.appendChild(questionP);

  // 선택지 버튼들
  const optionsDiv = document.createElement("div");
  optionsDiv.id = "options";
  current.options.forEach((optionText, idx) => {
    const btn = document.createElement("button");
    btn.textContent = optionText;
    btn.type = "button";
    btn.setAttribute("data-index", idx);
    btn.addEventListener("click", () => {
      handleAnswer(idx);
    });
    optionsDiv.appendChild(btn);
  });
  quizBox.appendChild(optionsDiv);

  // 결과 표시
  const resultDiv = document.createElement("div");
  resultDiv.id = "result";
  quizBox.appendChild(resultDiv);

  // 다음 버튼
  const nextBtn = document.createElement("button");
  nextBtn.id = "nextBtn";
  nextBtn.textContent = "다음 문제";
  nextBtn.disabled = true;
  nextBtn.addEventListener("click", () => {
    currentQuizIndex++;
    if (currentQuizIndex < quizData.length) {
      renderQuizQuestion();
    } else {
      showQuizResult();
    }
  });
  quizBox.appendChild(nextBtn);

  contentArea.appendChild(quizBox);
}

function handleAnswer(selectedIndex) {
  const quizBox = document.getElementById("quizBox");
  const resultDiv = quizBox.querySelector("#result");
  const nextBtn = quizBox.querySelector("#nextBtn");
  const current = quizData[currentQuizIndex];

  // 정답 확인 및 표시
  if (selectedIndex === current.answer) {
    resultDiv.textContent = "정답입니다! 🎉";
    resultDiv.style.color = "green";
    score++;
  } else {
    resultDiv.textContent = `오답입니다. 정답: "${
      current.options[current.answer]
    }"`;
    resultDiv.style.color = "red";
  }

  // 버튼 비활성화 및 다음 버튼 활성화
  const optionButtons = quizBox.querySelectorAll("#options button");
  optionButtons.forEach((btn) => {
    btn.disabled = true;
    if (Number(btn.dataset.index) === current.answer) {
      btn.style.borderColor = "green";
      btn.style.backgroundColor = "#d4f8d4";
      btn.style.color = "green";
    }
    if (
      Number(btn.dataset.index) === selectedIndex &&
      selectedIndex !== current.answer
    ) {
      btn.style.borderColor = "red";
      btn.style.backgroundColor = "#f8d4d4";
      btn.style.color = "red";
    }
  });

  nextBtn.disabled = false;
}

function showQuizResult() {
  contentArea.innerHTML = "";
  const resultBox = document.createElement("section");
  resultBox.id = "quizBox";

  const scoreP = document.createElement("p");
  scoreP.textContent = `퀴즈 종료! 총 ${quizData.length}문제 중 ${score}문제 맞추셨습니다.`;
  scoreP.style.fontWeight = "700";
  scoreP.style.fontSize = "1.3rem";
  scoreP.style.marginBottom = "20px";
  resultBox.appendChild(scoreP);

  const retryBtn = document.createElement("button");
  retryBtn.id = "retryBtn";
  retryBtn.textContent = "다시 풀기";
  retryBtn.addEventListener("click", () => {
    generateQuizData();
    showQuiz();
  });
  resultBox.appendChild(retryBtn);

  contentArea.appendChild(resultBox);
}

// 초기 실행
const hash = window.location.hash;
if (hash.startsWith("#term=")) {
  const term = decodeURIComponent(hash.split("=")[1]);
  showTermDetail(term, false);
} else {
  showTerms();
}
window.addEventListener("popstate", (e) => {
  if (e.state && e.state.view === "detail") {
    showTermDetail(e.state.term, false);
  } else {
    showTerms();
  }
});

//logo로고이동코드
function logopass(img) {
  const altText = img.alt;
  const targetPage = altText + ".html";
  window.location.href = targetPage;
}
