/* =========================================================
   EDU — 법정의무교육 (모든 크루 필수 · 년도별 관리)
   · 년도 데이터: 아래 YEARS — 새 해가 오면 맨 위에 한 덩어리 추가
   · 링크(아지트 공지 · 구글 미트 · 개인정보 온라인 교육 · 퇴직연금 자료):
     관리자 화면 '링크 넣기'로 넣음 → Supabase edu_legal (supabase/legal.sql)
     표가 없으면 YEARS 안의 links 값으로 보여 줌
   · 크루용 공개 보기: legal.html (로그인 없음)
   ========================================================= */
(function () {
  "use strict";

  var YEARS = [
    {
      year: 2026,
      title: "2026년 법정의무교육",
      date: "2026-11-12", dateLabel: "11월 12일 (목)", place: "구글 미트 (온라인)",
      from: "율",
      intro: "법정의무교육은 모든 크루가 반드시 들어야 하는 필수 교육이에요. 회사와 크루 모두의 권리와 의무를 지키기 위한 교육이니 미리 일정을 확인해 주세요.",
      sessions: [
        { name: "직장 내 괴롭힘 예방교육", am: "10:00~10:30", pm: "14:00~14:30", min: 30 },
        { name: "직장 내 성희롱 예방교육", am: "10:30~11:10", pm: "14:30~15:10", min: 40 },
        { name: "직장 내 장애인 인식개선교육", am: "11:10~11:50", pm: "15:10~15:50", min: 40 },
        { name: "산업안전보건교육", am: "11:50~12:30", pm: "15:50~16:30", min: 40 }
      ],
      others: [
        { name: "개인정보보호교육", how: "온라인 교육", note: "별도 안내 예정", link: "privacy" },
        { name: "퇴직연금교육", how: "아지트 안내 자료로 대체", note: "아지트 자료를 읽으면 돼요", link: "pension" }
      ],
      checks: [
        { t: "모든 크루 필수", d: "법정의무교육은 빠짐없이 모두 들어야 해요." },
        { t: "11월 12일 (목) · 구글 미트", d: "같은 교육이 오전과 오후에 한 번씩 열려요. 시간표를 보고 미리 일정을 비워 두세요." },
        { t: "개인정보보호교육은 온라인", d: "따로 안내가 나가요. 안내가 오면 기간 안에 꼭 들어 주세요." },
        { t: "퇴직연금교육은 아지트 자료로", d: "아지트에 올라온 안내 자료를 읽으면 교육을 대신해요." }
      ],
      notice: "복지큐레이션센터 크루 중 구글 워크스페이스(GWS) 계정이 없는 4·6·8시간 크루는 따로 교육할 예정이에요.",
      links: { agit: "", meet: "", privacy: "", pension: "" }
    }
  ];

  var LINK_META = [
    { key: "agit", label: "아지트 공지 원문", hint: "2026년 법정의무교육 안내 글 링크" },
    { key: "meet", label: "구글 미트 입장 링크", hint: "교육 당일 들어가는 주소" },
    { key: "privacy", label: "개인정보보호교육 (온라인)", hint: "온라인 교육 안내 · 수강 링크" },
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
    chk: svg('<circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/>'),
    cam: svg('<rect x="3" y="6" width="13" height="12" rx="2"/><path d="M16 10l5-3v10l-5-3"/>'),
    info: svg('<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>')
  };

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

  function dday(dateStr) {
    var t = new Date(dateStr + "T00:00:00"), n = new Date(); n.setHours(0, 0, 0, 0);
    var d = Math.round((t - n) / 86400000);
    if (d > 0) return { txt: "D-" + d, state: "soon" };
    if (d === 0) return { txt: "오늘", state: "today" };
    return { txt: "완료", state: "done" };
  }
  function linkBtn(url, label, primary) {
    url = safeUrl(url);
    if (!url) return '<span class="btn btn--sm btn--disabled lg-btn" aria-disabled="true">' + esc(label) + ' · 링크 준비 중</span>';
    return '<a class="btn btn--sm lg-btn' + (primary ? " btn--primary" : "") + '" href="' + esc(url) + '" target="_blank" rel="noopener">' + esc(label) + IC.ext + '</a>';
  }

  /* opts: { pub, admin, by, head(html), shareUrl, year } */
  function render(view, opts) {
    opts = opts || {};
    var y = opts.year || YEARS[0].year;
    var Y = yearData(y);
    var dd = dday(Y.date);
    view.innerHTML = '<div class="wrap lg">' + (opts.head || "")
      + (YEARS.length > 1 || !opts.pub ? '<div class="lg-years" role="tablist" aria-label="년도">' + years().map(function (v) {
          return '<button type="button" role="tab" data-year="' + v + '"' + (v === y ? ' aria-selected="true"' : "") + '>' + v + '년</button>';
        }).join("") + '</div>' : "")
      + '<section class="lg-hero">'
        + '<div class="lg-hero__main"><p class="eyebrow">' + y + ' · 법정의무교육</p>'
          + '<h3>' + esc(Y.title) + '</h3><p class="lg-hero__intro">' + esc(Y.intro) + '</p>'
          + '<div class="lg-acts" id="lgActs"><span class="btn btn--sm btn--disabled">링크 불러오는 중…</span></div></div>'
        + '<dl class="lg-hero__facts">'
          + '<div><dt>교육 날짜</dt><dd>' + esc(Y.dateLabel) + ' <span class="lg-dday lg-dday--' + dd.state + '">' + dd.txt + '</span></dd></div>'
          + '<div><dt>장소</dt><dd>' + esc(Y.place) + '</dd></div>'
          + '<div><dt>대상</dt><dd>모든 크루 (필수)</dd></div>'
        + '</dl>'
      + '</section>'
      + '<div class="sec-h"><h3>꼭 확인해 주세요</h3></div>'
      + '<ol class="lg-checks">' + Y.checks.map(function (c, i) {
          return '<li><span class="lg-checks__n">' + (i + 1) + '</span><div><b>' + esc(c.t) + '</b><p>' + esc(c.d) + '</p></div></li>';
        }).join("") + '</ol>'
      + '<div class="sec-h"><h3>교육 시간표</h3><span class="ss-sub">' + esc(Y.dateLabel) + ' · ' + esc(Y.place) + '</span></div>'
      + '<div class="lg-table-wrap"><table class="lg-table"><thead><tr><th scope="col">교육</th><th scope="col">오전</th><th scope="col">오후</th></tr></thead><tbody>'
        + Y.sessions.map(function (s) {
            return '<tr><th scope="row">' + esc(s.name) + '<small>' + s.min + '분</small></th><td>' + esc(s.am) + '</td><td>' + esc(s.pm) + '</td></tr>';
          }).join("")
        + Y.others.map(function (o) {
            return '<tr class="lg-table__other"><th scope="row">' + esc(o.name) + '</th><td colspan="2"><b>' + esc(o.how) + '</b><small>' + esc(o.note) + '</small></td></tr>';
          }).join("")
      + '</tbody></table></div>'
      + '<p class="lg-tip">' + IC.info + '<span>같은 교육이 오전과 오후에 한 번씩 열려요.</span></p>'
      + '<div class="sec-h"><h3>따로 하는 교육</h3></div>'
      + '<div class="quick-grid lg-others" id="lgOthers"></div>'
      + '<div class="lg-notice">' + IC.info + '<p>' + esc(Y.notice) + '</p></div>'
      + (opts.pub ? "" : '<div class="sec-h"><h3>크루에게 공유</h3>' + (opts.admin ? '<button class="btn btn--sm" id="lgEditLinks">링크 넣기</button>' : "") + '</div>'
          + '<div class="share-box"><div style="flex:1;min-width:200px"><p class="hint" style="margin:0 0 6px">크루용 보기 페이지 (로그인 없이 보기만)</p>'
          + '<input type="text" readonly value="' + esc(opts.shareUrl || "") + '" id="lgUrl" /></div>'
          + '<button class="btn btn--sm" id="lgCopy">링크 복사</button>'
          + '<img class="qr-box" width="72" height="72" alt="QR" src="https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=' + encodeURIComponent(opts.shareUrl || "") + '" /></div>'
          + '<p class="hint" id="lgDbHint"></p>')
      + '</div>';

    view.querySelectorAll(".lg-years [data-year]").forEach(function (b) {
      b.onclick = function () { opts.year = +b.dataset.year; render(view, opts); };
    });
    var cp = document.getElementById("lgCopy");
    if (cp) cp.onclick = function () {
      var input = document.getElementById("lgUrl");
      (navigator.clipboard ? navigator.clipboard.writeText(input.value) : Promise.reject()).then(function () { toast("링크를 복사했습니다"); })
        .catch(function () { input.select(); document.execCommand("copy"); toast("링크를 복사했습니다"); });
    };

    loadLinks(y).then(function (st) {
      var L = st.links;
      var acts = document.getElementById("lgActs");
      if (acts) acts.innerHTML = linkBtn(L.agit, "아지트 공지 보기", true) + linkBtn(L.meet, "구글 미트 들어가기");
      var oth = document.getElementById("lgOthers");
      if (oth) oth.innerHTML = Y.others.map(function (o) {
        return '<div class="quick"><div class="quick__h">' + IC.chk + '<b>' + esc(o.name) + '</b><span class="pill">' + esc(o.how) + '</span></div>'
          + '<p>' + esc(o.note) + '</p><div>' + linkBtn(L[o.link], o.link === "pension" ? "아지트 자료 보기" : "교육 안내 보기") + '</div></div>';
      }).join("");
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
          return '<label class="fld"><span>' + esc(m.label) + '</span><input type="url" name="' + m.key + '" placeholder="https://" value="' + esc(L[m.key] || "") + '" /><small class="hint">' + esc(m.hint) + ' · 비우면 &lsquo;링크 준비 중&rsquo;으로 보여요</small></label>';
        }).join("")
      + (st.missing ? '<p class="hint">링크 저장 표(supabase/legal.sql)가 아직 없어서 저장할 수 없어요.</p>' : "")
      + '<div class="modal__foot"><div class="modal__spacer"></div><button type="button" class="btn" data-close>취소</button><button type="submit" class="btn btn--primary"' + (st.missing ? " disabled" : "") + '>저장</button></div>'
      + '</form></div>';
    document.body.appendChild(wrap);
    function close() { wrap.remove(); }
    wrap.querySelectorAll("[data-close]").forEach(function (x) { x.onclick = close; });
    wrap.querySelector("form").onsubmit = function (e) {
      e.preventDefault();
      var f = e.target, out = {}, bad = "";
      LINK_META.forEach(function (m) { var v = f[m.key].value.trim(); if (v && !safeUrl(v)) bad = m.label; out[m.key] = v; });
      if (bad) { toast(bad + " — https:// 로 시작하는 주소를 넣어 주세요"); return; }
      var btn = f.querySelector("[type=submit]"); btn.disabled = true; btn.textContent = "저장 중…";
      saveLinks(y, out, opts.by).then(function () { toast("링크를 저장했어요"); close(); done(); })
        .catch(function (err) { btn.disabled = false; btn.textContent = "저장"; toast("저장하지 못했어요: " + (err && err.message || err)); });
    };
  }

  // 홈 카드용 요약
  function summary() { var Y = YEARS[0]; return { year: Y.year, dateLabel: Y.dateLabel, dday: dday(Y.date) }; }

  window.EduLegal = { render: render, summary: summary, years: years };
})();
