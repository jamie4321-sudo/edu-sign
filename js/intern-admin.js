/* =========================================================
   교육 서명 관리 › 중증장애인턴제 출석 — 관리자 화면 (1안: 서명 세션 카드형)
   #/sign/intern          인턴 목록 (+ 인턴 추가)
   #/sign/intern/<id>     인턴 상세 — 월별 9칸 표 · 집계 · 수습 · 평가 · 점검 · 메모 · PDF
   총괄 관리자 · 관리자(Auth.can("intern")) = 모든 기능, 그 밖의 계정은 보기만
   ========================================================= */
window.EduIntern = (function () {
  "use strict";
  var I = Intern, S = Intern.store, esc = Intern.esc;
  var SIGN = "#/sign";

  function toast(msg) { var el = document.createElement("div"); el.className = "toast"; el.textContent = msg; document.body.appendChild(el); setTimeout(function () { el.remove(); }, 2400); }
  function canEdit() { return !!(window.Auth && Auth.can("intern")); }
  function by() { return (window.Admin && Admin.current()) || "관리자"; }
  function crewUrl(id) {
    var base = (window.CONFIG && CONFIG.signUrl) || (location.origin + location.pathname.replace(/index\.html$/, "").replace(/\/$/, "") + "/sign.html");
    return base + (base.indexOf("?") < 0 ? "?" : "&") + "intern=" + encodeURIComponent(id);
  }
  function stTag(r) {
    if (!r) return "";
    if (r.status === "paid") return '<span class="in-st in-st--p">유급 ' + I.HALF[r.halfType || "full"].label + "</span>";
    return '<span class="in-st in-st--' + ({ normal: "n", absence: "a", alt: "t" }[r.status] || "n") + '">' + I.STATUS[r.status].short + "</span>";
  }
  function sigCell(r) {
    if (!r || r.status === "alt" || r.status === "absence") return "";
    if (r.signData) return '<img class="in-sig" src="' + r.signData + '" alt="서명">';
    if (r.legacySigned) return '<span class="in-st in-st--g" title="예전 구글 출퇴근부에서 서명 완료 (서명 그림은 옮겨지지 않았어요)">예전 서명</span>';
    return r.status === "normal" ? '<span class="in-st in-st--w">서명 전</span>' : "";
  }
  function modal(title, body, wide) {
    var w = document.createElement("div");
    w.className = "modal";
    w.innerHTML = '<div class="modal__backdrop" data-close></div><div class="modal__card' + (wide ? " modal__card--wide" : "") + '" role="dialog" aria-modal="true">'
      + '<div class="modal__head"><h3>' + title + '</h3><button class="modal__x" data-close>×</button></div><div class="in-modal">' + body + "</div></div>";
    document.body.appendChild(w);
    w.querySelectorAll("[data-close]").forEach(function (el) { el.addEventListener("click", function () { w.remove(); }); });
    return w;
  }
  function sqlNotice(view) {
    view.innerHTML = '<div class="wrap">' + tabsHtml("intern") + '<div class="prep"><b>표를 먼저 만들어 주세요</b>'
      + '<p>Supabase 대시보드 › SQL Editor 에서 <code>supabase/intern.sql</code> 을 실행하고, 이어서 <code>supabase/intern-import.sql</code> 을 실행하면 예전 구글 출퇴근부 기록(121건)이 들어와요.</p></div></div>';
  }
  function tabsHtml(on) {
    return '<div class="seg in-tabs" role="tablist">'
      + '<a class="seg__btn' + (on === "sign" ? " is-on" : "") + '" href="' + SIGN + '">교육 서명</a>'
      + '<a class="seg__btn' + (on === "intern" ? " is-on" : "") + '" href="' + SIGN + '/intern">중증장애인턴제 출석</a></div>';
  }

  /* ---------------- 교육 서명 목록 맨 앞에 붙는 인턴 카드 ---------------- */
  function cardHtml(p, days) {
    var ym = I.today().slice(0, 7), st = I.stats(p, days, ym), per = I.period(p);
    return '<a class="session-card in-card" href="' + SIGN + "/intern/" + encodeURIComponent(p.id) + '">'
      + '<div class="session-card__top"><span class="session-card__date mono">' + esc((p.startDate || "").replace(/-/g, ".")) + " ~ " + esc((p.endDate || "").slice(5).replace("-", ".")) + "</span>"
      + '<span class="session-card__tags">' + (p.active ? '<span class="badge badge--live">' + (per.left != null && per.left >= 0 ? "D-" + per.left : "진행중") + "</span>" : '<span class="badge badge--done">종료</span>') + "</span></div>"
      + '<div><div class="session-card__title">' + esc(p.name) + '</div><div class="session-card__cat">중증장애인턴제 출석 · ' + esc(p.job.split("(")[0]) + "</div></div>"
      + '<div class="session-card__progress"><div class="progress-bar"><div class="progress-bar__fill" style="width:' + per.pct + '%"></div></div>'
      + '<span class="session-card__count mono">' + (st.unsigned.length ? "서명 전 " + st.unsigned.length : "기간 " + per.pct + "%") + "</span></div></a>";
  }
  // app.js renderList 에서 호출: 진행중 그리드 맨 앞에 인턴 카드
  function pinCards(grid) {
    if (!grid) return Promise.resolve();
    return S.listProfiles().then(function (ps) {
      ps = ps.filter(function (p) { return p.active; });
      return Promise.all(ps.map(function (p) { return S.listDays(p.id).then(function (d) { return cardHtml(p, d); }); }));
    }).then(function (cards) {
      if (!cards || !cards.length) return;
      var empty = grid.querySelector(".empty"); if (empty) empty.remove();
      grid.insertAdjacentHTML("afterbegin", cards.join(""));
    }).catch(function () {});
  }

  /* ---------------- 인턴 목록 ---------------- */
  function renderList(view, setCrumb) {
    setCrumb("EDU · 교육 서명 관리 · 중증장애인턴제 출석");
    view.innerHTML = '<div class="wrap"><div class="page-head"><div><p class="eyebrow">EDU · SIGN · INTERN</p><h2>중증장애인턴제 출석</h2>'
      + '<p class="sub">서울특별시 장애인일자리센터 중증장애인 인턴제 · 매일 출퇴근 기록과 인턴 서명, 월별 출·퇴근 기록부(PDF)를 관리해요.</p></div>'
      + (canEdit() ? '<button class="btn btn--primary" id="inNew">+ 인턴 추가</button>' : "") + "</div>"
      + tabsHtml("intern") + '<div class="session-grid" id="inGrid"><div class="empty">불러오는 중…</div></div></div>';
    var nb = document.getElementById("inNew"); if (nb) nb.onclick = function () { openProfile(null); };
    S.listProfiles().then(function (ps) {
      return Promise.all(ps.map(function (p) { return S.listDays(p.id).then(function (d) { return cardHtml(p, d); }); }));
    }).then(function (cards) {
      var g = document.getElementById("inGrid"); if (!g) return;
      g.innerHTML = cards.length ? cards.join("") : '<div class="empty" style="grid-column:1/-1">등록된 인턴이 없어요. <b>+ 인턴 추가</b>로 시작하세요.</div>';
    }).catch(function (e) { if (I.needSql(e)) sqlNotice(view); else toast("불러오지 못했어요"); });
  }

  /* ---------------- 인턴 상세 ---------------- */
  var st8 = null;   // { p, days, notes, ym, memoCat }
  function renderDetail(view, id, setCrumb, ym) {
    setCrumb("EDU · 교육 서명 관리 · 중증장애인턴제 출석");
    view.innerHTML = '<div class="wrap"><div class="empty">불러오는 중…</div></div>';
    Promise.all([S.getProfile(id), S.listDays(id), S.listNotes(id)]).then(function (a) {
      if (!a[0]) { view.innerHTML = '<div class="wrap"><div class="empty">인턴을 찾을 수 없어요. <a href="' + SIGN + '/intern">목록으로</a></div></div>'; return; }
      var months = I.monthsOf(a[0]), now = I.today().slice(0, 7);
      var keep = st8 && st8.p.id === id ? st8.ym : null;
      st8 = { p: a[0], days: a[1], notes: a[2], ym: ym || keep || (months.indexOf(now) > -1 ? now : months[months.length - 1]), memoCat: "all", view: view };
      paint();
    }).catch(function (e) { if (I.needSql(e)) sqlNotice(view); else { console.warn(e); toast("불러오지 못했어요"); } });
  }
  function reload() { return Promise.all([S.getProfile(st8.p.id), S.listDays(st8.p.id), S.listNotes(st8.p.id)]).then(function (a) { st8.p = a[0]; st8.days = a[1]; st8.notes = a[2]; paint(); }); }

  function paint() {
    var p = st8.p, view = st8.view, ed = canEdit(), per = I.period(p), url = crewUrl(p.id);
    var all = I.stats(p, st8.days), prob = I.probCount(p);
    view.innerHTML = '<div class="wrap in-detail">'
      + '<div class="detail-head"><a class="back-link" href="' + SIGN + '/intern">← 중증장애인턴제 출석</a></div>'
      + '<div class="page-head"><div><p class="eyebrow">중증장애인 인턴제 · ' + (p.active ? "진행중" : "종료") + "</p>"
      + "<h2>" + esc(p.name) + "</h2>"
      + '<p class="sub">' + esc(p.company) + " · " + esc(p.job) + "<br>약정 " + esc(p.startDate.replace(/-/g, ".")) + " ~ " + esc(p.endDate.replace(/-/g, "."))
      + (p.mentor ? " · 담당 멘토 " + esc(p.mentor) + (p.mentorTeam ? " (" + esc(p.mentorTeam) + ")" : "") : "") + (p.manager ? " · 사업체 담당자 " + esc(p.manager) : "") + "</p></div>"
      + '<div class="row-actions" style="gap:8px;flex-wrap:wrap">'
      + (ed ? '<button class="btn btn--sm" id="inEditP">인턴 정보 · 담당자 서명</button>' : "")
      + '<button class="btn btn--sm" id="inXlsx">⬇ 엑셀</button>'
      + '<button class="btn btn--sm" id="inPdfAll">전체 기간 PDF</button>'
      + '<button class="btn btn--sm btn--primary" id="inPdf">' + (+st8.ym.slice(5)) + "월 PDF</button>"
      + (ed ? '<button class="btn btn--sm btn--danger" id="inDelP">인턴 삭제</button>' : "") + "</div></div>"
      + '<div class="in-period"><div class="in-period__bar"><i style="width:' + per.pct + '%"></i></div><span>인턴 기간 ' + per.pct + "%" + (per.left != null ? (per.left >= 0 ? " · 종료까지 " + per.left + "일" : " · 종료됨") : "") + "</span></div>"
      + '<div class="stat-row in-stats">'
      + stat("전체 근무일", I.fmtN(all.work), "") + stat("결근", all.abs, "") + stat("유급휴일", I.fmtN(all.paid), "연차 " + all.full + " · 오전 " + all.am + " · 오후 " + all.pm)
      + stat("대체공휴일", all.alt, "") + stat("지각 · 조퇴", all.late + " · " + all.early, "") + stat("수습 체크", prob.done + "/" + prob.total, prob.pct + "%") + "</div>"
      + '<div class="share-box"><div style="flex:1;min-width:200px"><p class="hint" style="margin:0 0 6px">인턴 전용 서명 링크 — 이 인턴 이름만 보이고, 로그인하면 바로 오늘 출석 · 서명 화면</p>'
      + '<input type="text" readonly value="' + esc(url) + '" id="inUrl" /></div><button class="btn btn--sm" id="inCopy">링크 복사</button>'
      + '<img class="qr-box" width="72" height="72" alt="QR" src="https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=' + encodeURIComponent(url) + '" /></div>'
      + '<div id="inMonth"></div>'
      + '<div id="inSummary"></div>'
      + '<div id="inProb"></div>'
      + '<div id="inEval"></div>'
      + '<div id="inPlant"></div>'
      + '<div id="inMemo"></div>'
      + "</div>";
    function stat(l, v, sub) { return '<div class="stat"><div class="stat__label">' + l + '</div><div class="stat__value">' + v + "</div>" + (sub ? '<div class="in-stat-sub">' + sub + "</div>" : "") + "</div>"; }
    document.getElementById("inCopy").onclick = function () { var i = document.getElementById("inUrl"); (navigator.clipboard ? navigator.clipboard.writeText(i.value) : Promise.reject()).then(function () { toast("링크를 복사했습니다"); }, function () { i.select(); document.execCommand("copy"); toast("링크를 복사했습니다"); }); };
    document.getElementById("inPdf").onclick = function () { window.open("intern-print.html?id=" + encodeURIComponent(p.id) + "&m=" + st8.ym + demoQ(), "_blank"); };
    document.getElementById("inPdfAll").onclick = function () { window.open("intern-print.html?id=" + encodeURIComponent(p.id) + "&m=all" + demoQ(), "_blank"); };
    document.getElementById("inXlsx").onclick = exportXlsx;
    if (ed) {
      document.getElementById("inEditP").onclick = function () { openProfile(p); };
      document.getElementById("inDelP").onclick = function () {
        if (!confirm("[" + p.name + "] 인턴을 삭제할까요?\n출퇴근 기록 · 서명 · 수습 · 평가 · 메모가 모두 삭제되며 되돌릴 수 없습니다.")) return;
        if (!confirm("정말 삭제하시겠습니까? 먼저 전체 기간 PDF를 저장해 두는 것을 권해요.")) return;
        S.deleteProfile(p.id).then(function () { toast("삭제했습니다"); location.hash = SIGN + "/intern"; });
      };
    }
    paintMonth(); paintSummary(); paintProb(); paintEval(); paintPlant(); paintMemo();
  }
  function demoQ() { return /[?&]demo=1/.test(location.search) ? "&demo=1" : ""; }

  /* ----- 월별 출퇴근 기록 (원본 기록부 9칸 + 상태 · 저장) ----- */
  function paintMonth() {
    var p = st8.p, ym = st8.ym, ed = canEdit(), box = document.getElementById("inMonth");
    var s = I.stats(p, st8.days, ym), map = {}; st8.days.forEach(function (r) { map[r.date] = r; });
    var y = +ym.slice(0, 4), m = +ym.slice(5, 7), last = new Date(y, m, 0).getDate(), td = I.today(), rows = "";
    for (var d = 1; d <= last; d++) {
      var key = ym + "-" + I.p2(d), r = map[key], wk = I.isWeekend(key), before = p.startDate && key < p.startDate, after = p.endDate && key > p.endDate;
      var cls = (wk ? " is-wk" : "") + (before || after ? " is-out" : "") + (key === td ? " is-today" : "") + (ed ? " is-click" : "");
      rows += '<tr class="' + cls + '" data-date="' + key + '"><td class="mono">' + I.dayLabel(key) + "</td><td>" + stTag(r) + "</td>"
        + "<td>" + (r && (r.status === "normal" || r.status === "paid") ? esc(r.inTime) : "") + "</td><td>" + (r && (r.status === "normal" || r.status === "paid") ? esc(r.outTime) : "") + "</td>"
        + "<td>" + (r && r.late ? "✓" : "") + "</td><td>" + (r && r.early ? "✓" : "") + "</td><td>" + (r && r.absChk ? "✓" : "") + "</td>"
        + "<td>" + sigCell(r) + '</td><td class="in-note">' + esc(r ? (r.note || (r.status === "alt" ? "대체공휴일" : "")) : "") + "</td>"
        + '<td class="in-meta">' + (r && r.updatedBy ? esc(r.updatedBy) : "") + "</td>"
        + (ed ? '<td class="in-act">' + (r ? "수정" : (wk || before || after ? "" : "+ 기록")) + "</td>" : "") + "</tr>";
    }
    box.innerHTML = '<div class="in-months">' + I.monthsOf(p).map(function (k) { return '<button class="in-chip' + (k === ym ? " is-on" : "") + '" data-ym="' + k + '">' + (+k.slice(5)) + "월</button>"; }).join("") + "</div>"
      + '<div class="stat-row in-stats in-stats--m">'
      + mstat("총 근무일", I.fmtN(s.work)) + mstat("결근", s.abs) + mstat("유급휴일", I.fmtN(s.paid), "연차 " + s.full + " · 오전반차 " + s.am + " · 오후반차 " + s.pm)
      + mstat("대체공휴일", s.alt, "유급휴가 별도") + mstat("지각 · 조퇴", s.late + " · " + s.early) + mstat("서명 전", s.unsigned.length, s.unsigned.length ? "정상 출근일 중" : "")
      + mstat(m + "월 출근 현황", s.pct + "%", s.normal + "일 / 평일 " + s.weekdays + "일") + "</div>"
      + '<div class="board"><div class="board__head"><h3 class="board__title">' + y + "년 " + m + '월 출퇴근 기록 <span class="chip-mono">' + s.records + "건</span></h3>"
      + (ed ? '<div class="row-actions" style="gap:8px"><button class="btn btn--sm" id="inFill">빈 평일 정상 출근으로 채우기</button><button class="btn btn--sm btn--primary" id="inAdd">+ 기록 추가</button></div>' : "") + "</div>"
      + '<div class="board__scroll"><table class="board__table in-table"><thead><tr><th>근무일</th><th>상태</th><th>출근</th><th>퇴근</th><th>지각</th><th>조퇴</th><th>결근</th><th>인턴 서명</th><th>비고</th><th>기록</th>' + (ed ? "<th></th>" : "") + "</tr></thead><tbody>" + rows + "</tbody></table></div></div>";
    function mstat(l, v, sub) { return '<div class="stat"><div class="stat__label">' + l + '</div><div class="stat__value">' + v + "</div>" + (sub ? '<div class="in-stat-sub">' + sub + "</div>" : "") + "</div>"; }
    box.querySelectorAll("[data-ym]").forEach(function (b) { b.onclick = function () { st8.ym = b.dataset.ym; paintMonth(); var pb = document.getElementById("inPdf"); if (pb) pb.textContent = (+st8.ym.slice(5)) + "월 PDF"; }; });
    if (!ed) return;
    box.querySelectorAll("tr[data-date]").forEach(function (tr) { tr.onclick = function () { openDay(tr.dataset.date); }; });
    document.getElementById("inAdd").onclick = function () { openDay(null); };
    document.getElementById("inFill").onclick = function () {
      var list = [], lastKey = I.today() < (ym + "-31") ? I.today() : ym + "-" + I.p2(last);
      for (var dd = 1; dd <= last; dd++) {
        var k = ym + "-" + I.p2(dd);
        if (k > lastKey || map[k] || I.isWeekend(k) || (p.startDate && k < p.startDate) || (p.endDate && k > p.endDate)) continue;
        list.push({ internId: p.id, date: k, status: "normal", halfType: "full", inTime: p.workIn, outTime: p.workOut, updatedBy: by() });
      }
      if (!list.length) { toast("채울 빈 평일이 없어요"); return; }
      if (!confirm(list.length + "일(" + list.map(function (x) { return I.dayLabel(x.date); }).join(", ") + ")을 정상 출근으로 채울까요?\n공휴일은 채운 뒤 '수정'에서 대체공휴일 등으로 바꿔 주세요. 서명은 인턴이 직접 해요.")) return;
      S.saveDays(list).then(function () { toast(list.length + "일을 채웠어요"); reload(); });
    };
  }

  /* ----- 하루 기록 편집 (관리자 = 모든 칸 + 서명 지우기 · 이 기기에서 인턴 서명 받기 · 삭제) ----- */
  function openDay(date) {
    var p = st8.p, r = date && st8.days.filter(function (x) { return x.date === date; })[0];
    var cur = r ? Object.assign({}, r) : { internId: p.id, date: date || I.today(), status: "normal", halfType: "full", inTime: p.workIn, outTime: p.workOut, late: false, early: false, absChk: false, note: "", signData: "", legacySigned: false };
    var w = modal((r ? "출퇴근 기록 수정" : "출퇴근 기록 추가"), '<form class="in-form">'
      + '<label class="fld"><span>근무일</span><input type="date" name="date" value="' + cur.date + '"' + (r ? " disabled" : "") + "></label>"
      + '<div class="fld"><span>근무 상태</span><div class="in-st4">' + Object.keys(I.STATUS).map(function (k) { return '<button type="button" data-st="' + k + '"><b>' + I.STATUS[k].label + "</b><small>" + I.STATUS[k].sub + "</small></button>"; }).join("") + "</div></div>"
      + '<div class="fld" data-half><span>유급 휴가 유형</span><div class="in-chips">' + Object.keys(I.HALF).map(function (k) { return '<button type="button" class="in-chip" data-half="' + k + '">' + I.HALF[k].label + " <small>" + I.HALF[k].inT + "~" + I.HALF[k].outT + "</small></button>"; }).join("") + "</div></div>"
      + '<div class="fld-row"><label class="fld"><span>출근 시간</span><input type="time" name="in"></label><label class="fld"><span>퇴근 시간</span><input type="time" name="out"></label></div>'
      + '<div class="fld"><span>출퇴근 외 사항</span><div class="in-chips"><label class="in-chk"><input type="checkbox" name="late"> ⚠️ 지각</label><label class="in-chk"><input type="checkbox" name="early"> 🚪 조퇴</label><label class="in-chk"><input type="checkbox" name="abs"> 📛 결근</label></div></div>'
      + '<label class="fld"><span>비고</span><textarea name="note" rows="2" placeholder="특이사항 입력 (지각/조퇴/결근 시 사유 기재)"></textarea></label>'
      + '<div class="fld"><span>인턴 서명</span><div id="inSigNow"></div></div>'
      + '<div class="modal__foot">' + (r ? '<button type="button" class="btn btn--danger" id="inDelDay">기록 삭제</button>' : "") + '<div class="modal__spacer"></div><button type="button" class="btn" data-close>취소</button><button type="submit" class="btn btn--primary">저장</button></div></form>');
    w.querySelectorAll("[data-close]").forEach(function (el) { el.addEventListener("click", function () { w.remove(); }); });
    var f = w.querySelector("form"), pad = null, clearSig = false;
    function setSt(s, keepTimes) {
      cur.status = s;
      w.querySelectorAll("[data-st]").forEach(function (b) { b.classList.toggle("is-on", b.dataset.st === s); });
      w.querySelector("[data-half]").hidden = s !== "paid";
      var noTime = s === "absence" || s === "alt";
      f.in.disabled = f.out.disabled = noTime;
      if (!keepTimes) {
        if (s === "normal") { f.in.value = p.workIn; f.out.value = p.workOut; }
        if (s === "paid") setHalf(cur.halfType || "full");
        if (noTime) { f.in.value = ""; f.out.value = ""; }
        if (s === "absence") f.abs.checked = true;
      }
    }
    function setHalf(h) { cur.halfType = h; w.querySelectorAll("[data-half] .in-chip").forEach(function (b) { b.classList.toggle("is-on", b.dataset.half === h); }); f.in.value = I.HALF[h].inT; f.out.value = I.HALF[h].outT; }
    w.querySelectorAll("[data-st]").forEach(function (b) { b.onclick = function () { setSt(b.dataset.st); }; });
    w.querySelectorAll("[data-half] .in-chip").forEach(function (b) { b.onclick = function () { setHalf(b.dataset.half); }; });
    f.in.value = cur.inTime || ""; f.out.value = cur.outTime || ""; f.late.checked = cur.late; f.early.checked = cur.early; f.abs.checked = cur.absChk; f.note.value = cur.note || "";
    setSt(cur.status, true);
    if (cur.status === "paid") w.querySelectorAll("[data-half] .in-chip").forEach(function (b) { b.classList.toggle("is-on", b.dataset.half === (cur.halfType || "full")); });
    function paintSig() {
      var box = w.querySelector("#inSigNow");
      if (pad) return;
      if (!clearSig && (cur.signData || cur.legacySigned)) {
        box.innerHTML = '<div class="in-sigbox">' + (cur.signData ? '<img src="' + cur.signData + '" alt="서명">' : '<span class="in-st in-st--g">예전 구글 출퇴근부에서 서명 완료 (그림 없음)</span>')
          + '<button type="button" class="btn btn--sm" id="inSigClr">서명 지우기</button></div>';
        box.querySelector("#inSigClr").onclick = function () { if (!confirm("이 날 서명을 지울까요? 인턴이 다시 서명해야 해요.")) return; clearSig = true; paintSig(); };
      } else {
        box.innerHTML = '<p class="hint" style="margin:0 0 6px">' + (clearSig ? "서명을 지웠어요 (저장하면 반영). " : "") + "서명이 없어요. 인턴이 서명 링크에서 하거나, 인턴이 옆에 있으면 이 기기에서 직접 서명할 수 있어요.</p>"
          + '<button type="button" class="btn btn--sm" id="inSigHere">인턴이 이 기기에서 서명</button>';
        box.querySelector("#inSigHere").onclick = function () {
          box.innerHTML = '<div class="in-thick"><span>굵기</span><input type="range" min="1" max="6" step="0.5" value="3" id="inThick"></div><canvas class="in-pad" id="inPad"></canvas>'
            + '<div class="in-padfoot"><span class="hint">인턴 본인이 손가락으로 이름을 적어 주세요</span><button type="button" class="btn btn--sm" id="inPadClr">다시 쓰기</button></div>';
          pad = I.sigPad(box.querySelector("#inPad"));
          box.querySelector("#inThick").oninput = function () { pad.width(+this.value); };
          box.querySelector("#inPadClr").onclick = function () { pad.clear(); };
        };
      }
    }
    paintSig();
    var del = w.querySelector("#inDelDay");
    if (del) del.onclick = function () {
      if (!confirm(I.dayLabel(cur.date) + " 기록을 삭제할까요? 서명도 함께 지워져요.")) return;
      S.deleteDay(p.id, cur.date).then(function () { w.remove(); toast("삭제했습니다"); reload(); });
    };
    f.onsubmit = function (e) {
      e.preventDefault();
      var date = r ? cur.date : f.date.value;
      if (!date) { toast("근무일을 고르세요"); return; }
      if (!r && st8.days.some(function (x) { return x.date === date; }) && !confirm(I.dayLabel(date) + "에 이미 기록이 있어요. 덮어쓸까요?")) return;
      var noTime = cur.status === "absence" || cur.status === "alt";
      var out = Object.assign({}, cur, { internId: p.id, date: date, inTime: noTime ? "" : f.in.value, outTime: noTime ? "" : f.out.value,
        late: f.late.checked, early: f.early.checked, absChk: f.abs.checked, note: f.note.value.trim(), updatedBy: by() });
      if (clearSig) { out.signData = ""; out.legacySigned = false; out.signedAt = ""; }
      if (pad && !pad.isEmpty()) { out.signData = pad.dataUrl(); out.signedAt = new Date().toISOString(); }
      S.saveDay(out).then(function () { w.remove(); toast("저장했습니다"); st8.ym = date.slice(0, 7); reload(); }).catch(function (er) { console.warn(er); toast("저장하지 못했어요"); });
    };
  }

  /* ----- 월별 집계 (예전 '월간집계' 시트) ----- */
  function paintSummary() {
    var p = st8.p, box = document.getElementById("inSummary");
    var rows = I.monthsOf(p).map(function (ym) {
      var s = I.stats(p, st8.days, ym);
      return '<tr><td class="mono">' + ym.replace("-", ".") + "</td><td>" + I.fmtN(s.work) + "</td><td>" + s.abs + "</td><td>" + s.late + "</td><td>" + s.early + "</td><td>" + I.fmtN(s.paid) + "</td><td>" + s.alt + "</td><td>" + (s.unsigned.length || "") + "</td>"
        + '<td><a class="btn btn--sm" target="_blank" href="intern-print.html?id=' + encodeURIComponent(p.id) + "&m=" + ym + demoQ() + '">PDF</a></td></tr>';
    }).join("");
    box.innerHTML = '<div class="board in-board"><div class="board__head"><h3 class="board__title">월간 집계</h3><span class="hint">총 근무일 = 정상 출근 1일 + 반차 0.5일 · 유급휴일 = 종일 1 + 반차 0.5</span></div>'
      + '<div class="board__scroll"><table class="board__table"><thead><tr><th>월</th><th>총 근무일</th><th>결근</th><th>지각</th><th>조퇴</th><th>유급휴일</th><th>대체공휴일</th><th>서명 전</th><th>출·퇴근 기록부</th></tr></thead><tbody>' + rows + "</tbody></table></div></div>";
  }

  /* ----- 수습 프로그램 (조경관리 4주 과정) ----- */
  function paintProb() {
    var p = st8.p, ed = canEdit(), box = document.getElementById("inProb"), pc = I.probCount(p);
    var weeks = I.PROB_WEEKS.map(function (wk) {
      var items = []; wk.groups.forEach(function (g) { items = items.concat(g.items); });
      var done = items.filter(function (it) { return p.prob[it.id]; }).length;
      return '<details class="in-week"' + (done < items.length ? " open" : "") + '><summary><b>' + wk.icon + " " + wk.week + "주차 — " + esc(wk.title) + '</b><span class="hint">' + wk.sub + '</span><span class="in-week__n' + (done === items.length ? " is-done" : "") + '">' + done + "/" + items.length + "</span></summary>"
        + wk.groups.map(function (g) {
          return '<div class="in-grp">' + esc(g.label) + "</div>" + g.items.map(function (it) {
            var ck = !!p.prob[it.id];
            return '<div class="in-item"><button type="button" class="in-check' + (ck ? " is-on" : "") + '" data-prob="' + it.id + '"' + (ed ? "" : " disabled") + ' aria-label="완료 표시">' + (ck ? "✓" : "") + "</button>"
              + '<div><div class="in-item__t' + (ck ? " is-done" : "") + '">' + esc(it.title) + '</div><div class="hint">' + esc(it.desc) + "</div>"
              + '<div class="in-tags">' + it.tags.map(function (t) { return '<span class="in-tag in-tag--' + t + '">' + I.TAGS[t] + "</span>"; }).join("")
              + (it.action === "plant" ? '<a class="btn btn--sm" href="#inPlant" data-jump="inPlant">📋 점검표</a>' : it.action === "self" ? '<a class="btn btn--sm" data-jump="inEval">✍️ 자기 평가</a>' : it.action === "work" ? '<a class="btn btn--sm" data-jump="inEval">📊 업무 수행 평가</a>' : "")
              + "</div></div></div>";
          }).join("");
        }).join("") + "</details>";
    }).join("");
    box.innerHTML = '<div class="board in-board"><div class="board__head"><h3 class="board__title">🌿 수습 프로그램 · 조경관리 4주 과정</h3><span class="hint">' + pc.done + "개 완료 · 총 " + pc.total + "개 항목 · " + pc.pct + "%</span></div>"
      + '<div class="in-pad18"><div class="in-period__bar" style="margin-bottom:14px"><i style="width:' + pc.pct + '%"></i></div>'
      + (pc.done === pc.total ? '<div class="in-done-banner">🎉 수습 과정 완료! 4주 프로그램을 모두 마쳤어요.</div>' : "")
      + weeks
      + '<div class="in-after"><div class="in-grp">🌳 4주 수습 이후 · 정규 배치 전환 — 업무 스케줄에 따른 정규 조경 관리</div>'
      + '<p class="hint" style="margin:0 0 10px">수습 과정 이수 후, 담당 구역과 주간 루틴이 확정되면 정규 업무로 전환돼요.</p>'
      + '<div class="in-routine">' + I.ROUTINE.map(function (r) { return '<div class="in-rcard"><b>' + r.icon + " " + r.dow + "</b>" + r.items.map(function (x) { return "<div>" + esc(x) + "</div>"; }).join("") + "</div>"; }).join("") + "</div>"
      + '<p class="hint" style="margin:10px 0 0">💡 정규 업무 전환 안내 — ' + esc(I.ROUTINE_NOTE) + "</p>"
      + (p.mentor ? '<p class="hint" style="margin:6px 0 0">🌸 언제든 물어보세요 · 담당 멘토 ' + esc(p.mentor) + " — 업무 중 모르는 것, 어려운 것이 생기면 언제든지 이야기하세요.</p>" : "") + "</div></div></div>";
    box.querySelectorAll("[data-jump]").forEach(function (a) { a.onclick = function (e) { e.preventDefault(); var t = document.getElementById(a.dataset.jump); if (t) t.scrollIntoView({ behavior: "smooth" }); }; });
    if (!ed) return;
    box.querySelectorAll("[data-prob]").forEach(function (b) {
      b.onclick = function () {
        var prob = Object.assign({}, p.prob); prob[b.dataset.prob] = !prob[b.dataset.prob];
        S.saveProfile({ id: p.id, prob: prob }).then(function () { p.prob = prob; paintProb(); toast(prob[b.dataset.prob] ? "완료로 표시했어요" : "완료를 풀었어요"); });
      };
    });
  }

  /* ----- 평가: 자기 평가(8) · 업무 수행 평가(9) ----- */
  function paintEval() {
    var p = st8.p, ed = canEdit(), box = document.getElementById("inEval");
    var se = Object.assign({ scores: {}, comment: "" }, p.selfEval), we = Object.assign({ scores: {} }, p.workEval);
    var seCats = [], weCats = [];
    I.SE_ITEMS.forEach(function (i) { if (seCats.indexOf(i.cat) < 0) seCats.push(i.cat); });
    I.WE_ITEMS.forEach(function (i) { if (weCats.indexOf(i.cat) < 0) weCats.push(i.cat); });
    var sum = I.weSummary(we.scores);
    box.innerHTML = '<div class="in-evalgrid">'
      + '<div class="board in-board"><div class="board__head"><h3 class="board__title">✍️ 자기 평가 체크리스트</h3><span class="hint">' + (se.savedAt ? "저장 " + esc(se.savedAt.slice(0, 10)) : "아직 저장 전") + "</span></div><div class=\"in-pad18\">"
      + '<p class="hint" style="margin-top:0">4주 수습을 마치며 각 항목을 스스로 평가해요. 잘한 것도, 부족한 것도 솔직하게 적는 게 가장 중요해요 🌱</p>'
      + seCats.map(function (c) {
          return '<div class="in-grp">' + c + "</div>" + I.SE_ITEMS.filter(function (i) { return i.cat === c; }).map(function (it) {
            var sc = se.scores[it.id] || 0;
            return '<div class="in-eval"><div><b>' + esc(it.title) + '</b><div class="hint">' + esc(it.desc) + '</div></div><div class="in-stars" data-se="' + it.id + '">'
              + [1, 2, 3, 4, 5].map(function (n) { return '<button type="button" data-n="' + n + '" class="' + (sc >= n ? "is-on" : "") + '"' + (ed ? "" : " disabled") + ">★</button>"; }).join("")
              + '<small>' + (sc ? I.SE_LABELS[sc] : "별점을 선택해주세요") + "</small></div></div>";
          }).join("");
        }).join("")
      + '<label class="fld" style="margin-top:12px"><span>📝 전체 소감 한 줄</span><textarea id="inSeCmt" rows="2" placeholder="4주 동안 가장 기억에 남는 것, 앞으로 더 잘하고 싶은 것을 적어보세요"' + (ed ? "" : " disabled") + ">" + esc(se.comment || "") + "</textarea></label>"
      + (ed ? '<button class="btn btn--primary btn--sm" id="inSeSave" style="margin-top:10px">💾 평가 저장</button>' : "") + "</div></div>"
      + '<div class="board in-board"><div class="board__head"><h3 class="board__title">📊 업무 수행 평가</h3><span class="hint">팀리더 &amp; 교육 스탭과 함께 · 팀리더 면담 시 작성</span></div><div class="in-pad18">'
      + weCats.map(function (c) {
          return '<div class="in-grp">' + c + "</div>" + I.WE_ITEMS.filter(function (i) { return i.cat === c; }).map(function (it) {
            var sc = we.scores[it.id] || 0;
            return '<div class="in-eval"><div><b>' + esc(it.title) + '</b><div class="hint">' + esc(it.desc) + '</div></div><div class="in-rate" data-we="' + it.id + '">'
              + [1, 2, 3, 4, 5].map(function (n) { return '<button type="button" data-n="' + n + '" class="r' + n + (sc === n ? " is-on" : "") + '" title="' + I.WE_LABELS[n] + '"' + (ed ? "" : " disabled") + ">" + n + "</button>"; }).join("")
              + "<small>" + (sc ? I.WE_LABELS[sc] : "미평가") + "</small></div></div>";
          }).join("");
        }).join("")
      + (sum ? '<div class="in-wesum"><div><span>평가 완료 항목</span><b>' + sum.count + " / " + sum.total + "개</b></div><div><span>평균 점수</span><b>" + sum.avg.toFixed(1) + "점 " + sum.icon + "</b></div><div><span>종합 평가</span><b>" + sum.grade + "</b></div></div>" : "")
      + (ed ? '<button class="btn btn--primary btn--sm" id="inWeSave" style="margin-top:10px">💾 평가 저장</button>' : "") + "</div></div></div>";
    if (!ed) return;
    box.querySelectorAll("[data-se]").forEach(function (g) {
      g.querySelectorAll("button").forEach(function (b) { b.onclick = function () { var n = +b.dataset.n; se.scores[g.dataset.se] = n; g.querySelectorAll("button").forEach(function (x) { x.classList.toggle("is-on", +x.dataset.n <= n); }); g.querySelector("small").textContent = I.SE_LABELS[n]; }; });
    });
    box.querySelectorAll("[data-we]").forEach(function (g) {
      g.querySelectorAll("button").forEach(function (b) { b.onclick = function () { var n = +b.dataset.n; we.scores[g.dataset.we] = n; g.querySelectorAll("button").forEach(function (x) { x.classList.toggle("is-on", +x.dataset.n === n); }); g.querySelector("small").textContent = I.WE_LABELS[n]; }; });
    });
    document.getElementById("inSeSave").onclick = function () {
      var v = { scores: se.scores, comment: document.getElementById("inSeCmt").value.trim(), savedAt: new Date().toISOString(), by: by() };
      S.saveProfile({ id: p.id, selfEval: v }).then(function () { p.selfEval = v; toast("✅ 자기 평가가 저장되었습니다"); paintEval(); });
    };
    document.getElementById("inWeSave").onclick = function () {
      var v = { scores: we.scores, savedAt: new Date().toISOString(), by: by() };
      S.saveProfile({ id: p.id, workEval: v }).then(function () { p.workEval = v; toast("📊 업무 수행 평가가 저장되었습니다"); paintEval(); });
    };
  }

  /* ----- 식물 점검 기록 ----- */
  function paintPlant() {
    var p = st8.p, ed = canEdit(), box = document.getElementById("inPlant");
    var list = st8.notes.filter(function (n) { return n.kind === "plant"; });
    var dot = function (c) { return '<span class="in-dot in-dot--' + c[0] + '">●</span> ' + c[1]; };
    box.innerHTML = '<div class="board in-board" id="inPlantB"><div class="board__head"><h3 class="board__title">🔍 주간 식물 상태 점검표</h3><div class="row-actions" style="gap:8px"><span class="hint">매주 목요일 순찰 시 각 항목을 체크해요</span>' + (ed ? '<button class="btn btn--sm btn--primary" id="inPlantAdd">+ 점검 추가</button>' : "") + "</div></div><div class=\"in-pad18\">"
      + '<details class="in-ex"><summary>📋 점검표 예시 — 이렇게 체크하며 순찰해요</summary><div class="board__scroll"><table class="board__table"><thead><tr><th>식물 / 위치</th><th>수분</th><th>잎 상태</th><th>병해충</th><th>외관</th><th>조치 필요</th></tr></thead><tbody>'
      + I.PLANT_EXAMPLE.map(function (r) { return "<tr><td>" + r[0] + ' <span class="hint">' + r[1] + "</span></td><td>" + dot(r[2]) + "</td><td>" + dot(r[3]) + "</td><td>" + dot(r[4]) + "</td><td>" + dot(r[5]) + "</td><td>" + (r[6] || "—") + "</td></tr>"; }).join("")
      + '</tbody></table></div><p class="hint"><span class="in-dot in-dot--good">●</span> 양호 &nbsp; <span class="in-dot in-dot--warn">●</span> 주의 &nbsp; <span class="in-dot in-dot--bad">●</span> 이상</p></details>'
      + (list.length ? list.map(function (n) {
          return '<div class="in-note-card"><div class="in-note-card__h"><b>📅 ' + esc(n.date.replace(/-/g, ".")) + " (" + I.DOW[I.parse(n.date).getDay()] + ')</b><span class="hint">' + esc(n.createdBy || "") + "</span>" + (ed ? '<button class="btn btn--sm btn--ghost" data-delnote="' + n.id + '">삭제</button>' : "") + "</div>"
            + '<div class="in-note-body">' + esc(n.rows && n.rows.length ? n.rows.map(I.plantLine).join("\n") : n.body) + "</div></div>";
        }).join("") : '<div class="empty">아직 점검 기록이 없어요</div>')
      + "</div></div>";
    if (!ed) return;
    bindDelNote(box);
    document.getElementById("inPlantAdd").onclick = openPlant;
  }
  function openPlant() {
    var p = st8.p, rows = [{ name: "", loc: "", water: "양호", leaf: "양호", pest: "양호", look: "양호" }, { name: "", loc: "", water: "양호", leaf: "양호", pest: "양호", look: "양호" }];
    var w = modal("🌿 주간 식물 상태 점검표", '<form class="in-form"><label class="fld"><span>점검일</span><input type="date" name="date" value="' + I.today() + '"></label>'
      + '<div class="board__scroll"><table class="board__table in-pp"><thead><tr><th>식물 / 위치</th>' + I.PLANT_FIELDS.map(function (f) { return "<th>" + f[1] + "</th>"; }).join("") + "<th></th></tr></thead><tbody></tbody></table></div>"
      + '<button type="button" class="btn btn--sm" id="ppAdd">+ 식물 추가</button>'
      + '<label class="fld"><span>또는 간단 메모 (예: 몬스테라 잎 세정 완료, 아이비 수분 부족 확인)</span><textarea name="memo" rows="2"></textarea></label>'
      + '<div class="modal__foot"><div class="modal__spacer"></div><button type="button" class="btn" data-close>닫기</button><button type="submit" class="btn btn--primary">💾 점검 저장</button></div></form>', true);
    w.querySelectorAll("[data-close]").forEach(function (el) { el.addEventListener("click", function () { w.remove(); }); });
    var tb = w.querySelector("tbody");
    function draw() {
      tb.innerHTML = rows.map(function (r, i) {
        return '<tr><td><input class="in-in" placeholder="식물명" data-i="' + i + '" data-k="name" value="' + esc(r.name) + '"><input class="in-in" placeholder="위치" data-i="' + i + '" data-k="loc" value="' + esc(r.loc) + '"></td>'
          + I.PLANT_FIELDS.map(function (f) { return '<td><select class="in-in" data-i="' + i + '" data-k="' + f[0] + '">' + I.PLANT_STATUS.map(function (s) { return '<option' + (r[f[0]] === s ? " selected" : "") + ">" + s + "</option>"; }).join("") + "</select></td>"; }).join("")
          + '<td><button type="button" class="btn btn--sm btn--ghost" data-rm="' + i + '">✕</button></td></tr>';
      }).join("");
      tb.querySelectorAll("[data-k]").forEach(function (el) { el.oninput = el.onchange = function () { rows[+el.dataset.i][el.dataset.k] = el.value; }; });
      tb.querySelectorAll("[data-rm]").forEach(function (b) { b.onclick = function () { rows.splice(+b.dataset.rm, 1); draw(); }; });
    }
    draw();
    w.querySelector("#ppAdd").onclick = function () { rows.push({ name: "", loc: "", water: "양호", leaf: "양호", pest: "양호", look: "양호" }); draw(); };
    w.querySelector("form").onsubmit = function (e) {
      e.preventDefault();
      var f = e.target, filled = rows.filter(function (r) { return r.name.trim(); }), memo = f.memo.value.trim();
      if (!f.date.value) { toast("날짜를 선택해주세요"); return; }
      if (!filled.length && !memo) { toast("식물명을 하나 이상 입력하거나 메모를 적어 주세요"); return; }
      S.addNote({ internId: p.id, kind: "plant", date: f.date.value, rows: filled, body: memo, createdBy: by() }).then(function (n) { st8.notes.unshift(n); w.remove(); paintPlant(); toast("✅ 점검 기록이 저장되었습니다"); });
    };
  }

  /* ----- 나의 메모장 ----- */
  function paintMemo() {
    var p = st8.p, ed = canEdit(), box = document.getElementById("inMemo"), cat = st8.memoCat;
    var catOf = {}; I.MEMO_CATS.forEach(function (c) { catOf[c.key] = c; });
    var list = st8.notes.filter(function (n) { return n.kind === "memo" && (cat === "all" || n.cat === cat); });
    box.innerHTML = '<div class="board in-board"><div class="board__head"><h3 class="board__title">📓 나의 메모장</h3><span class="hint">배우면서 느낀 것들을 자유롭게 기록해요</span></div><div class="in-pad18">'
      + (ed ? '<div class="in-memo-w"><select id="inMemoCat" class="in-in">' + I.MEMO_CATS.map(function (c) { return '<option value="' + c.key + '">' + c.label + "</option>"; }).join("") + "</select>"
        + '<textarea id="inMemoTxt" class="in-in" rows="2" placeholder="오늘 배운 것, 식물 관찰 내용, 궁금한 점, 실수한 것 등 자유롭게 적어보세요 🌱"></textarea><button class="btn btn--sm btn--primary" id="inMemoSave">저장하기</button></div>' : "")
      + '<details class="in-ex"><summary>📖 이런 메모를 남겨보세요 (예시)</summary>' + I.MEMO_CATS.map(function (c) { return '<div class="in-note-card"><b>' + c.label + '</b><div class="in-note-body">' + esc(c.ex) + "</div></div>"; }).join("") + "</details>"
      + '<div class="in-months">' + [["all", "전체"]].concat(I.MEMO_CATS.map(function (c) { return [c.key, c.label]; })).map(function (c) { return '<button class="in-chip' + (cat === c[0] ? " is-on" : "") + '" data-mcat="' + c[0] + '">' + c[1] + "</button>"; }).join("") + "</div>"
      + (list.length ? list.map(function (n) {
          return '<div class="in-note-card"><div class="in-note-card__h"><b>' + esc((catOf[n.cat] || catOf.learn).label) + '</b><span class="hint">' + esc(n.date.replace(/-/g, ".")) + " " + esc((n.createdAt || "").slice(11, 16)) + (n.createdBy ? " · " + esc(n.createdBy) : "") + "</span>"
            + (ed ? '<button class="btn btn--sm btn--ghost" data-delnote="' + n.id + '">삭제</button>' : "") + '</div><div class="in-note-body">' + esc(n.body) + "</div></div>";
        }).join("") : '<div class="empty">메모가 없어요</div>')
      + "</div></div>";
    box.querySelectorAll("[data-mcat]").forEach(function (b) { b.onclick = function () { st8.memoCat = b.dataset.mcat; paintMemo(); }; });
    if (!ed) return;
    bindDelNote(box);
    document.getElementById("inMemoSave").onclick = function () {
      var t = document.getElementById("inMemoTxt").value.trim(); if (!t) { toast("메모 내용을 입력해주세요"); return; }
      S.addNote({ internId: p.id, kind: "memo", cat: document.getElementById("inMemoCat").value, body: t, createdBy: by() }).then(function (n) { st8.notes.unshift(n); paintMemo(); toast("📓 메모가 저장되었습니다"); });
    };
  }
  function bindDelNote(box) {
    box.querySelectorAll("[data-delnote]").forEach(function (b) {
      b.onclick = function () { if (!confirm("삭제할까요?")) return; S.deleteNote(b.dataset.delnote).then(function () { st8.notes = st8.notes.filter(function (n) { return n.id !== b.dataset.delnote; }); paintPlant(); paintMemo(); toast("🗑️ 삭제됨"); }); };
    });
  }

  /* ----- 인턴 정보 · 담당자 서명 ----- */
  function openProfile(p) {
    var isNew = !p;
    p = p || { name: "", crewName: "", company: "㈜링키지랩", job: "", startDate: "", endDate: "", manager: "", mentor: "", mentorTeam: "", workIn: "07:00", workOut: "16:00", active: true, managerSign: "" };
    var w = modal(isNew ? "인턴 추가" : "인턴 정보", '<form class="in-form">'
      + '<div class="fld-row"><label class="fld"><span>인턴 이름 <em>*</em></span><input name="name" required value="' + esc(p.name) + '" placeholder="예) 홍길동(gildong)"></label>'
      + '<label class="fld"><span>서명 페이지 이름</span><input name="crewName" value="' + esc(p.crewName) + '" placeholder="비우면 인턴 이름"></label></div>'
      + '<label class="fld"><span>사업체명</span><input name="company" value="' + esc(p.company) + '"></label>'
      + '<label class="fld"><span>직무내용 (기록부에 그대로)</span><input name="job" value="' + esc(p.job) + '" placeholder="조경관리(화초 및 식물 관리, 낙엽청소, 조경 도구 정리 등)"></label>'
      + '<div class="fld-row"><label class="fld"><span>인턴 시작일 <em>*</em></span><input type="date" name="startDate" required value="' + esc(p.startDate) + '"></label><label class="fld"><span>인턴 종료일 <em>*</em></span><input type="date" name="endDate" required value="' + esc(p.endDate) + '"></label></div>'
      + '<div class="fld-row"><label class="fld"><span>정상 출근 시간</span><input type="time" name="workIn" value="' + esc(p.workIn) + '"></label><label class="fld"><span>정상 퇴근 시간</span><input type="time" name="workOut" value="' + esc(p.workOut) + '"></label></div>'
      + '<div class="fld-row"><label class="fld"><span>사업체 담당자 (기록부 하단)</span><input name="manager" value="' + esc(p.manager) + '" placeholder="예) 홍길동"></label>'
      + '<label class="fld"><span>담당 멘토</span><input name="mentor" value="' + esc(p.mentor) + '" placeholder="엘리 (ellie)"></label></div>'
      + '<div class="fld-row"><label class="fld"><span>멘토 소속</span><input name="mentorTeam" value="' + esc(p.mentorTeam) + '" placeholder="스낵&amp;가든 사업팀"></label>'
      + '<label class="fld"><span>상태</span><select name="active"><option value="1"' + (p.active ? " selected" : "") + '>진행중</option><option value="0"' + (p.active ? "" : " selected") + ">종료</option></select></label></div>"
      + '<div class="fld"><span>✍️ 사업체 담당자 서명 — 출퇴근 기록부 하단에 표시돼요</span><div id="mgrSig"></div></div>'
      + '<div class="modal__foot"><div class="modal__spacer"></div><button type="button" class="btn" data-close>취소</button><button type="submit" class="btn btn--primary">저장</button></div></form>', true);
    w.querySelectorAll("[data-close]").forEach(function (el) { el.addEventListener("click", function () { w.remove(); }); });
    var sig = p.managerSign, pad = null, box = w.querySelector("#mgrSig");
    function draw() {
      if (sig && !pad) {
        box.innerHTML = '<div class="in-sigbox"><img src="' + sig + '" alt="담당자 서명"><button type="button" class="btn btn--sm" id="mgrRe">다시 서명</button><button type="button" class="btn btn--sm btn--ghost" id="mgrDel">지우기</button></div>';
        box.querySelector("#mgrRe").onclick = function () { sig = ""; draw(); };
        box.querySelector("#mgrDel").onclick = function () { sig = ""; draw(); };
        return;
      }
      box.innerHTML = '<div class="in-thick"><span>굵기</span><input type="range" min="1" max="6" step="0.5" value="1.5" id="mgrThick"></div><canvas class="in-pad in-pad--sm"></canvas><div class="in-padfoot"><span class="hint">아래 영역에 서명해주세요</span><button type="button" class="btn btn--sm" id="mgrClr">지우기</button></div>';
      pad = I.sigPad(box.querySelector("canvas"), 1.5);
      box.querySelector("#mgrThick").oninput = function () { pad.width(+this.value); };
      box.querySelector("#mgrClr").onclick = function () { pad.clear(); };
    }
    draw();
    w.querySelector("form").onsubmit = function (e) {
      e.preventDefault();
      var f = e.target;
      if (f.endDate.value < f.startDate.value) { toast("종료일이 시작일보다 빨라요"); return; }
      var out = { id: isNew ? "" : p.id, name: f.name.value.trim(), crewName: f.crewName.value.trim() || f.name.value.trim(), company: f.company.value.trim(), job: f.job.value.trim(),
        startDate: f.startDate.value, endDate: f.endDate.value, workIn: f.workIn.value || "07:00", workOut: f.workOut.value || "16:00", manager: f.manager.value.trim(),
        mentor: f.mentor.value.trim(), mentorTeam: f.mentorTeam.value.trim(), active: f.active.value === "1", managerSign: pad && !pad.isEmpty() ? pad.dataUrl() : sig || "" };
      S.saveProfile(out).then(function (id) {
        w.remove(); toast(isNew ? "인턴을 추가했어요" : "저장했습니다");
        if (isNew) location.hash = SIGN + "/intern/" + encodeURIComponent(id); else reload();
      }).catch(function (er) { console.warn(er); toast(I.needSql(er) ? "Supabase 에 intern.sql 을 먼저 실행해 주세요" : "저장하지 못했어요"); });
    };
  }

  /* ----- 엑셀 (예전 '출퇴근기록' 시트 칸 그대로 + 수정자) ----- */
  function exportXlsx() {
    if (!window.XLSX) { toast("엑셀 모듈을 불러오는 중입니다. 잠시 후 다시 시도해주세요."); return; }
    var p = st8.p, ym = st8.ym;
    var mins = function (a, b) { if (!a || !b) return ""; var x = a.split(":"), y = b.split(":"), d = (+y[0] * 60 + +y[1]) - (+x[0] * 60 + +x[1]); return d > 0 ? Math.floor(d / 60) + "시간 " + d % 60 + "분" : ""; };
    var sheet = function (days) {
      return days.map(function (r) {
        return { 날짜: r.date, 요일: I.dayLabel(r.date), 출근시간: r.inTime, 퇴근시간: r.outTime, 실제근무시간: mins(r.inTime, r.outTime), 상태: I.STATUS[r.status].short,
          지각: r.late ? "✓" : "", 조퇴: r.early ? "✓" : "", 결근: r.absChk ? "✓" : "", 유급휴일: r.status === "paid" ? (r.halfType === "am" ? "오전반차" : r.halfType === "pm" ? "오후반차" : "유급") : "",
          인턴서명: r.signData ? "서명완료" : r.legacySigned ? "서명완료(예전)" : "", 비고: r.note, 저장일시: (r.savedAt || "").replace("T", " ").slice(0, 16), 기록자: r.updatedBy };
      });
    };
    var wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheet(st8.days.filter(function (r) { return r.date.slice(0, 7) === ym; }))), (+ym.slice(5)) + "월");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheet(st8.days)), "출퇴근기록");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(I.monthsOf(p).map(function (k) { var s = I.stats(p, st8.days, k); return { 월: (+k.slice(5)) + "월", 총근무일: s.work, 결근: s.abs, 지각: s.late, 조퇴: s.early, 유급휴일: s.paid, 대체공휴일: s.alt }; })), "월간집계");
    XLSX.writeFile(wb, (p.name + "_중증장애인인턴제_출퇴근기록_" + ym).replace(/[\\/:*?"<>|]/g, "_") + ".xlsx");
    toast("엑셀 파일을 다운로드했습니다");
  }

  return { renderList: renderList, renderDetail: renderDetail, pinCards: pinCards, tabsHtml: tabsHtml };
})();
