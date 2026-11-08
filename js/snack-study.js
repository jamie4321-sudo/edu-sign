/* =========================================================
   EDU — 스낵 교육 · 스낵&가든 AI 스터디 (Gemini 업무 활용 YouTube 강의)
   · 원본: 구글 시트 「26년_스낵&가든사업팀 AI 스터디」 (2026-11-08 옮김)
   · 기준: 추천 강의 5개 중 2개 이상 보고 체크
   · 데이터: Supabase snack_study (supabase/snack_study.sql) — 표가 없으면 시트 값으로 보기만
   · 고치기: 스낵 자료 권한(material:snack) 또는 총괄만 — 칸 눌러 체크, 계획·비고는 창에서
   ========================================================= */
(function () {
  "use strict";
  var SHEET_URL = "https://docs.google.com/spreadsheets/d/11j9JZDncX_N10VfcW1XWxsxAZmSD59m3j2Ui31I6tUU/edit";
  var GOAL = 2;
  var COURSES = [
    { key: "c1", by: "디지털 거북이", title: "제미나이 종합", yt: "buR2JBfu81g", url: "https://youtu.be/buR2JBfu81g?si=JSb6by4YlYGc02L3" },
    { key: "c2", by: "디지털 거북이", title: "나노바나나 이미지 만들기 1", yt: "b8YE-UAJPQM", url: "https://youtu.be/b8YE-UAJPQM?si=YKMsboKsBzne-BKZ" },
    { key: "c3", by: "온선 (온라인 선생님)", title: "제미나이 - 구글독스 활용", yt: "Khfvg9161e4", url: "https://youtu.be/Khfvg9161e4?si=8WuePcbiJFbXxdtx" },
    { key: "c4", by: "온선 (온라인 선생님)", title: "나노바나나 이미지 만들기 2", yt: "wcl41hexeYU", url: "https://youtu.be/wcl41hexeYU?si=DVja2NBIVFxYQlxu" },
    { key: "c5", by: "온선 (온라인 선생님)", title: "제미나이 PPT 만들기", yt: "r0ChLeG8gck", url: "https://youtu.be/r0ChLeG8gck?si=Zs1LCZm7L2hydHxa" }
  ];
  var ALL = ["c1", "c2", "c3", "c4", "c5"];
  // 시트 값 (2026-11-08) — Supabase 표가 없거나 데모일 때
  var SEED = [
    { name: "엔조", done: ALL, plan: "하반기에는 AI를 활용해 오아시스 현장관리 시스템을 완성하고, 현장에 전파·정착시켜 활용도를 높이는 한편, 링크업 프로젝트에도 적극 참여하겠습니다." },
    { name: "스완", done: [] },
    { name: "린지", done: ALL, plan: "하반기 윤리강령포스터를 포스터 및 영상으로도 만들어, 4h크루가 더욱 이해하기 쉽고 집중할 수 있는 자료를 만들겠습니다." },
    { name: "마린", done: ["c1", "c2", "c3"] },
    { name: "아셀라", done: ALL },
    { name: "애셔", done: ALL },
    { name: "튜브", done: [] },
    { name: "니아", done: ["c1", "c2"] },
    { name: "베라", done: ["c2", "c4", "c5"] },
    { name: "엘리", done: [] }
  ].map(function (r, i) { return { name: r.name, seq: i + 1, done: r.done.slice(), plan: r.plan || "", note: "" }; });

  var DEMO = /[?&]demo=1(&|$)/.test(location.search);
  var S = (window.CONFIG && window.CONFIG.supabase) || {};
  var _sb = null;
  function sb() { if (!_sb) _sb = window.supabase.createClient(S.url, S.anonKey); return _sb; }
  function canDb() { return !DEMO && !!(S.url && S.anonKey && window.supabase && window.supabase.createClient); }

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function toast(msg) { var el = document.createElement("div"); el.className = "toast"; el.textContent = msg; document.body.appendChild(el); setTimeout(function () { el.remove(); }, 2400); }
  function linkify(t) { return esc(t).replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>'); }

  // → { rows, live }  live=false 면 시트 값(보기만)
  function load() {
    if (!canDb()) return Promise.resolve({ rows: SEED.map(clone), live: false, demo: DEMO });
    return sb().from("snack_study").select("*").order("seq", { ascending: true }).then(function (r) {
      if (r.error) return { rows: SEED.map(clone), live: false, missing: true };
      return { rows: (r.data || []).map(function (x) { return { name: x.name, seq: x.seq, done: Array.isArray(x.done) ? x.done : [], plan: x.plan || "", note: x.note || "", updatedAt: x.updated_at, updatedBy: x.updated_by }; }), live: true };
    }).catch(function () { return { rows: SEED.map(clone), live: false, missing: true }; });
  }
  function clone(r) { return { name: r.name, seq: r.seq, done: r.done.slice(), plan: r.plan, note: r.note }; }
  function save(row, by) {
    return sb().from("snack_study").update({ done: row.done, plan: row.plan, note: row.note, updated_at: new Date().toISOString(), updated_by: by || null })
      .eq("name", row.name).then(function (r) { if (r.error) throw r.error; });
  }

  function stats(rows) {
    var n = rows.length, goal = 0, full = 0, plan = 0, per = {};
    COURSES.forEach(function (c) { per[c.key] = 0; });
    rows.forEach(function (r) {
      var k = r.done.filter(function (x) { return per[x] != null; });
      k.forEach(function (x) { per[x]++; });
      if (k.length >= GOAL) goal++;
      if (k.length === COURSES.length) full++;
      if ((r.plan || "").trim()) plan++;
    });
    return { n: n, goal: goal, full: full, plan: plan, per: per, pct: n ? Math.round(goal / n * 100) : 0 };
  }

  /* ---------------- 화면 ---------------- */
  var ST = { rows: [], live: false };
  // 이수 현황 화면 (요약 + 이수 표) — #/snack/progress
  function render(view, opts) {
    view.innerHTML = '<div class="wrap">' + opts.head + '<div id="ssBody"><div class="empty">불러오는 중…</div></div></div>';
    load().then(function (d) {
      ST.rows = d.rows; ST.live = d.live; ST.edit = d.live && !!opts.canEdit; ST.by = opts.by || ""; ST.pub = !!opts.pub;
      paint(document.getElementById("ssBody"), d);
    });
  }
  // 교육 자료실 맨 위 'AI 스터디' 묶음 (규칙 + 추천 강의 5개) — #/snack/library
  function mountCourses(el) {
    if (!el) return Promise.resolve();
    el.innerHTML = '<div class="empty">불러오는 중…</div>';
    return load().then(function (d) {
      var st = stats(d.rows);
      el.innerHTML = introHtml() + coursesHtml(st)
        + '<p class="ss-more">강의를 본 크루 체크 · 하반기 계획은 <a href="#/snack/progress"><b>이수 현황</b></a>에서 관리해요.</p>';
    });
  }
  function introHtml(pub) {
    return '<section class="ss-intro">'
        + '<div><p class="ss-intro__k">스터디 규칙</p><ul class="ss-rules">'
          + '<li>추천 강의 5개 중 <b>2개 이상</b> 보고 완료 체크해요.</li>'
          + '<li>추천 강의 말고 다른 자료로 공부했다면 <b>비고</b>에 링크를 남겨요.</li>'
          + '<li>하반기 개인 성과 목표(<b>POP 이미지 제작 참여 · 개별 브랜딩 리포트 작성</b>)에 활용해요.</li></ul></div>'
        + (pub ? '' : '<a class="btn btn--sm" href="' + SHEET_URL + '" target="_blank" rel="noopener">원본 시트 열기 ↗</a>')
      + '</section>';
  }
  function coursesHtml(st) {
    return '<div class="ss-courses">' + COURSES.map(function (c, i) {
          var n = st.per[c.key], pct = st.n ? Math.round(n / st.n * 100) : 0;
          return '<a class="ss-course" href="' + esc(c.url) + '" target="_blank" rel="noopener">'
            + '<span class="ss-course__th"><img src="https://i.ytimg.com/vi/' + c.yt + '/mqdefault.jpg" alt="" loading="lazy"><i>▶</i></span>'
            + '<span class="ss-course__b"><small>' + (i + 1) + ' · ' + esc(c.by) + '</small><b>' + esc(c.title) + '</b>'
            + '<span class="ss-course__f"><span class="progress-bar"><span class="progress-bar__fill" style="width:' + pct + '%"></span></span><em>' + n + ' / ' + st.n + '명</em></span></span></a>';
        }).join("") + '</div>';
  }

  function paint(body, d) {
    if (!body) return;
    var st = stats(ST.rows);
    var note = d && d.missing ? '<div class="pg-note"><b>AI 스터디 기록 표가 아직 없어요.</b> Supabase SQL Editor 에서 <b>supabase/snack_study.sql</b> 을 한 번 실행하면 사이트에서 체크·계획을 고칠 수 있어요. 지금은 구글 시트 값(11/8 기준)으로 보여 드려요.</div>' : "";
    body.innerHTML = note
      + '<dl class="summary">'
        + '<div><dt>참여 인원</dt><dd>' + st.n + '<small>명</small></dd></div>'
        + '<div><dt>기준 달성 (2개 이상)</dt><dd>' + st.goal + '<small>명 · ' + st.pct + '%</small></dd></div>'
        + '<div><dt>5개 모두 완료</dt><dd>' + st.full + '<small>명</small></dd></div>'
        + '<div><dt>하반기 계획 작성</dt><dd>' + st.plan + '<small>명</small></dd></div></dl>'
      + '<div class="sec-h"><h3>강의별 본 인원</h3>' + (ST.pub ? '' : '<a href="#/snack/library">추천 강의 보기 →</a>') + '</div>'
      + coursesHtml(st)
      + '<div class="sec-h"><h3>사람별 이수 현황</h3><span class="ss-sub">' + (ST.edit ? "칸을 눌러 체크하고, 계획 칸을 눌러 하반기 계획 · 비고를 써요" : ST.pub ? "" : ST.live ? "보기만 할 수 있어요 (스낵 자료 권한이 있으면 고칠 수 있어요)" : "") + '</span></div>'
      + '<div class="board"><div class="board__scroll"><table class="board__table ss-table"><thead><tr><th>이름</th>'
        + COURSES.map(function (c, i) { return '<th class="ss-c" title="' + esc(c.title) + '">' + (i + 1) + '<span>' + esc(c.title) + '</span></th>'; }).join("")
        + '<th>완료</th><th>하반기 계획 · 비고</th></tr></thead><tbody>'
        + ST.rows.map(rowHtml).join("") + '</tbody></table></div></div>';
    if (ST.edit) bind(body);
  }

  function rowHtml(r, i) {
    var k = r.done.length, ok = k >= GOAL;
    return '<tr data-i="' + i + '"><td class="ss-name">' + esc(r.name) + '</td>'
      + COURSES.map(function (c) {
          var on = r.done.indexOf(c.key) > -1;
          return '<td class="ss-c"><button type="button" class="ss-chk' + (on ? " is-on" : "") + '" data-k="' + c.key + '"' + (ST.edit ? "" : " disabled") + ' aria-pressed="' + on + '" aria-label="' + esc(r.name + " · " + c.title + (on ? " 완료" : " 안 함")) + '">' + (on ? "✓" : "") + '</button></td>';
        }).join("")
      + '<td><span class="ss-badge' + (ok ? " is-ok" : k ? " is-mid" : "") + '">' + k + ' / ' + COURSES.length + (ok ? " · 달성" : "") + '</span></td>'
      + '<td class="ss-plan">' + (ST.edit ? '<button type="button" class="ss-plan__btn" data-plan>' : '<div>')
        + (r.plan ? '<span>' + esc(r.plan) + '</span>' : '<span class="ss-none">' + (ST.edit ? "+ 계획 쓰기" : "아직 없어요") + '</span>')
        + (r.note ? '<small>비고 · ' + (ST.edit ? esc(r.note) : linkify(r.note)) + '</small>' : "")
      + (ST.edit ? '</button>' : '</div>') + '</td></tr>';
  }

  function bind(body) {
    body.querySelectorAll(".ss-chk").forEach(function (b) {
      b.onclick = function () {
        var row = ST.rows[+b.closest("tr").dataset.i], k = b.dataset.k, was = row.done.slice();
        var at = row.done.indexOf(k); if (at > -1) row.done.splice(at, 1); else row.done.push(k);
        row.done.sort();
        paint(body);
        save(row, ST.by).catch(function (e) { console.warn(e); row.done = was; paint(body); toast("저장하지 못했어요. 다시 눌러 주세요."); });
      };
    });
    body.querySelectorAll("[data-plan]").forEach(function (b) {
      b.onclick = function () { openPlan(ST.rows[+b.closest("tr").dataset.i], body); };
    });
  }

  function openPlan(row, body) {
    var m = document.createElement("div"); m.className = "modal"; m.setAttribute("role", "dialog"); m.setAttribute("aria-modal", "true");
    m.innerHTML = '<div class="modal__backdrop"></div><div class="modal__card"><div class="modal__head"><h3>' + esc(row.name) + ' · 스터디 후 하반기 계획</h3><button type="button" class="modal__x" aria-label="닫기">✕</button></div>'
      + '<form><label class="fld">하반기 계획<textarea name="plan" rows="5" placeholder="AI 스터디로 하반기에 무엇을 해 볼지 적어요">' + esc(row.plan) + '</textarea></label>'
      + '<label class="fld">비고 (추천 강의 말고 본 자료 링크)<textarea name="note" rows="2" placeholder="https://…">' + esc(row.note) + '</textarea></label>'
      + '<div class="modal__foot"><span style="flex:1"></span><button type="button" class="btn" data-x>취소</button><button type="submit" class="btn btn--primary">저장</button></div></form></div>';
    document.body.appendChild(m);
    function close() { m.remove(); document.removeEventListener("keydown", onKey); }
    function onKey(e) { if (e.key === "Escape") close(); }
    document.addEventListener("keydown", onKey);
    m.querySelector(".modal__backdrop").onclick = m.querySelector(".modal__x").onclick = m.querySelector("[data-x]").onclick = close;
    m.querySelector("textarea").focus();
    m.querySelector("form").onsubmit = function (e) {
      e.preventDefault();
      var f = e.target, was = { plan: row.plan, note: row.note }, btn = f.querySelector("[type=submit]");
      row.plan = f.plan.value.trim(); row.note = f.note.value.trim(); btn.disabled = true;
      save(row, ST.by).then(function () { close(); paint(body); toast("저장했어요"); })
        .catch(function (err) { console.warn(err); row.plan = was.plan; row.note = was.note; btn.disabled = false; toast("저장하지 못했어요. 다시 눌러 주세요."); });
    };
  }

  // 홈 카드용 한 줄 요약
  function summary() { return load().then(function (d) { return stats(d.rows); }); }

  window.EduSnackStudy = { introHtml: introHtml, render: render, mountCourses: mountCourses, summary: summary, COURSES: COURSES, GOAL: GOAL };
})();
