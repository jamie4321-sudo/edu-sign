/* =========================================================
   EDU — 이수 현황 (관리자 · 가든 교육부터)
   · 이수 기준: 서명 받는 교육 = 연결된 교육 서명에 서명 완료 / 그 밖의 교육 = 크루가 '다 봤어요'를 누름
   · 대상: 서명 받는 교육 = 그 서명 세션 명단, 그 밖의 교육 = OPS 재직 명단의 해당 파트 크루
   · 화면: 요약 · 교육별(미이수자 + 안내 문구 복사) · 크루별 표 · 엑셀
   ========================================================= */
(function () {
  "use strict";
  var PART_GROUP = { garden: "가든", snack: "스낵", support: "총무지원" };
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function short(n) { return String(n || "").replace(/\s*\(.*\)\s*$/, ""); }
  function md(iso) { if (!iso) return ""; var d = new Date(iso); return (d.getMonth() + 1) + "/" + d.getDate(); }
  function toast(msg) { var el = document.createElement("div"); el.className = "toast"; el.textContent = msg; document.body.appendChild(el); setTimeout(function () { el.remove(); }, 2400); }
  function boardUrl(id) { return location.origin + location.pathname.replace(/[^/]*$/, "") + "library.html" + (id ? "#" + encodeURIComponent(id) : ""); }

  var ST = { tab: "mat", q: "" };

  // 데이터 모으기 → { mats, crews, cell(name, matId) }
  function load(part, crewList) {
    return Promise.all([
      Store.listMaterials(part),
      crewList().catch(function () { return []; }),
      Store.listViews().catch(function (e) { return null; })     // null = 기록 표 아직 없음
    ]).then(function (a) {
      var mats = (a[0] || []).filter(function (m) { return m.status !== "draft"; });
      var ops = (a[1] || []).filter(function (c) { return (c.group || "") === PART_GROUP[part]; });
      var views = a[2];
      var sids = mats.filter(function (m) { return m.needsSign && m.signSessionId; }).map(function (m) { return m.signSessionId; });
      return Store.listRosterLite(sids).then(function (roster) { return { mats: mats, ops: ops, views: views, roster: roster || [] }; });
    }).then(function (d) {
      var viewOf = {};
      (d.views || []).forEach(function (v) { viewOf[v.materialId + "\u0000" + v.name] = v; });
      var deptOf = {}; d.ops.forEach(function (c) { deptOf[c.name] = c.group; }); d.roster.forEach(function (r) { if (!deptOf[r.name]) deptOf[r.name] = r.dept; });
      // 교육마다 대상 · 상태
      d.mats.forEach(function (m) {
        var rows = m.needsSign && m.signSessionId ? d.roster.filter(function (r) { return r.sessionId === m.signSessionId; }) : null;
        var names = rows ? rows.map(function (r) { return r.name; }) : d.ops.map(function (c) { return c.name; });
        m._t = {};
        names.forEach(function (n) {
          var v = viewOf[m.id + "\u0000" + n], st, at = "";
          if (m.needsSign) {
            var r = rows && rows.filter(function (x) { return x.name === n; })[0];
            if (r && r.signedAt) { st = "done"; at = r.signedAt; }
            else if (v && v.doneAt) { st = "sign"; at = v.doneAt; }      // 다 봤는데 서명 전
            else st = "todo";
          } else if (v && v.doneAt) { st = "done"; at = v.doneAt; }
          else st = v ? "open" : "todo";                                   // open = 열어 봤지만 끝까지 안 봄
          m._t[n] = { st: st, at: at };
        });
      });
      var crewNames = {}; d.mats.forEach(function (m) { Object.keys(m._t).forEach(function (n) { crewNames[n] = 1; }); });
      d.ops.forEach(function (c) { crewNames[c.name] = 1; });
      d.crews = Object.keys(crewNames).map(function (n) {
        var tot = 0, done = 0;
        d.mats.forEach(function (m) { if (m._t[n]) { tot++; if (m._t[n].st === "done") done++; } });
        return { name: n, dept: deptOf[n] || "", tot: tot, done: done };
      }).sort(function (a, b) { return (b.tot - b.done) - (a.tot - a.done) || a.name.localeCompare(b.name, "ko"); });
      return d;
    });
  }

  var LABEL = { done: "이수", todo: "미이수", open: "열어 봄", sign: "서명 대기" };
  function render(view, opts) {
    var part = opts.part || "garden";
    view.innerHTML = '<div class="wrap">' + opts.head + '<div id="pgBody"><div class="empty">불러오는 중…</div></div></div>';
    var body = document.getElementById("pgBody");
    load(part, opts.crewList).then(function (d) {
      var cells = 0, done = 0, todo = 0;
      d.mats.forEach(function (m) { Object.keys(m._t).forEach(function (n) { cells++; if (m._t[n].st === "done") done++; else todo++; }); });
      var pct = cells ? Math.round(done / cells * 100) : 0;
      var note = d.views === null ? '<div class="pg-note"><b>‘다 봤어요’ 기록 표가 아직 없어요.</b> Supabase SQL Editor 에서 <b>supabase/views.sql</b> 을 한 번 실행하면, 그때부터 크루가 누른 ‘다 봤어요’가 여기에 쌓여요. 서명 받는 교육은 지금도 서명 기록으로 보여요.</div>' : "";
      body.innerHTML = note
        + '<dl class="summary"><div><dt>대상 크루</dt><dd>' + d.crews.length + '<small>명</small></dd></div>'
        + '<div><dt>게시된 교육</dt><dd>' + d.mats.length + '<small>건</small></dd></div>'
        + '<div><dt>이수율</dt><dd>' + (cells ? pct + '<small>%</small>' : "–") + '</dd></div>'
        + '<div><dt>미이수</dt><dd>' + todo + '<small>건</small></dd></div></dl>'
        + '<div class="pg-bar"><div class="seg pg-seg" role="tablist">'
          + '<button class="seg__btn' + (ST.tab === "mat" ? " is-on" : "") + '" type="button" data-pt="mat">교육별</button>'
          + '<button class="seg__btn' + (ST.tab === "crew" ? " is-on" : "") + '" type="button" data-pt="crew">크루별</button></div>'
          + '<span class="pg-sp"></span><button class="btn btn--sm" type="button" id="pgXlsx">⬇ 엑셀</button></div>'
        + '<div id="pgView"></div>';
      var paint = function () {
        body.querySelectorAll("[data-pt]").forEach(function (b) { b.classList.toggle("is-on", b.dataset.pt === ST.tab); });
        var v = document.getElementById("pgView");
        if (!d.mats.length) { v.innerHTML = '<div class="prep"><b>게시된 교육 자료가 없어요</b><p>교육 자료실에서 자료를 게시하면 이수 현황이 생겨요.</p></div>'; return; }
        if (ST.tab === "mat") v.innerHTML = '<div class="pg-mats">' + d.mats.map(matCard).join("") + '</div>';
        else v.innerHTML = crewTable(d);
        v.querySelectorAll("[data-copy]").forEach(function (b) { b.onclick = function () { copyMsg(d.mats.filter(function (m) { return m.id === b.dataset.copy; })[0]); }; });
        var qi = v.querySelector("#pgQ"); if (qi) qi.oninput = function () { ST.q = qi.value; var rows = v.querySelectorAll("tbody tr"); rows.forEach(function (tr) { tr.hidden = ST.q && tr.dataset.n.indexOf(ST.q) < 0; }); };
      };
      body.querySelectorAll("[data-pt]").forEach(function (b) { b.onclick = function () { ST.tab = b.dataset.pt; paint(); }; });
      document.getElementById("pgXlsx").onclick = function () { xlsx(d); };
      paint();
    }).catch(function (e) {
      console.warn(e); body.innerHTML = '<div class="prep"><b>이수 현황을 불러오지 못했어요</b><p>인터넷 연결을 확인하고 새로고침해 주세요.</p></div>';
    });
  }

  function matCard(m) {
    var names = Object.keys(m._t), done = names.filter(function (n) { return m._t[n].st === "done"; });
    var left = names.filter(function (n) { return m._t[n].st !== "done"; });
    var pct = names.length ? Math.round(done.length / names.length * 100) : 0;
    return '<article class="pg-mat"><div class="pg-mat__h"><div>' + (m.topic ? '<span class="pg-topic">' + esc(m.topic) + '</span>' : "")
        + '<b>' + esc(m.title || "제목 없음") + '</b><small>' + (m.needsSign ? (m.signSessionId ? "✍ 서명으로 확인" : "✍ 서명 세션 연결 안 됨") : "‘다 봤어요’로 확인") + '</small></div>'
        + '<div class="pg-pct"><b>' + pct + '%</b><small>' + done.length + ' / ' + names.length + '명</small></div></div>'
      + '<div class="progress-bar"><div class="progress-bar__fill" style="width:' + pct + '%"></div></div>'
      + (left.length ? '<div class="pg-left"><span>아직 안 한 크루 ' + left.length + '명</span><div class="pg-chips">' + left.map(function (n) {
          var s = m._t[n].st; return '<em class="pg-chip pg-chip--' + s + '" title="' + esc(n + " · " + LABEL[s]) + '">' + esc(short(n)) + (s !== "todo" ? '<i>' + LABEL[s] + '</i>' : "") + '</em>'; }).join("") + '</div>'
          + '<button type="button" class="btn btn--sm" data-copy="' + esc(m.id) + '">안내 문구 복사</button></div>'
        : '<p class="pg-all">모두 이수했어요 👏</p>')
      + '</article>';
  }
  function copyMsg(m) {
    var left = Object.keys(m._t).filter(function (n) { return m._t[n].st !== "done"; }).map(short);
    var msg = "[가든 교육] " + (m.title || "") + "\n아직 안 하신 분: " + left.join(", ")
      + "\n" + (m.needsSign ? "교육 자료를 끝까지 보고 서명까지 해 주세요." : "교육 자료를 끝까지 보고 ‘다 봤어요’를 눌러 주세요.") + "\n" + boardUrl(m.id);
    var ok = function () { toast("안내 문구를 복사했어요 · 카톡에 붙여넣어 주세요"); };
    (navigator.clipboard ? navigator.clipboard.writeText(msg) : Promise.reject()).then(ok).catch(function () {
      var t = document.createElement("textarea"); t.value = msg; document.body.appendChild(t); t.select(); document.execCommand("copy"); t.remove(); ok(); });
  }
  function crewTable(d) {
    var head = '<div class="pg-tools"><input type="search" id="pgQ" placeholder="크루 이름 찾기" value="' + esc(ST.q) + '"><span class="pg-legend"><i class="pg-dot pg-dot--done"></i>이수 <i class="pg-dot pg-dot--sign"></i>서명 대기 <i class="pg-dot pg-dot--open"></i>열어 봄 <i class="pg-dot pg-dot--todo"></i>미이수</span></div>';
    return head + '<div class="board"><div class="board__scroll"><table class="board__table pg-table"><thead><tr><th>크루</th><th>이수</th>'
      + d.mats.map(function (m) { return '<th title="' + esc(m.title) + '"><span>' + esc(m.title || "제목 없음") + '</span></th>'; }).join("") + '</tr></thead><tbody>'
      + d.crews.map(function (c) {
          return '<tr data-n="' + esc(c.name) + '"' + (ST.q && c.name.indexOf(ST.q) < 0 ? " hidden" : "") + '><td><b>' + esc(short(c.name)) + '</b><small>' + esc(c.dept) + '</small></td>'
            + '<td class="mono">' + c.done + ' / ' + c.tot + '</td>'
            + d.mats.map(function (m) {
                var t = m._t[c.name]; if (!t) return '<td class="pg-na">–</td>';
                return '<td><span class="pg-cell pg-cell--' + t.st + '" title="' + esc(LABEL[t.st] + (t.at ? " · " + md(t.at) : "")) + '">' + (t.st === "done" ? "● " + md(t.at) : t.st === "sign" ? "✍ 서명 대기" : t.st === "open" ? "◐ 열어 봄" : "○") + '</span></td>';
              }).join("") + '</tr>';
        }).join("") + '</tbody></table></div></div>';
  }
  function xlsx(d) {
    if (!window.XLSX) { toast("엑셀 모듈을 불러오는 중이에요. 잠시 후 다시 눌러 주세요."); return; }
    var rows = d.crews.map(function (c) {
      var o = { "크루": c.name, "파트": c.dept, "이수": c.done + "/" + c.tot };
      d.mats.forEach(function (m) { var t = m._t[c.name]; o[m.title || m.id] = !t ? "대상 아님" : LABEL[t.st] + (t.at && t.st === "done" ? " (" + md(t.at) + ")" : ""); });
      return o;
    });
    var ws = XLSX.utils.json_to_sheet(rows), wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "이수 현황");
    var d0 = new Date(); XLSX.writeFile(wb, "가든 교육 이수 현황_" + d0.getFullYear() + ("0" + (d0.getMonth() + 1)).slice(-2) + ("0" + d0.getDate()).slice(-2) + ".xlsx");
  }

  window.EduProgress = { render: render, load: load };
})();
