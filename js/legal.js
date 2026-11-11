/* =========================================================
   EDU — 법정의무교육 (모든 크루 필수 · 년도별 관리)
   · 디자인: 링키지랩 성과 키트(역량 사전)처럼 — 큰 글씨 · 쉬운 말 · 고르면 바로 보이는 상세
   · 화면 순서: 한눈에 보기(간단 전달) → 교육 6가지(누르면 아래에 그 교육 내용) → 꼭 확인해 주세요
   · 년도 데이터: 아래 YEARS — 새 해가 오면 맨 위에 한 덩어리 추가 (년도 탭 자동)
   · 관리자 '링크 넣기': 아지트 공지 · 퇴직연금 아지트 자료 → Supabase edu_legal (supabase/legal.sql)
   · 크루용 공개 보기: legal.html (로그인 없음, #privacy 처럼 교육 키로 바로 열기)
   ========================================================= */
(function () {
  "use strict";

  var MEET_EASY_WHEN = "같은 교육이 오전(1타임)과 오후(2타임)에 열려요. 편한 시간에 들어가요.";

  var YEARS = [
    {
      year: 2026,
      title: "2026년 법정의무교육",
      date: "2026-11-12", dateLabel: "11월 12일 (목)",
      lede: "모든 크루가 꼭 들어야 하는 교육이에요. 회사와 크루 모두의 권리와 의무를 지키기 위한 교육이니 일정을 미리 확인해 주세요.",
      // 한눈에 보기 — 누가 · 언제까지 · 무엇을. 이 페이지의 요약은 여기 하나만 (아래에서 반복하지 않음)
      tiles: [
        { who: "구글 계정이 있는 크루", big: "11월 12일 (목)", what: "직장 내 괴롭힘 · 직장 내 성희롱 · 장애인 인식개선 · 산업안전보건", label: "구글 미트 교육", sub: "구글 미트로 들어요 · 오전 10:00 ~ 12:30 또는 오후 14:00 ~ 16:30 중 한 번", go: "harass", tg: { field: "targets", only: "meet" } },
        { who: "구글 계정이 없는 4·6·8시간 크루", big: "12월 31일까지", what: "직장 내 괴롭힘 · 직장 내 성희롱 · 장애인 인식개선 · 산업안전보건", label: "교육 영상", sub: "11월 중 교육 영상을 받아서 12월 31일까지 시청하면 돼요.", hot: true, video: true, tg: { field: "targets", only: "video" } },
        { who: "모든 크루", big: "11월 30일까지", what: "개인정보보호교육 (온라인)", sub: "개인정보배움터 · 15분 30초", go: "privacy", tg: { field: "t_privacy" } },
        { who: "모든 크루", big: "아지트 자료", what: "퇴직연금교육", sub: "아지트 안내 자료를 읽으면 돼요", go: "pension", tg: { field: "t_pension" } }
      ],
      // 올해 입사자 — 괴롭힘 · 성희롱 · 장애인 인식개선 · 산업안전보건 모두 제외 (2026-11-11 인사 안내)
      //  · 괴롭힘 · 성희롱 · 장애인 인식개선 = 입사 OT 때 들음 / 산업안전 = 복지 부서 월별 안전교육으로 갈음
      //  · 개인정보 · 퇴직연금은 들어요
      newHires: {
        label: "2026년 입사자", short: "26년 입사자", skip: ["harass", "sexual", "disab", "safety"],
        note: "입사할 때 이미 들어서 이번에는 제외예요",
        notes: { safety: "복지 부서의 월별 안전교육으로 대신해서 이번에는 제외예요" },
        // OPS 크루 목록 입사일 2026년 (2026-11-11 확인)
        names: ["토리(tori.15)", "클로버(clover.j)", "니아(nia.11)", "루카(luca.74)", "베라(vera.31)", "엘라(ella.1024)", "에릭(eric.0228)"]
      },
      // 대상자 설정(관리자) — 크루 명단(edu_crews 재직)마다 아래 중 하나. 저장: edu_legal.links.targets { "이름(ldap)": key }
      targetWays: [
        { key: "meet", label: "구글 미트", when: "11월 12일 (목) · 오전 또는 오후" },
        { key: "video", label: "영상", when: "11월 중 영상 받아서 12월 31일까지 시청" },
        { key: "out", label: "대상 아님", when: "이번 구글 미트 · 영상 교육 대상이 아니에요" }
      ],
      meets: {
        am: { label: "1타임", when: "오전", time: "10:00 ~ 12:30", url: "https://meet.google.com/boj-nody-gvo" },
        pm: { label: "2타임", when: "오후", time: "14:00 ~ 16:30", url: "https://meet.google.com/nso-saon-emd" }
      },
      edus: [
        { key: "harass", name: "직장 내 괴롭힘 예방교육", kind: "meet", am: "10:00 ~ 10:30", pm: "14:00 ~ 14:30", min: 30,
          what: "일하면서 서로 괴롭히지 않도록 배우는 교육이에요.",
          why: "어떤 말과 행동이 괴롭힘이 되는지, 그런 일이 생기면 어디에 도움을 청하는지 알려 줘요." },
        { key: "sexual", name: "직장 내 성희롱 예방교육", kind: "meet", am: "10:30 ~ 11:10", pm: "14:30 ~ 15:10", min: 40,
          what: "몸이나 성에 관한 말과 행동으로 다른 사람을 불편하게 하지 않도록 배워요.",
          why: "불편한 일을 겪었을 때 누구에게 말하면 되는지도 알려 줘요." },
        { key: "disab", name: "직장 내 장애인 인식개선교육", kind: "meet", am: "11:10 ~ 11:50", pm: "15:10 ~ 15:50", min: 40,
          what: "장애가 있는 동료와 함께 잘 일하는 방법을 배워요.",
          why: "서로 다름을 이해하고 존중하는 마음을 갖기 위한 교육이에요." },
        { key: "safety", name: "산업안전보건교육", kind: "meet", am: "11:50 ~ 12:30", pm: "15:50 ~ 16:30", min: 40,
          what: "일하다 다치지 않도록 안전하게 일하는 방법을 배워요.",
          why: "위험한 상황에서 어떻게 해야 하는지, 아플 때 어떻게 하는지 알려 줘요." },
        { key: "privacy", name: "개인정보보호교육", kind: "privacy", tag: "온라인", whenShort: "11월 9일 ~ 11월 30일",
          what: "이름, 전화번호처럼 사람을 알 수 있는 정보를 안전하게 지키는 방법을 배워요.",
          why: "올해는 「AI와 함께하는 생활, 현명한 사용법」 — AI를 똑똑하고 안전하게 쓰는 방법이에요." },
        { key: "pension", name: "퇴직연금교육", kind: "pension", tag: "아지트 자료", whenShort: "아지트 안내 자료로 대체",
          what: "회사를 그만둘 때 받는 돈(퇴직금)을 모아 두는 제도를 알려 줘요.",
          why: "따로 모여서 듣지 않아요. 아지트에 올라온 안내 자료를 읽으면 교육을 마친 걸로 해요." }
      ],
      privacy: {
        target: "모든 크루 (성수 · 판교) · 한 명씩 꼭 들어야 해요",
        start: "2026-11-09", end: "2026-11-30", period: "11월 9일 (월) ~ 11월 30일 (월)",
        course: "AI와 함께하는 생활, 현명한 사용법", length: "15분 30초",
        steps: [
          { t: "개인정보배움터에 들어가요", d: "처음이면 회원가입, 아이디가 있으면 로그인해요.",
            btn: { label: "개인정보배움터 열기", url: "https://edu.privacy.go.kr/user/index/mainView.do" } },
          { t: "교육생 등록 화면으로 가요", d: "로그인한 다음 아래 버튼을 누르면 교육생 등록 화면이 바로 열려요.",
            btn: { label: "교육생 등록 화면 열기", url: "https://edu.privacy.go.kr/user/course/partyLogin.do#sub-content" } },
          { t: "등록 정보를 넣고 '등록'을 눌러요", d: "아래 내용을 그대로 넣어요. 복사 버튼을 누르면 쉽게 붙여 넣을 수 있어요.", reg: true },
          { t: "'신청하기'를 눌러요", d: "신청 목록에서 「[링키지랩] 2026년 개인정보보호교육 온라인 수강」 옆의 '신청하기'를 눌러요." },
          { t: "교육을 들어요", d: "오른쪽 위 '나의 정보' → '온라인 단체교육' → '강의실'에서 「AI와 함께하는 생활, 현명한 사용법」을 들어요.",
            more: "15분 30초 · 페이지를 넘기지 않아도 되고, 중간 퀴즈도 저절로 넘어가요." }
        ],
        reg: [
          { k: "기업 · 기관명", v: "링키지랩" },
          { k: "사업자번호", v: "2358800278" },
          { k: "사번", v: "본인 LDAP", ex: "예: may.15" }
        ],
        notes: [
          "진행하다가 잘 모르겠다면, 언제든지 제이미, 헤이든에게 문의해 주세요."
        ],
      },
      // 교육을 마친 뒤 크루가 서명으로 '완료'를 알려 주는 곳 — 교육 서명 관리(#/sign)의 세션 id
      // 서명 하나로 6가지 — 서명 화면에서 들은 교육을 체크 (sessions.meta.checks), 나중에 다시 들어와 체크 추가 가능
      signs: {
        all: { id: "idmwbemuoqqncb", label: "법정의무교육 체크하기", msg: "교육을 하나 들을 때마다 들어와서 체크하면 바로 저장돼요." }
      },
      links: { agit: "", pension: "", video: "" }
    }
  ];

  var LINK_META = [
    { key: "agit", label: "아지트 공지 원문", hint: "2026년 법정의무교육 안내 글 링크" },
    { key: "pension", label: "퇴직연금교육 아지트 자료", hint: "아지트 안내 자료 링크" },
    { key: "video", label: "교육 영상 (구글 계정 없는 크루)", hint: "11월 중 볼 교육 영상 링크 — 공유되면 넣어요" }
  ];

  var DEMO = /[?&]demo=1(&|$)/.test(location.search);
  var S = (window.CONFIG && window.CONFIG.supabase) || {};
  var _sb = null;
  function sb() { if (!_sb) _sb = window.supabase.createClient(S.url, S.anonKey); return _sb; }
  function canDb() { return !DEMO && !!(S.url && S.anonKey && window.supabase && window.supabase.createClient); }

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function toast(msg) { var el = document.createElement("div"); el.className = "toast"; el.textContent = msg; document.body.appendChild(el); setTimeout(function () { el.remove(); }, 2400); }
  function svg(d) { return '<svg viewBox="0 0 24 24" aria-hidden="true">' + d + '</svg>'; }
  var IC = {
    ext: svg('<path d="M14 4h6v6"/><path d="M20 4l-9 9"/><path d="M18 14v5H5V6h5"/>'),
    cam: svg('<rect x="3" y="6" width="13" height="12" rx="2"/><path d="M16 10l5-3v10l-5-3"/>'),
    web: svg('<rect x="3" y="4" width="18" height="14" rx="2"/><path d="M8 21h8M12 18v3"/>'),
    doc: svg('<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h7M9 17h5"/>'),
    info: svg('<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>'),
    pen: svg('<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13 7l4 4"/>')
  };
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  function safeUrl(u) { u = String(u || "").trim(); return /^https?:\/\//i.test(u) ? u : ""; }
  function yearData(y) { for (var i = 0; i < YEARS.length; i++) if (YEARS[i].year === y) return YEARS[i]; return YEARS[0]; }
  function years() { return YEARS.map(function (x) { return x.year; }); }

  // → { links, live }
  function loadLinks(y) {
    var base = Object.assign({}, yearData(y).links || {});
    if (!canDb()) return Promise.resolve({ links: base, live: false });
    return sb().from("edu_legal").select("links,updated_at,updated_by").eq("year", y).maybeSingle().then(function (r) {
      if (r.error) return { links: base, live: false, missing: true };
      var got = (r.data && r.data.links) || {};
      Object.keys(got).forEach(function (k) { if (got[k]) base[k] = got[k]; });
      return { links: base, live: true, updatedAt: r.data && r.data.updated_at, updatedBy: r.data && r.data.updated_by };
    }).catch(function () { return { links: base, live: false, missing: true }; });
  }
  function saveLinks(y, links, by) {
    return sb().from("edu_legal").upsert({ year: y, links: links, updated_at: new Date().toISOString(), updated_by: by || null })
      .then(function (r) { if (r.error) throw r.error; });
  }

  function daysTo(dateStr) { var t = new Date(dateStr + "T00:00:00"), n = new Date(); n.setHours(0, 0, 0, 0); return Math.round((t - n) / 86400000); }
  function dday(dateStr) {
    var d = daysTo(dateStr);
    if (d > 0) return { txt: "D-" + d, state: "soon" };
    if (d === 0) return { txt: "오늘", state: "today" };
    return { txt: "끝", state: "done" };
  }
  function privacyTag(P) {
    var s = daysTo(P.start), e = daysTo(P.end);
    if (e < 0) return { txt: "기간 끝", state: "done" };
    if (s > 0) return { txt: "시작 D-" + s, state: "soon" };
    return { txt: e === 0 ? "오늘 마감" : "마감 D-" + e, state: "soon" };
  }
  function btn(url, label, primary, icon) {
    url = safeUrl(url);
    if (!url) return '<span class="lg-b is-off" aria-disabled="true">' + esc(label) + ' · 준비 중</span>';
    return '<a class="lg-b' + (primary ? " is-pri" : "") + '" href="' + esc(url) + '" target="_blank" rel="noopener">' + (icon || "") + '<span>' + esc(label) + '</span>' + IC.ext + '</a>';
  }

  // 아직 링크가 없을 때 — 버튼 양쪽에 페피(물뿌리개) · 두두(모종삽)가 작게 서서 "조금만 기다려 주세요"
  var PEEK_SRC = (function () { var sc = document.currentScript && document.currentScript.src; return sc ? sc.replace(/js\/legal\.js.*$/, "img/pepi-water.png") : "img/pepi-water.png"; })();
  function waitBtn(what) {
    return '<span class="lg-waitbox"><img class="lg-wait__ch is-l" src="' + PEEK_SRC + '" alt="" width="34" height="52" />'
      + '<button type="button" class="lg-wait" data-wait="' + esc(what) + '">'
      + '<span class="lg-wait__t">' + esc(what) + '<b>준비 중이에요, 조금만 기다려 주세요!</b></span></button>'
      + '<img class="lg-wait__ch is-r" src="' + PEEK_SRC.replace("pepi-water", "dudu-plant") + '" alt="" width="40" height="52" /></span>';
  }

  /* ---------- 교육 카드 (6가지) ---------- */
  function eduMeta(Y, e) {
    if (e.kind === "meet") return { tag: "구글 미트", line: Y.dateLabel + " · " + e.min + "분" };
    if (e.kind === "privacy") return { tag: e.tag, line: e.whenShort + " · 15분 30초" };
    return { tag: e.tag, line: "읽기만 하면 돼요" };
  }
  function cardsHtml(Y, sel) {
    return '<div class="lg-cards" role="tablist" aria-label="법정의무교육 6가지">' + Y.edus.map(function (e, i) {
      var m = eduMeta(Y, e), on = e.key === sel;
      return '<button type="button" role="tab" class="lg-card' + (on ? " is-on" : "") + '" data-edu="' + e.key + '" aria-selected="' + on + '" aria-controls="lgDetail">'
        + '<span class="lg-card__n">' + ("0" + (i + 1)).slice(-2) + '</span>'
        + '<b class="lg-card__name">' + esc(e.name) + '</b>'
        + '<span class="lg-card__tag">' + esc(m.tag) + '</span>'
        + '<span class="lg-card__line">' + esc(m.line) + '</span>'
        + (skipsFor(Y, e.key) ? '<span class="lg-card__nh">' + esc(Y.newHires.short) + ' 제외</span>' : "")
        + '</button>';
    }).join("") + '</div>';
  }

  /* ---------- 고른 교육 상세 ---------- */
  function detailHtml(Y, e, L) {
    var m = eduMeta(Y, e), idx = Y.edus.indexOf(e) + 1;
    var h = '<div class="lg-d__head"><div class="lg-d__tags"><span class="lg-badge is-acc">' + ("0" + idx).slice(-2) + ' / 0' + Y.edus.length + '</span><span class="lg-badge">' + esc(m.tag) + '</span></div>'
      + '<h3 class="lg-d__name">' + esc(e.name) + '</h3></div>'
      + (skipsFor(Y, e.key) ? '<div class="lg-nh"><b>' + esc(Y.newHires.label) + ' 제외</b><p>' + esc(nhNote(Y, e.key)) + '.</p>'
          + '<div class="lg-m__chips">' + Y.newHires.names.map(function (n) { return '<span>' + esc(shortName(n)) + '</span>'; }).join("") + '</div></div>' : "")
      + '<dl class="lg-easy"><dt>무엇을 배워요?</dt><dd>' + esc(e.what) + '</dd><dt>왜 들어요?</dt><dd>' + esc(e.why) + '</dd>';
    if (e.kind === "meet") {
      h += '<dt>언제 들어요?</dt><dd>' + esc(Y.dateLabel) + ' 구글 미트 · ' + MEET_EASY_WHEN + '</dd></dl>'
        + '<h4 class="lg-h4">시간과 구글 미트</h4><div class="lg-slots">'
        + ["am", "pm"].map(function (k) {
            var M = Y.meets[k];
            return '<div class="lg-slot"><div class="lg-slot__h"><span class="lg-badge is-acc">' + esc(M.label) + '</span><b>' + esc(M.when) + '</b></div>'
              + '<p class="lg-slot__time">' + esc(e[k]) + '</p><p class="lg-slot__sub">' + e.min + '분 · ' + esc(M.when) + ' 미트는 ' + esc(M.time) + ' 동안 열려요</p>'
              + btn(M.url, M.when + " 구글 미트 들어가기", true, IC.cam) + '</div>';
          }).join("") + '</div>'
        + signBox(Y.signs && Y.signs.all, "완료한 뒤에 아래에 체크해 주세요");
    } else if (e.kind === "privacy") {
      var P = Y.privacy, tg = privacyTag(P);
      h += '<dt>언제까지?</dt><dd>' + esc(P.period) + ' <span class="lg-dday lg-dday--' + tg.state + '">' + tg.txt + '</span></dd>'
        + '<dt>얼마나 걸려요?</dt><dd>' + esc(P.length) + ' · 혼자 온라인으로 들어요</dd></dl>'
        + '<h4 class="lg-h4">이렇게 들어요 (5단계)</h4><ol class="lg-steps">' + P.steps.map(function (s, i) {
            return '<li><span class="lg-steps__n">' + (i + 1) + '</span><div class="lg-steps__b"><b>' + esc(s.t) + '</b><p>' + esc(s.d) + '</p>'
              + (s.reg ? regHtml(P) : "")
              + (s.more ? '<p class="lg-steps__more">' + esc(s.more) + '</p>' : "")
              + (s.btn ? '<div class="lg-acts">' + btn(s.btn.url, s.btn.label, i === 0, IC.web) + '</div>' : "")
              + '</div></li>';
          }).join("") + '</ol>'
        + '<h4 class="lg-h4">알아 두세요</h4><ul class="lg-notes">' + P.notes.map(function (n) { return '<li>' + esc(n) + '</li>'; }).join("") + '</ul>'
        + signBox(Y.signs && Y.signs.all, "완료한 뒤에 아래에 체크해 주세요");
    } else {
      h += '<dt>어떻게 해요?</dt><dd>아지트에 올라온 퇴직연금 안내 자료를 끝까지 읽어요.</dd></dl>'
        + '<div class="lg-acts">' + btn(L.pension, "아지트 자료 보기", true, IC.doc) + '</div>'
        + signBox(Y.signs && Y.signs.all, "완료한 뒤에 아래에 체크해 주세요");
    }
    return h;
  }
  /* ---------- 대상자 (스낵앤가든사업팀 · 크루 명단 edu_crews) ---------- */
  var PARTS = ["가든", "스낵", "총무지원"];
  var PART_LABEL = { "가든": "가든", "스낵": "스낵큐레이션", "총무지원": "총무지원" };
  function shortName(n) { return String(n || "").replace(/\s*\(.*\)\s*$/, ""); }
  function loadCrews() {
    if (!canDb()) return Promise.resolve({ crews: [], missing: true });
    return sb().from("edu_crews").select("name,grp,role,status").then(function (r) {
      if (r.error) return { crews: [], missing: true };
      var list = (r.data || []).filter(function (c) { return c.status === "재직"; });
      list.sort(function (a, b) { var pa = PARTS.indexOf(a.grp), pb = PARTS.indexOf(b.grp); return (pa < 0 ? 9 : pa) - (pb < 0 ? 9 : pb) || shortName(a.name).localeCompare(shortName(b.name), "ko"); });
      return { crews: list };
    }).catch(function () { return { crews: [], missing: true }; });
  }
  // 개인정보 · 퇴직연금 = 기본 '대상'(모든 크루), 빼고 싶은 크루만 '대상 아님'
  var IN_WAYS = [{ key: "in", label: "대상", when: "" }, { key: "out", label: "대상 아님", when: "이번 교육 대상이 아니에요" }];
  function waysOf(Y, field) { return field === "targets" ? Y.targetWays : IN_WAYS; }
  function wayOf(Y, k, field) { return waysOf(Y, field || "targets").filter(function (w) { return w.key === k; })[0]; }
  // 이 칸의 대상자 명단
  function membersOf(tg, L, crews) {
    var T = L[tg.field] || {};
    if (tg.field === "targets") return crews.filter(function (c) { return T[c.name] === tg.only; });
    return crews.filter(function (c) { return T[c.name] !== "out"; });
  }
  function countTargets(Y, T, crews, ways) {
    ways = ways || Y.targetWays;
    var c = { none: 0 }; ways.forEach(function (w) { c[w.key] = 0; });
    crews.forEach(function (x) { var k = T[x.name]; if (k && c[k] != null) c[k]++; else c.none++; });
    return c;
  }
  function isNewHire(Y, name) { return !!(Y.newHires && Y.newHires.names.indexOf(name) > -1); }
  function skipsFor(Y, key) { return !!(Y.newHires && Y.newHires.skip.indexOf(key) > -1); }
  function nhNote(Y, key) { var N = Y.newHires; return (N.notes && N.notes[key]) || N.note; }
  // 구글 미트 · 영상 교육(괴롭힘 · 성희롱 · 장애인 인식개선 · 산업안전보건)을 입사자가 모두 제외하면 그 칸 대상자에서 뺌
  function nhSkipsAll4(Y) { return !!Y.newHires && Y.edus.filter(function (e) { return e.kind === "meet"; }).every(function (e) { return skipsFor(Y, e.key); }); }
  function tileTgHtml(t, L, crews, admin) {
    if (!t.tg) return "";
    var mem = membersOf(t.tg, L, crews), set = t.tg.field !== "targets" || Object.keys(L.targets || {}).length > 0;
    var Y = YEARS[0], nh = mem.filter(function (c) { return isNewHire(Y, c.name); }).length;
    var out = t.tg.field === "targets" && nhSkipsAll4(Y), n = out ? mem.length - nh : mem.length;
    return '<span class="lg-tile__tgn">대상자 <b>' + (crews.length ? (set ? n + "명" : "미정") : "–") + '</b>'
      + (nh ? '<i class="lg-nh-pill">' + esc(Y.newHires.short) + ' ' + nh + '명 ' + (out ? "제외" : "포함") + '</i>' : "") + '</span>'
      + '<span class="lg-tile__tgacts">'
      + '<button type="button" class="lg-tile__tgbtn" data-tgcheck' + (mem.length ? "" : " disabled") + '>대상자 확인</button>'
      + (admin ? '<button type="button" class="lg-tile__tgbtn is-set" data-tgset>설정</button>' : "")
      + '</span>';
  }
  function openTileCheck(Y, t, L, crews) {
    var names = membersOf(t.tg, L, crews);
    var NH = Y.newHires, old = names.filter(function (c) { return !isNewHire(Y, c.name); }), neu = names.filter(function (c) { return isNewHire(Y, c.name); });
    var is4 = t.tg.field === "targets", all4 = is4 && nhSkipsAll4(Y);
    function chips(list) { return '<div class="lg-m__chips">' + list.map(function (c) { return '<span>' + esc(shortName(c.name)) + '</span>'; }).join("") + '</div>'; }
    modal((t.label || t.what) + " 대상자", '<p class="lg-m__hint">' + esc(t.who) + ' · ' + esc(t.big) + '</p>'
      + '<section class="lg-m__g"><div class="lg-m__gh"><b>대상자</b><em>' + old.length + '명</em></div>' + chips(old) + '</section>'
      + (neu.length ? '<section class="lg-m__g lg-m__nh"><div class="lg-m__gh"><b>' + esc(NH.label) + (all4 ? " · 제외" : "") + '</b><em>' + neu.length + '명</em></div>'
          + '<p class="lg-m__nhnote">' + (all4
              ? "<b>" + (t.video ? "이번 교육 영상은 보지 않아도 돼요." : "이번 11월 12일 교육은 듣지 않아도 돼요.") + "</b> 직장 내 괴롭힘 · 직장 내 성희롱 · 장애인 인식개선은 입사 때 들었고, 산업안전보건은 복지 부서의 월별 안전교육으로 대신해요."
              : is4 ? "<b>산업안전보건교육만 들어요.</b> 괴롭힘 · 성희롱 · 장애인 인식개선 교육은 " + esc(NH.note)
              : "이 교육은 <b>들어요.</b> 직장 내 괴롭힘 · 직장 내 성희롱 · 장애인 인식개선 · 산업안전보건만 제외예요.") + '</p>'
          + chips(neu) + '</section>' : ""), true);
  }
  function modal(title, body, wide) {
    var wrap = document.createElement("div");
    wrap.className = "modal lg-modal";
    wrap.innerHTML = '<div class="modal__backdrop" data-close></div>'
      + '<div class="modal__card' + (wide ? " modal__card--wide" : "") + '" role="dialog" aria-modal="true" aria-label="' + esc(title) + '">'
      + '<div class="modal__head"><h3>' + esc(title) + '</h3><button class="modal__x" data-close aria-label="닫기">×</button></div>'
      + '<div class="lg-m">' + body + '</div></div>';
    document.body.appendChild(wrap);
    function close() { wrap.remove(); document.removeEventListener("keydown", onKey); }
    function onKey(e) { if (e.key === "Escape") close(); }
    document.addEventListener("keydown", onKey);
    wrap.querySelectorAll("[data-close]").forEach(function (x) { x.onclick = close; });
    return { el: wrap, close: close };
  }
  // 관리자: 대상자 설정 — 크루마다 방법 고르기
  function openSet(Y, y, L, crews, opts, done, field, title) {
    field = field || "targets";
    var WAYS = waysOf(Y, field), isIn = field !== "targets";
    var T = Object.assign({}, L[field] || {});
    if (isIn) crews.forEach(function (c) { if (T[c.name] !== "out") T[c.name] = "in"; });
    function rowsHtml() {
      return PARTS.concat(["기타"]).map(function (part) {
        var list = crews.filter(function (c) { return part === "기타" ? PARTS.indexOf(c.grp) < 0 : c.grp === part; });
        if (!list.length) return "";
        return '<section class="lg-m__g"><div class="lg-m__gh"><b>' + esc(PART_LABEL[part] || part) + '</b><em>' + list.length + '명</em></div>'
          + list.map(function (c) {
              return '<div class="lg-set"><div class="lg-set__n"><b>' + esc(shortName(c.name)) + '</b><small>' + esc(c.role || "") + '</small></div>'
                + '<div class="lg-seg" role="radiogroup" aria-label="' + esc(shortName(c.name)) + '">' + WAYS.map(function (w) {
                    return '<button type="button" role="radio" data-c="' + esc(c.name) + '" data-w="' + w.key + '" aria-checked="' + (T[c.name] === w.key) + '">' + esc(w.label) + '</button>';
                  }).join("") + '</div></div>';
            }).join("") + '</section>';
      }).join("");
    }
    var m = modal(y + "년 " + (title || "구글 미트 · 영상 교육") + " 대상자 설정", '<p class="lg-m__hint">' + (isIn ? "기본은 모든 크루가 대상이에요. 빼야 하는 크루만 &lsquo;대상 아님&rsquo;을 눌러 주세요." : "크루 명단(재직)마다 듣는 방법을 골라 주세요. 고르지 않은 크루는 &lsquo;미정&rsquo;으로 보여요.") + '</p>'
      + (isIn ? "" : '<div class="lg-m__bulk"><span>미정인 크루 모두</span>' + WAYS.filter(function (w) { return w.key !== "out"; }).map(function (w) { return '<button type="button" class="lg-copy" data-bulk="' + w.key + '">' + esc(w.label) + '</button>'; }).join("") + '</div>')
      + '<div id="lgSetRows">' + rowsHtml() + '</div>'
      + '<div class="modal__foot lg-m__save"><span class="hint" id="lgSetCount"></span><div class="modal__spacer"></div><button type="button" class="btn" data-close>취소</button><button type="button" class="btn btn--primary" id="lgSetSave">저장</button></div>', true);
    var box = m.el.querySelector("#lgSetRows"), cnt = m.el.querySelector("#lgSetCount");
    function paintCount() { var c = countTargets(Y, T, crews, WAYS); cnt.textContent = WAYS.map(function (w) { return w.label + " " + c[w.key]; }).join(" · ") + (isIn ? "" : " · 미정 " + c.none); }
    function bind() {
      box.querySelectorAll("[data-w]").forEach(function (b) {
        b.onclick = function () {
          var n = b.dataset.c;
          if (T[n] === b.dataset.w && !isIn) delete T[n]; else T[n] = b.dataset.w;
          b.parentNode.querySelectorAll("[data-w]").forEach(function (x) { x.setAttribute("aria-checked", T[n] === x.dataset.w); });
          paintCount();
        };
      });
    }
    m.el.querySelectorAll("[data-bulk]").forEach(function (b) {
      b.onclick = function () { crews.forEach(function (c) { if (!T[c.name]) T[c.name] = b.dataset.bulk; }); box.innerHTML = rowsHtml(); bind(); paintCount(); };
    });
    bind(); paintCount();
    m.el.querySelector("#lgSetSave").onclick = function () {
      var b = this; b.disabled = true; b.textContent = "저장 중…";
      var save = T;
      if (isIn) { save = {}; Object.keys(T).forEach(function (k) { if (T[k] === "out") save[k] = "out"; }); }
      var out = Object.assign({}, L); out[field] = save;
      saveLinks(y, out, opts.by).then(function () { toast("대상자를 저장했어요"); m.close(); done(); })
        .catch(function (err) { b.disabled = false; b.textContent = "저장"; toast("저장하지 못했어요: " + (err && err.message || err)); });
    };
  }

  function signUrl(id) { return (location.hostname === "localhost" || location.hostname === "127.0.0.1" ? "sign.html" : "/sign") + "?s=" + encodeURIComponent(id); }
  function signBtn(sg, primary) {
    if (!sg) return "";
    return '<a class="lg-b lg-sign" href="' + signUrl(sg.id) + '">' + IC.pen + '<span>' + esc(sg.label) + '</span></a>';
  }
  function signBox(sg, title) {
    if (!sg) return "";
    return '<div class="lg-signbox">'
      + '<div class="lg-signbox__h"><span class="lg-signbox__ic">' + IC.pen + '</span><div><b>' + esc(title) + '</b>'
      + (sg.msg ? '<p>' + esc(sg.msg) + '</p>' : "") + '</div></div>'
      + '<a class="lg-signbtn" href="' + signUrl(sg.id) + '"><span>' + esc(sg.label) + '</span><i aria-hidden="true">→</i></a>'
      + '</div>';
  }

  function tilesHtml(Y, L) {
    return '<div class="lg-tiles">' + Y.tiles.map(function (t, i) {
      // 서명 버튼은 맨 아래(교육 상세 끝)에만 — 한눈에 보기 칸에는 넣지 않음 (Jamie)
      var act = t.video ? (safeUrl(L.video) ? btn(L.video, "교육 영상 보기", true, IC.cam) : waitBtn("교육 영상"))
        : (t.go ? '<button type="button" class="lg-tile__go" data-go="' + t.go + '">자세히 보기 →</button>' : "");
      return '<div class="lg-tile' + (t.hot ? " is-hot" : "") + '">'
        + '<span class="lg-tile__who">' + esc(t.who) + '</span>'
        + '<b class="lg-tile__big">' + esc(t.big) + '</b>'
        + '<span class="lg-tile__what">' + esc(t.what) + '</span>'
        + '<span class="lg-tile__sub">' + esc(t.sub) + '</span>'
        + (act ? '<div class="lg-tile__act">' + act + '</div>' : "")
        + (t.tg ? '<div class="lg-tile__tg" data-tile="' + i + '"><span class="lg-tile__tgn">대상자 <b>…</b></span></div>' : "")
        + '</div>';
    }).join("") + '</div>';
  }

  /* ---------- 관리자: 크루별 이수 현황 (서명 세션 roster.extra) ---------- */
  var SHORT = { harass: "괴롭힘", sexual: "성희롱", disab: "장애인 인식", safety: "산업안전", privacy: "개인정보", pension: "퇴직연금" };
  function loadBoard(sid) {
    if (!canDb()) return Promise.resolve(null);
    return sb().from("roster").select("seq,dept,name,extra,signed_at").eq("session_id", sid).order("seq", { ascending: true })
      .then(function (r) { return r.error ? null : (r.data || []); }).catch(function () { return null; });
  }
  function shortWhen(iso) {
    var d = new Date(iso); if (!iso || isNaN(d)) return "";
    var p = function (n) { return ("0" + n).slice(-2); };
    return (d.getMonth() + 1) + "/" + d.getDate() + " " + p(d.getHours()) + ":" + p(d.getMinutes());
  }
  function boardHtml(Y, rows, onlyLeft) {
    var keys = Y.edus.map(function (e) { return e.key; });
    function done(r, k) { return (r.extra || {})[k] === "O"; }
    function skip(r, k) { return (r.extra || {})[k] === "-"; }
    function left(r) { return keys.filter(function (k) { return !skip(r, k) && !done(r, k); }).length; }
    var tot = {}; keys.forEach(function (k) { tot[k] = { d: 0, n: 0 }; });
    rows.forEach(function (r) { keys.forEach(function (k) { if (!skip(r, k)) { tot[k].n++; if (done(r, k)) tot[k].d++; } }); });
    var all = rows.filter(function (r) { return left(r) === 0; }).length, signed = rows.filter(function (r) { return r.signed_at; }).length;
    var list = onlyLeft ? rows.filter(function (r) { return left(r) > 0; }) : rows;
    var parts = ["가든", "스낵", "총무지원"], groups = parts.map(function (pt) { return { pt: pt, rows: list.filter(function (r) { return r.dept === pt; }) }; })
      .concat([{ pt: "기타", rows: list.filter(function (r) { return parts.indexOf(r.dept) < 0; }) }]).filter(function (g) { return g.rows.length; });
    return '<div class="lg-bd__top"><p><b>' + all + '</b> / ' + rows.length + '명 모두 완료 · 서명 <b>' + signed + '</b>명</p>'
      + '<label class="lg-bd__only"><input type="checkbox" id="lgBdOnly"' + (onlyLeft ? " checked" : "") + ' /> 아직 남은 크루만 보기</label></div>'
      + '<div class="lg-bd__wrap"><table class="lg-bd"><thead><tr><th scope="col">크루</th>'
      + keys.map(function (k) { return '<th scope="col">' + esc(SHORT[k] || k) + '<small>' + tot[k].d + ' / ' + tot[k].n + '</small></th>'; }).join("")
      + '<th scope="col">서명</th></tr></thead><tbody>'
      + (groups.length ? groups.map(function (g) {
          return '<tr class="lg-bd__part"><th colspan="' + (keys.length + 2) + '">' + esc(g.pt === "스낵" ? "스낵큐레이션" : g.pt) + ' · ' + g.rows.length + '명</th></tr>'
            + g.rows.map(function (r) {
                var nh = isNewHire(Y, r.name);
                return '<tr' + (left(r) === 0 ? ' class="is-all"' : "") + '><th scope="row">' + esc(shortName(r.name)) + (nh ? '<i>' + esc(Y.newHires.short) + '</i>' : "") + '</th>'
                  + keys.map(function (k) {
                      if (skip(r, k)) return '<td class="is-skip">제외</td>';
                      if (done(r, k)) return '<td class="is-done"><b>✓</b><small>' + esc(shortWhen((r.extra || {})["at_" + k])) + '</small></td>';
                      return '<td class="is-none">–</td>';
                    }).join("")
                  + '<td class="' + (r.signed_at ? "is-done" : "is-none") + '">' + (r.signed_at ? '<b>✓</b><small>' + esc(shortWhen(r.signed_at)) + '</small>' : "–") + '</td></tr>';
              }).join("");
        }).join("") : '<tr><td colspan="' + (keys.length + 2) + '" class="is-none">모든 크루가 교육을 마쳤어요</td></tr>')
      + '</tbody></table></div>';
  }
  function mountBoard(Y) {
    var box = document.getElementById("lgBoard"); if (!box || !Y.signs) return;
    loadBoard(Y.signs.all.id).then(function (rows) {
      if (!rows) { box.innerHTML = '<p class="hint">이수 현황을 불러오지 못했어요.</p>'; return; }
      var only = false;
      function paint() {
        box.innerHTML = boardHtml(Y, rows, only);
        var c = document.getElementById("lgBdOnly"); if (c) c.onchange = function () { only = c.checked; paint(); };
      }
      paint();
    });
  }

  function regHtml(P) {
    return '<dl class="lg-reg">' + P.reg.map(function (r) {
      return '<div><dt>' + esc(r.k) + '</dt><dd><b>' + esc(r.v) + '</b>' + (r.ex ? '<small>' + esc(r.ex) + '</small>' : "")
        + (r.ex ? "" : '<button type="button" class="lg-copy" data-copy="' + esc(r.v) + '">복사</button>') + '</dd></div>';
    }).join("") + '</dl>';
  }

  document.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest(".lg-waitbox");
    if (!b) return;
    b.classList.remove("is-wiggle"); void b.offsetWidth; b.classList.add("is-wiggle");
    toast("영상이 올라오면 이 버튼에서 바로 볼 수 있어요. 조금만 기다려 주세요!");
  });

  /* opts: { pub, admin, by, head(html), shareUrl, year, sel } */
  function render(view, opts) {
    opts = opts || {};
    var y = opts.year || YEARS[0].year;
    var Y = yearData(y);
    var keys = Y.edus.map(function (e) { return e.key; });
    if (opts.pub) {
      var hk = location.hash.replace(/^#/, "");
      if (keys.indexOf(hk) > -1 && (!opts.sel || opts._fromHash)) opts.sel = hk;
      if (!opts._hashBound) {
        opts._hashBound = true;
        window.addEventListener("hashchange", function () {
          var k = location.hash.replace(/^#/, "");
          if (k && k !== opts.sel && yearData(opts.year || YEARS[0].year).edus.some(function (e) { return e.key === k; })) {
            opts.sel = k; render(view, opts);
            var d = document.getElementById("lgDetail"); if (d) d.scrollIntoView({ block: "start" });
          }
        });
      }
    }
    var sel = keys.indexOf(opts.sel) > -1 ? opts.sel : keys[0];
    var dd = dday(Y.date);
    var big = lsGet("edu-legal-big") === "1";

    view.innerHTML = '<div class="wrap lg' + (big ? " is-big" : "") + '">'
      + '<div class="lg-tools">'
        + (YEARS.length > 1 || !opts.pub ? '<div class="lg-years" role="tablist" aria-label="년도">' + years().map(function (v) {
            return '<button type="button" role="tab" data-year="' + v + '" aria-selected="' + (v === y) + '">' + v + '년</button>';
          }).join("") + '</div>' : "<span></span>")
        + '<button type="button" class="lg-big" id="lgBig" aria-pressed="' + big + '">가<b>가</b> 글자 ' + (big ? "작게" : "크게") + '</button>'
      + '</div>'
      + '<header class="lg-top"><p class="lg-eyebrow">' + y + ' · 법정의무교육</p>'
        + '<h2 class="lg-h1">' + esc(Y.title) + '</h2>'
        + '<p class="lg-lede">' + esc(Y.lede) + '</p>'
        + '<p class="lg-facts"><span>대상 <b>모든 크루 (필수)</b></span><span>교육 <b>6가지</b></span></p>'
      + '</header>'

      // 1) 한눈에 보기 — 4칸 (요약은 여기 하나)
      + '<h3 class="lg-sec">한눈에 보기</h3>'
      + '<div id="lgTiles">' + tilesHtml(Y, Y.links) + '</div>'
      + '<div class="lg-acts" id="lgAgit"></div>'


      // 2) 교육 6가지 — 누르면 아래 상세
      + '<h3 class="lg-sec">교육 6가지 <small>눌러서 자세히 보기</small></h3>'
      + cardsHtml(Y, sel)
      + '<section class="lg-d" id="lgDetail" role="tabpanel" aria-live="polite"></section>'

      + (opts.pub || !Y.signs ? "" : '<div class="sec-h"><h3>크루별 이수 현황</h3><span class="ss-sub">크루가 체크한 교육 · 체크한 시간</span></div><div id="lgBoard"><p class="hint">불러오는 중…</p></div>')
      + (opts.pub ? "" : '<div class="sec-h"><h3>크루에게 공유</h3>' + (opts.admin ? '<button class="btn btn--sm" id="lgEditLinks">링크 넣기</button>' : "") + '</div>'
          + '<div class="share-box"><div style="flex:1;min-width:200px"><p class="hint" style="margin:0 0 6px">크루용 보기 페이지 (로그인 없이 보기만)</p>'
          + '<input type="text" readonly value="' + esc(opts.shareUrl || "") + '" id="lgUrl" /></div>'
          + '<button class="btn btn--sm" id="lgCopy">링크 복사</button>'
          + '<img class="qr-box" width="72" height="72" alt="QR" src="https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=' + encodeURIComponent(opts.shareUrl || "") + '" /></div>'
          + '<p class="hint" id="lgDbHint"></p>')
      + '</div>';

    var root = view.querySelector(".lg");
    var L = Object.assign({}, Y.links);
    function paintDetail(scroll) {
      var e = Y.edus.filter(function (x) { return x.key === sel; })[0];
      var d = document.getElementById("lgDetail");
      d.innerHTML = detailHtml(Y, e, L);
      d.querySelectorAll("[data-copy]").forEach(function (b) {
        b.onclick = function () {
          var v = b.dataset.copy;
          (navigator.clipboard ? navigator.clipboard.writeText(v) : Promise.reject()).then(function () { toast(v + " 복사했어요"); }).catch(function () { toast(v); });
        };
      });
      if (scroll) d.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    root.querySelectorAll(".lg-card").forEach(function (c) {
      c.onclick = function () {
        sel = opts.sel = c.dataset.edu;
        root.querySelectorAll(".lg-card").forEach(function (x) { var on = x === c; x.classList.toggle("is-on", on); x.setAttribute("aria-selected", on); });
        if (opts.pub && history.replaceState) history.replaceState(null, "", "#" + sel);
        paintDetail(true);
      };
    });
    root.querySelectorAll(".lg-years [data-year]").forEach(function (b) {
      b.onclick = function () { opts.year = +b.dataset.year; opts.sel = null; render(view, opts); };
    });
    document.getElementById("lgBig").onclick = function () { lsSet("edu-legal-big", big ? "0" : "1"); render(view, opts); };
    var cp = document.getElementById("lgCopy");
    if (cp) cp.onclick = function () {
      var input = document.getElementById("lgUrl");
      (navigator.clipboard ? navigator.clipboard.writeText(input.value) : Promise.reject()).then(function () { toast("링크를 복사했습니다"); })
        .catch(function () { input.select(); document.execCommand("copy"); toast("링크를 복사했습니다"); });
    };
    function bindGo() {
      root.querySelectorAll("[data-go]").forEach(function (g) {
        g.onclick = function () { var c = root.querySelector('.lg-card[data-edu="' + g.dataset.go + '"]'); if (c) c.click(); };
      });
    }
    bindGo();
    paintDetail(false);
    if (!opts.pub) mountBoard(Y);

    loadLinks(y).then(function (st) {
      L = st.links;
      var a = document.getElementById("lgAgit");
      if (a) a.innerHTML = safeUrl(L.agit) ? btn(L.agit, "아지트 공지 원문 보기", false, IC.doc) : (opts.pub ? "" : opts.admin ? '<button type="button" class="lg-b lg-addlink" id="lgAgitAdd">+ 아지트 공지 링크 넣기</button>' : "");
      paintDetail(false);
      var tl = document.getElementById("lgTiles"); if (tl) { tl.innerHTML = tilesHtml(Y, L); bindGo(); }
      if (Y.targetWays) loadCrews().then(function (cr) {
        var admin = !opts.pub && opts.admin && !st.missing;
        root.querySelectorAll(".lg-tile__tg[data-tile]").forEach(function (box) {
          var t = Y.tiles[+box.dataset.tile];
          box.innerHTML = tileTgHtml(t, L, cr.crews, admin);
          var cb = box.querySelector("[data-tgcheck]"); if (cb) cb.onclick = function () { openTileCheck(Y, t, L, cr.crews); };
          var sb2 = box.querySelector("[data-tgset]"); if (sb2) sb2.onclick = function () {
            if (!cr.crews.length) { toast("크루 명단을 불러오지 못했어요"); return; }
            openSet(Y, y, L, cr.crews, opts, function () { render(view, opts); }, t.tg.field, t.tg.field === "targets" ? "구글 미트 · 영상 교육" : t.what);
          };
        });
      });
      var h = document.getElementById("lgDbHint");
      if (h) h.textContent = st.missing ? "링크 저장 표가 아직 없어요 — supabase/legal.sql 을 실행하면 '링크 넣기'로 넣은 링크가 크루 화면에도 보여요."
        : st.updatedAt ? "링크 마지막 수정: " + String(st.updatedAt).slice(0, 16).replace("T", " ") + (st.updatedBy ? " · " + st.updatedBy : "") : "";
      var eb = document.getElementById("lgEditLinks");
      if (eb) eb.onclick = function () { openLinks(y, L, opts, function () { render(view, opts); }, st); };
      var ab = document.getElementById("lgAgitAdd");
      if (ab) ab.onclick = function () { openLinks(y, L, opts, function () { render(view, opts); }, st); setTimeout(function () { var i = document.querySelector('.modal input[name="agit"]'); if (i) i.focus(); }, 50); };
    });
  }

  function openLinks(y, L, opts, done, st) {
    var wrap = document.createElement("div");
    wrap.className = "modal";
    wrap.innerHTML = '<div class="modal__backdrop" data-close></div>'
      + '<div class="modal__card" role="dialog" aria-modal="true">'
      + '<div class="modal__head"><h3>' + y + '년 법정의무교육 링크</h3><button class="modal__x" data-close aria-label="닫기">×</button></div>'
      + '<form>' + LINK_META.map(function (m) {
          return '<label class="fld"><span>' + esc(m.label) + '</span><input type="url" name="' + m.key + '" placeholder="https://" value="' + esc(L[m.key] || "") + '" /><small class="hint">' + esc(m.hint) + ' · 비우면 버튼이 &lsquo;준비 중&rsquo;으로 보여요</small></label>';
        }).join("")
      + (st.missing ? '<p class="hint">링크 저장 표(supabase/legal.sql)가 아직 없어서 저장할 수 없어요.</p>' : "")
      + '<div class="modal__foot"><div class="modal__spacer"></div><button type="button" class="btn" data-close>취소</button><button type="submit" class="btn btn--primary"' + (st.missing ? " disabled" : "") + '>저장</button></div>'
      + '</form></div>';
    document.body.appendChild(wrap);
    function close() { wrap.remove(); }
    wrap.querySelectorAll("[data-close]").forEach(function (x) { x.onclick = close; });
    wrap.querySelector("form").onsubmit = function (e) {
      e.preventDefault();
      var f = e.target, out = Object.assign({}, L), bad = "";
      LINK_META.forEach(function (m) { var v = f[m.key].value.trim(); if (v && !safeUrl(v)) bad = m.label; out[m.key] = v; });
      if (bad) { toast(bad + " — https:// 로 시작하는 주소를 넣어 주세요"); return; }
      var b = f.querySelector("[type=submit]"); b.disabled = true; b.textContent = "저장 중…";
      saveLinks(y, out, opts.by).then(function () { toast("링크를 저장했어요"); close(); done(); })
        .catch(function (err) { b.disabled = false; b.textContent = "저장"; toast("저장하지 못했어요: " + (err && err.message || err)); });
    };
  }

  // 홈 카드용 요약
  function summary() { var Y = YEARS[0]; return { year: Y.year, dateLabel: Y.dateLabel, dday: dday(Y.date) }; }

  window.EduLegal = { render: render, summary: summary, years: years };
})();
