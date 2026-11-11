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
      brief: [
        { k: "11월 12일 (목)", v: "구글 미트로 교육 4가지를 들어요.", s: "오전 10:00 ~ 12:30 또는 오후 14:00 ~ 16:30" },
        { k: "11월 30일까지", v: "개인정보보호교육을 온라인으로 들어요.", s: "개인정보배움터 · 15분 30초" },
        { k: "아지트 자료", v: "퇴직연금교육은 아지트 안내 자료를 읽어요.", s: "따로 모이지 않아요" }
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
        target: "링키지랩 크루 전체 (성수 · 판교 모든 크루)",
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
          "수료증은 내지 않아도 돼요. 관리자가 교육을 마쳤는지 확인할 수 있어요.",
          "11월 ~ 12월 중 접근성팀 UT 크루 수강 지원이 있을 예정이에요."
        ],
        guide: "https://kko.to/dYGDUOsk-i"
      },
      checks: [
        { t: "모든 크루가 꼭 들어요", d: "법정의무교육은 빠짐없이 모두 들어야 해요." },
        { t: "구글 미트 교육은 11월 12일 (목)", d: "오전이나 오후에 시간을 비워 두세요." },
        { t: "개인정보보호교육은 11월 30일까지", d: "온라인으로 혼자 들어요. 15분 30초면 끝나요." },
        { t: "퇴직연금교육은 아지트 자료", d: "아지트에 올라온 안내 자료를 읽어요." }
      ],
      notice: "복지큐레이션센터 크루 중 구글 워크스페이스(GWS) 계정이 없는 4·6·8시간 크루는 따로 교육할 예정이에요.",
      links: { agit: "", pension: "" }
    }
  ];

  var LINK_META = [
    { key: "agit", label: "아지트 공지 원문", hint: "2026년 법정의무교육 안내 글 링크" },
    { key: "pension", label: "퇴직연금교육 아지트 자료", hint: "아지트 안내 자료 링크" }
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
    info: svg('<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>')
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
        + '</button>';
    }).join("") + '</div>';
  }

  /* ---------- 고른 교육 상세 ---------- */
  function detailHtml(Y, e, L) {
    var m = eduMeta(Y, e), idx = Y.edus.indexOf(e) + 1;
    var h = '<div class="lg-d__head"><div class="lg-d__tags"><span class="lg-badge is-acc">' + ("0" + idx).slice(-2) + ' / 0' + Y.edus.length + '</span><span class="lg-badge">' + esc(m.tag) + '</span></div>'
      + '<h3 class="lg-d__name">' + esc(e.name) + '</h3></div>'
      + '<dl class="lg-easy"><dt>무엇을 배워요?</dt><dd>' + esc(e.what) + '</dd><dt>왜 들어요?</dt><dd>' + esc(e.why) + '</dd>';
    if (e.kind === "meet") {
      h += '<dt>언제 들어요?</dt><dd>' + esc(Y.dateLabel) + ' · ' + MEET_EASY_WHEN + '</dd></dl>'
        + '<h4 class="lg-h4">시간과 구글 미트</h4><div class="lg-slots">'
        + ["am", "pm"].map(function (k) {
            var M = Y.meets[k];
            return '<div class="lg-slot"><div class="lg-slot__h"><span class="lg-badge is-acc">' + esc(M.label) + '</span><b>' + esc(M.when) + '</b></div>'
              + '<p class="lg-slot__time">' + esc(e[k]) + '</p><p class="lg-slot__sub">' + e.min + '분 · ' + esc(M.when) + ' 미트는 ' + esc(M.time) + ' 동안 열려요</p>'
              + btn(M.url, M.when + " 구글 미트 들어가기", true, IC.cam) + '</div>';
          }).join("") + '</div>';
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
        + '<div class="lg-acts">' + btn(P.guide, "수강 안내 (텍스트) 보기", false, IC.doc) + '</div>';
    } else {
      h += '<dt>어떻게 해요?</dt><dd>아지트에 올라온 퇴직연금 안내 자료를 끝까지 읽어요.</dd></dl>'
        + '<div class="lg-acts">' + btn(L.pension, "아지트 자료 보기", true, IC.doc) + '</div>';
    }
    return h;
  }
  function regHtml(P) {
    return '<dl class="lg-reg">' + P.reg.map(function (r) {
      return '<div><dt>' + esc(r.k) + '</dt><dd><b>' + esc(r.v) + '</b>' + (r.ex ? '<small>' + esc(r.ex) + '</small>' : "")
        + (r.ex ? "" : '<button type="button" class="lg-copy" data-copy="' + esc(r.v) + '">복사</button>') + '</dd></div>';
    }).join("") + '</dl>';
  }

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
        + '<p class="lg-facts"><span>대상 <b>모든 크루 (필수)</b></span><span>교육 <b>6가지</b></span><span>구글 미트 <b>' + esc(Y.dateLabel) + '</b> <i class="lg-dday lg-dday--' + dd.state + '">' + dd.txt + '</i></span></p>'
      + '</header>'

      // 1) 한눈에 보기 — 간단히 전달
      + '<section class="lg-brief" aria-label="한눈에 보기"><h3 class="lg-sec">한눈에 보기</h3>'
        + '<ol class="lg-brief__list">' + Y.brief.map(function (b) {
            return '<li><span class="lg-brief__k">' + esc(b.k) + '</span><span class="lg-brief__v"><b>' + esc(b.v) + '</b><small>' + esc(b.s) + '</small></span></li>';
          }).join("") + '</ol>'
        + '<div class="lg-acts" id="lgAgit"></div>'
      + '</section>'

      // 2) 교육 6가지 — 누르면 아래 상세
      + '<h3 class="lg-sec">교육 6가지 <small>눌러서 자세히 보기</small></h3>'
      + cardsHtml(Y, sel)
      + '<section class="lg-d" id="lgDetail" role="tabpanel" aria-live="polite"></section>'

      // 3) 꼭 확인해 주세요
      + '<h3 class="lg-sec">꼭 확인해 주세요</h3>'
      + '<ol class="lg-checks">' + Y.checks.map(function (c, i) {
          return '<li><span class="lg-checks__n">' + (i + 1) + '</span><div><b>' + esc(c.t) + '</b><p>' + esc(c.d) + '</p></div></li>';
        }).join("") + '</ol>'
      + '<div class="lg-notice">' + IC.info + '<p>' + esc(Y.notice) + '</p></div>'

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
    paintDetail(false);

    loadLinks(y).then(function (st) {
      L = st.links;
      var a = document.getElementById("lgAgit");
      if (a) a.innerHTML = safeUrl(L.agit) ? btn(L.agit, "아지트 공지 원문 보기", false, IC.doc) : (opts.pub ? "" : '<span class="lg-b is-off">아지트 공지 · 링크 넣기로 추가</span>');
      paintDetail(false);
      var h = document.getElementById("lgDbHint");
      if (h) h.textContent = st.missing ? "링크 저장 표가 아직 없어요 — supabase/legal.sql 을 실행하면 '링크 넣기'로 넣은 링크가 크루 화면에도 보여요."
        : st.updatedAt ? "링크 마지막 수정: " + String(st.updatedAt).slice(0, 16).replace("T", " ") + (st.updatedBy ? " · " + st.updatedBy : "") : "";
      var eb = document.getElementById("lgEditLinks");
      if (eb) eb.onclick = function () { openLinks(y, L, opts, function () { render(view, opts); }, st); };
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
