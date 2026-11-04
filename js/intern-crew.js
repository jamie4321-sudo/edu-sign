/* =========================================================
   중증장애인턴제 출석 — 인턴 서명 화면 (sign.html 안, 쉬운 말 · 큰 버튼)
   탭: 출석(오늘 출석 + 서명 · 서명 안 한 날 · 이번 달) · 수습(4주 체크 · 자기 평가) · 점검표 · 메모장
   지난 기록 고치기 · 삭제는 관리자 화면에서만
   ========================================================= */
window.InternCrew = (function () {
  "use strict";
  var I = Intern, S = Intern.store, esc = Intern.esc;
  var root, p, days, notes, back, tab = "att", signDate = null;
  function toast(msg) { var el = document.createElement("div"); el.className = "sw-toast"; el.textContent = msg; document.body.appendChild(el); setTimeout(function () { el.remove(); }, 2200); }
  function short(name) { return String(name || "").replace(/\(.*\)/, "").trim().slice(-2); }
  function dayOf(key) { return days.filter(function (r) { return r.date === key; })[0]; }
  function inPeriod(key) { return (!p.startDate || key >= p.startDate) && (!p.endDate || key <= p.endDate); }

  function open(el, profile, onBack) {
    root = el; p = profile; back = onBack; tab = "att"; signDate = null;
    root.innerHTML = '<p class="sw-sub">불러오는 중…</p>';
    Promise.all([S.listDays(p.id), S.listNotes(p.id)]).then(function (a) { days = a[0]; notes = a[1]; paint(); })
      .catch(function () { root.innerHTML = '<h1 class="sw-title">불러오지 못했어요</h1><p class="sw-sub">인터넷 연결을 확인하고 새로고침해 주세요.</p>'; });
  }
  function reload() { return S.listDays(p.id).then(function (d) { days = d; paint(); }); }

  function paint() {
    var per = I.period(p), td = I.today(), d = I.parse(td);
    root.innerHTML = '<span class="sw-back" id="incBack">← 처음으로</span>'
      + '<div class="sw-greet"><h1>' + esc(short(p.name)) + '님, 안녕하세요!</h1><p>' + (d.getMonth() + 1) + "월 " + d.getDate() + "일 " + I.DOW[d.getDay()] + "요일 · 중증장애인 인턴제</p></div>"
      + '<div class="inc-card"><p class="inc-hint">나의 인턴 기간 ' + esc(p.startDate.replace(/-/g, ".")) + " ~ " + esc(p.endDate.replace(/-/g, ".")) + "</p>"
      + "<h3>" + (per.left == null ? "" : per.left > 0 ? per.left + "일 남았어요" : per.left === 0 ? "오늘이 마지막 날이에요" : "인턴 기간이 끝났어요") + '</h3><div class="inc-bar"><i style="width:' + per.pct + '%"></i></div></div>'
      + '<div class="inc-tabs">' + [["att", "📝", "출석"], ["prob", "🌱", "수습"], ["plant", "🔍", "점검표"], ["memo", "📓", "메모장"]].map(function (t) { return '<button data-tab="' + t[0] + '" class="' + (tab === t[0] ? "is-on" : "") + '"><span>' + t[1] + "</span>" + t[2] + "</button>"; }).join("") + "</div>"
      + '<div id="incBody"></div>';
    document.getElementById("incBack").onclick = back;
    root.querySelectorAll("[data-tab]").forEach(function (b) { b.onclick = function () { tab = b.dataset.tab; signDate = null; paint(); }; });
    ({ att: paintAtt, prob: paintProb, plant: paintPlant, memo: paintMemo })[tab]();
  }

  /* ---------------- 출석 ---------------- */
  function paintAtt() {
    var body = document.getElementById("incBody"), td = I.today(), key = signDate || td, r = dayOf(key);
    var unsigned = days.filter(function (x) { return x.status === "normal" && !I.isSigned(x) && x.date !== key && x.date <= td; }).reverse();
    var html = "";
    if (signDate) html += '<p class="inc-hint" style="margin:0 0 8px"><b>' + I.dayLabel(key) + '</b> 서명하기 · <a href="#" id="incToday">오늘로 돌아가기</a></p>';
    if (!inPeriod(key)) html += '<div class="inc-card"><h3>오늘은 인턴 기간이 아니에요</h3><p class="inc-hint">기록이 필요하면 담당자에게 말해 주세요.</p></div>';
    else if (!r && I.isWeekend(key)) html += '<div class="inc-card"><h3>오늘은 쉬는 날이에요 🌿</h3><p class="inc-hint">주말에 일했다면 담당자에게 말해 주세요.</p></div>';
    else if (!r) html += newCard(key);
    else if (I.isSigned(r) || r.status === "alt" || r.status === "absence") html += doneCard(r);
    else html += signCard(r);
    if (unsigned.length) html += '<div class="inc-card"><h3>✍️ 서명 안 한 날 ' + unsigned.length + "일</h3><p class=\"inc-hint\">눌러서 서명해 주세요</p>"
      + unsigned.slice(0, 20).map(function (x) { return '<div class="inc-row"><span><b>' + I.dayLabel(x.date) + "</b> 출근 " + esc(x.inTime || "-") + '</span><button class="inc-pill inc-pill--todo" data-sign="' + x.date + '">서명하기</button></div>'; }).join("") + "</div>";
    html += monthCard(td.slice(0, 7));
    body.innerHTML = html;
    var t = document.getElementById("incToday"); if (t) t.onclick = function (e) { e.preventDefault(); signDate = null; paintAtt(); };
    body.querySelectorAll("[data-sign]").forEach(function (b) { b.onclick = function () { signDate = b.dataset.sign; paintAtt(); window.scrollTo({ top: 0, behavior: "smooth" }); }; });
    bindNew(key); bindSign(r);
  }
  function newCard(key) {
    return '<div class="inc-card" id="incNew"><h3>오늘 출석</h3><p class="inc-hint">오늘 어땠는지 하나를 눌러 주세요</p>'
      + '<div class="inc-st"><button data-st="normal" class="is-on">☀️ 출근했어요<small>' + esc(p.workIn) + " ~ " + esc(p.workOut) + '</small></button><button data-st="paid">🌿 유급 휴일<small>연차 · 반차</small></button><button data-st="alt">🔄 대체 공휴일<small>쉬는 날</small></button><button data-st="late">⚠️ 늦게 왔어요<small>지각</small></button></div>'
      + '<div class="inc-half" hidden>' + Object.keys(I.HALF).map(function (k) { return '<button data-half="' + k + '" class="' + (k === "full" ? "is-on" : "") + '">' + I.HALF[k].label + "</button>"; }).join("") + "</div>"
      + '<div id="incLate" hidden><p class="inc-hint" style="margin-top:12px">몇 시에 왔나요? 왜 늦었나요?</p><input type="time" class="inc-in" id="incLateT" value="' + esc(p.workIn) + '"><input class="inc-in" id="incLateN" placeholder="예) 버스가 늦게 왔어요"></div>'
      + '<p class="inc-hint" style="margin-top:14px" id="incSigHint">여기에 이름을 써 주세요</p><canvas class="sw-sigpad" id="incPad"></canvas>'
      + '<div class="sw-sig-actions"><button type="button" id="incClr">다시 쓰기</button></div></div>'
      + '<button class="sw-btn sw-btn--primary" id="incSave">출석하고 서명하기</button>';
  }
  function bindNew(key) {
    var box = document.getElementById("incNew"); if (!box) return;
    var st = "normal", half = "full", pad = I.sigPad(document.getElementById("incPad"), 3);
    document.getElementById("incClr").onclick = function () { pad.clear(); };
    box.querySelectorAll("[data-st]").forEach(function (b) {
      b.onclick = function () {
        st = b.dataset.st; box.querySelectorAll("[data-st]").forEach(function (x) { x.classList.toggle("is-on", x === b); });
        box.querySelector(".inc-half").hidden = st !== "paid"; document.getElementById("incLate").hidden = st !== "late";
        document.getElementById("incSave").textContent = st === "alt" ? "저장하기" : "출석하고 서명하기";
        document.getElementById("incSigHint").textContent = st === "alt" ? "대체 공휴일은 서명 안 해도 돼요" : "여기에 이름을 써 주세요";
      };
    });
    box.querySelectorAll("[data-half]").forEach(function (b) { b.onclick = function () { half = b.dataset.half; box.querySelectorAll("[data-half]").forEach(function (x) { x.classList.toggle("is-on", x === b); }); }; });
    document.getElementById("incSave").onclick = function () {
      var btn = this;
      if (st !== "alt" && pad.isEmpty()) { toast("이름을 먼저 써 주세요"); return; }
      var r = { internId: p.id, date: key, status: st === "late" ? "normal" : st, halfType: st === "paid" ? half : "full",
        inTime: st === "alt" ? "" : st === "paid" ? I.HALF[half].inT : st === "late" ? document.getElementById("incLateT").value : p.workIn,
        outTime: st === "alt" ? "" : st === "paid" ? I.HALF[half].outT : p.workOut,
        late: st === "late", early: false, absChk: false, note: st === "late" ? document.getElementById("incLateN").value.trim() : "",
        signData: pad.isEmpty() ? "" : pad.dataUrl(), signedAt: pad.isEmpty() ? "" : new Date().toISOString(), updatedBy: "인턴 본인" };
      btn.disabled = true;
      S.saveDay(r).then(function () { toast("✅ 저장했어요"); signDate = null; return reload(); }).catch(function () { btn.disabled = false; toast("저장하지 못했어요. 다시 눌러 주세요."); });
    };
  }
  function signCard(r) {
    return '<div class="inc-card" id="incSign"><h3>' + I.dayLabel(r.date) + " · " + I.STATUS[r.status].label + (r.status === "paid" ? " (" + I.HALF[r.halfType].label + ")" : "") + "</h3>"
      + '<p class="inc-hint">출근 ' + esc(r.inTime || "-") + " · 퇴근 " + esc(r.outTime || "-") + (r.note ? " · " + esc(r.note) : "") + "</p>"
      + '<p class="inc-hint" style="margin-top:12px">여기에 이름을 써 주세요</p><canvas class="sw-sigpad" id="incPad2"></canvas><div class="sw-sig-actions"><button type="button" id="incClr2">다시 쓰기</button></div></div>'
      + '<button class="sw-btn sw-btn--primary" id="incSign2">서명 완료</button><p class="inc-hint" style="text-align:center;margin-bottom:12px">기록이 틀렸으면 담당자에게 말해 주세요</p>';
  }
  function bindSign(r) {
    if (!document.getElementById("incSign")) return;
    var pad = I.sigPad(document.getElementById("incPad2"), 3);
    document.getElementById("incClr2").onclick = function () { pad.clear(); };
    document.getElementById("incSign2").onclick = function () {
      var btn = this; if (pad.isEmpty()) { toast("이름을 먼저 써 주세요"); return; }
      btn.disabled = true;
      S.saveDay(Object.assign({}, r, { signData: pad.dataUrl(), signedAt: new Date().toISOString(), updatedBy: r.updatedBy || "인턴 본인" }))
        .then(function () { toast("✍️ 서명이 저장되었습니다"); signDate = null; return reload(); })
        .catch(function () { btn.disabled = false; toast("저장하지 못했어요. 다시 눌러 주세요."); });
    };
  }
  function doneCard(r) {
    var img = r.signData ? '<img class="inc-sig" src="' + r.signData + '" alt="서명">' : r.legacySigned ? '<span class="inc-pill inc-pill--done">서명 완료</span>' : "";
    return '<div class="inc-card"><div class="sw-done-badge"><span class="ok">✓</span><div><h3>' + I.dayLabel(r.date) + " " + (I.isSigned(r) ? "서명 완료" : "기록 완료") + '</h3><p class="inc-hint">'
      + I.STATUS[r.status].label + (r.status === "paid" ? " (" + I.HALF[r.halfType].label + ")" : "") + (r.inTime ? " · " + esc(r.inTime) + " ~ " + esc(r.outTime) : "") + "</p></div></div>"
      + (img ? '<div style="margin-top:10px">' + img + "</div>" : "") + '<p class="inc-hint" style="margin-top:10px">기록이 틀렸으면 담당자에게 말해 주세요</p></div>';
  }
  function monthCard(ym) {
    var s = I.stats(p, days, ym), y = +ym.slice(0, 4), m = +ym.slice(5, 7), last = new Date(y, m, 0).getDate(), fd = new Date(y, m - 1, 1).getDay(), td = I.today();
    var cells = I.DOW.map(function (d) { return "<b>" + d + "</b>"; }).join("");
    for (var i = 0; i < fd; i++) cells += '<span class="e"></span>';
    for (var d = 1; d <= last; d++) {
      var key = ym + "-" + I.p2(d), r = dayOf(key), c = r ? ({ normal: "n", paid: "p", alt: "t", absence: "a" }[r.status]) : "";
      cells += '<span class="' + c + (key === td ? " td" : "") + '">' + d + (r && r.status === "normal" ? "<i>" + (I.isSigned(r) ? "✓" : "✍️") + "</i>" : "<i>&nbsp;</i>") + "</span>";
    }
    return '<div class="inc-card"><h3>' + m + "월 출근 현황 " + s.pct + '%</h3><p class="inc-hint">출근 ' + I.fmtN(s.work) + "일 · 유급 " + I.fmtN(s.paid) + "일 · 대체 " + s.alt + "일" + (s.abs ? " · 결근 " + s.abs + "일" : "") + "</p>"
      + '<div class="inc-bar"><i style="width:' + s.pct + '%"></i></div><div class="inc-cal">' + cells + "</div></div>";
  }

  /* ---------------- 수습 ---------------- */
  function paintProb() {
    var body = document.getElementById("incBody"), pc = I.probCount(p), se = Object.assign({ scores: {}, comment: "" }, p.selfEval), we = I.weSummary((p.workEval || {}).scores);
    body.innerHTML = '<div class="inc-card"><h3>🌱 조경관리 4주 과정</h3><p class="inc-hint">배운 것을 눌러서 체크해요 · ' + pc.done + "/" + pc.total + '</p><div class="inc-bar"><i style="width:' + pc.pct + '%"></i></div>'
      + (pc.done === pc.total ? '<p style="font-weight:800;margin:10px 0 0">🎉 수습 과정 완료! ' + esc(p.mentor || "멘토") + "에게 알려주세요 💛</p>" : "")
      + I.PROB_WEEKS.map(function (wk) {
          return '<div class="inc-week">' + wk.icon + " " + wk.week + "주차 — " + esc(wk.title) + "</div>" + wk.groups.map(function (g) {
            return g.items.map(function (it) {
              var ck = !!p.prob[it.id];
              return '<div class="inc-item"><button class="inc-check' + (ck ? " is-on" : "") + '" data-prob="' + it.id + '">' + (ck ? "✓" : "") + "</button><div><b>" + esc(it.title) + '</b><p class="inc-hint">' + esc(it.desc) + "</p></div></div>";
            }).join("");
          }).join("");
        }).join("") + "</div>"
      + '<div class="inc-card"><h3>✍️ 자기 평가</h3><p class="inc-hint">솔직하게 나를 돌아봐요. 별을 눌러 주세요</p>'
      + I.SE_ITEMS.map(function (it) {
          var sc = se.scores[it.id] || 0;
          return '<div class="inc-item" style="display:block"><b>' + esc(it.title) + '</b><p class="inc-hint">' + esc(it.desc) + '</p><div class="inc-stars" data-se="' + it.id + '">' + [1, 2, 3, 4, 5].map(function (n) { return '<button data-n="' + n + '" class="' + (sc >= n ? "is-on" : "") + '">★</button>'; }).join("") + '</div><p class="inc-hint" data-sel="' + it.id + '">' + (sc ? I.SE_LABELS[sc] : "") + "</p></div>";
        }).join("")
      + '<p class="inc-hint" style="margin-top:10px">📝 전체 소감 한 줄</p><textarea class="inc-in" id="incCmt" rows="2" placeholder="가장 기억에 남는 것, 더 잘하고 싶은 것">' + esc(se.comment || "") + "</textarea></div>"
      + '<button class="sw-btn sw-btn--primary" id="incSeSave">자기 평가 저장</button>'
      + (we ? '<div class="inc-card" style="margin-top:12px"><h3>📊 업무 수행 평가 결과</h3><p class="inc-hint">팀리더 면담에서 함께 했어요</p><div class="inc-row"><span>평균</span><b>' + we.avg.toFixed(1) + "점 " + we.icon + '</b></div><div class="inc-row"><span>종합</span><b>' + we.grade + "</b></div></div>" : "")
      + '<div class="inc-card" style="margin-top:12px"><h3>🗓️ 4주 이후 정규 루틴</h3>' + I.ROUTINE.map(function (r) { return '<div class="inc-row" style="display:block"><b>' + r.icon + " " + r.dow + '</b><p class="inc-hint">' + r.items.map(esc).join("<br>") + "</p></div>"; }).join("")
      + (p.mentor ? '<p class="inc-hint" style="margin-top:8px">🌸 모르는 것은 언제든 ' + esc(p.mentor) + " 멘토에게 물어보세요 💛</p>" : "") + "</div>";
    body.querySelectorAll("[data-prob]").forEach(function (b) {
      b.onclick = function () {
        var prob = Object.assign({}, p.prob); prob[b.dataset.prob] = !prob[b.dataset.prob];
        S.saveProfile({ id: p.id, prob: prob }).then(function () { p.prob = prob; paintProb(); if (prob[b.dataset.prob]) toast("잘했어요! 🌱"); });
      };
    });
    body.querySelectorAll("[data-se]").forEach(function (g) {
      g.querySelectorAll("button").forEach(function (b) { b.onclick = function () { var n = +b.dataset.n; se.scores[g.dataset.se] = n; g.querySelectorAll("button").forEach(function (x) { x.classList.toggle("is-on", +x.dataset.n <= n); }); body.querySelector('[data-sel="' + g.dataset.se + '"]').textContent = I.SE_LABELS[n]; }; });
    });
    document.getElementById("incSeSave").onclick = function () {
      var v = { scores: se.scores, comment: document.getElementById("incCmt").value.trim(), savedAt: new Date().toISOString(), by: "인턴 본인" };
      S.saveProfile({ id: p.id, selfEval: v }).then(function () { p.selfEval = v; toast("✅ 자기 평가가 저장되었습니다"); });
    };
  }

  /* ---------------- 식물 점검표 ---------------- */
  function paintPlant() {
    var body = document.getElementById("incBody"), rows = [{ name: "", loc: "", water: "양호", leaf: "양호", pest: "양호", look: "양호" }];
    var list = notes.filter(function (n) { return n.kind === "plant"; });
    body.innerHTML = '<div class="inc-card"><h3>🔍 주간 식물 상태 점검표</h3><p class="inc-hint">매주 목요일 순찰할 때 써요 · 🟢 양호 🟡 주의 🔴 이상</p>'
      + '<p class="inc-hint" style="margin-top:10px">점검일</p><input type="date" class="inc-in" id="incPDate" value="' + I.today() + '"><div id="incPRows"></div>'
      + '<button class="sw-btn sw-btn--ghost" id="incPAdd">+ 식물 더 쓰기</button></div><button class="sw-btn sw-btn--primary" id="incPSave">점검 저장</button>'
      + '<div class="inc-card" style="margin-top:12px"><h3>나의 점검 기록</h3>' + (list.length ? list.map(function (n) {
          return '<div class="inc-row" style="display:block"><b>📅 ' + esc(n.date.replace(/-/g, ".")) + '</b><div class="inc-note">' + esc(n.rows && n.rows.length ? n.rows.map(I.plantLine).join("\n") : n.body) + "</div></div>";
        }).join("") : '<p class="inc-hint">아직 점검 기록이 없어요</p>') + "</div>";
    function draw() {
      document.getElementById("incPRows").innerHTML = rows.map(function (r, i) {
        return '<div class="inc-plant"><input class="inc-in" data-i="' + i + '" data-k="name" placeholder="식물 이름 (예: 몬스테라)" value="' + esc(r.name) + '"><input class="inc-in" data-i="' + i + '" data-k="loc" placeholder="위치 (예: 1층 로비)" value="' + esc(r.loc) + '">'
          + I.PLANT_FIELDS.map(function (f) { return '<div class="inc-q">' + f[1] + '<select data-i="' + i + '" data-k="' + f[0] + '">' + I.PLANT_STATUS.map(function (s) { return "<option" + (r[f[0]] === s ? " selected" : "") + ">" + s + "</option>"; }).join("") + "</select></div>"; }).join("") + "</div>";
      }).join("");
      body.querySelectorAll("[data-k]").forEach(function (el) { el.oninput = el.onchange = function () { rows[+el.dataset.i][el.dataset.k] = el.value; }; });
    }
    draw();
    document.getElementById("incPAdd").onclick = function () { rows.push({ name: "", loc: "", water: "양호", leaf: "양호", pest: "양호", look: "양호" }); draw(); };
    document.getElementById("incPSave").onclick = function () {
      var filled = rows.filter(function (r) { return r.name.trim(); }), date = document.getElementById("incPDate").value;
      if (!date) { toast("날짜를 골라 주세요"); return; }
      if (!filled.length) { toast("식물 이름을 써 주세요"); return; }
      S.addNote({ internId: p.id, kind: "plant", date: date, rows: filled, createdBy: "인턴 본인" }).then(function (n) { notes.unshift(n); toast("✅ 점검 기록이 저장되었습니다"); paintPlant(); });
    };
  }

  /* ---------------- 메모장 ---------------- */
  function paintMemo() {
    var body = document.getElementById("incBody"), catOf = {}; I.MEMO_CATS.forEach(function (c) { catOf[c.key] = c; });
    var list = notes.filter(function (n) { return n.kind === "memo"; });
    body.innerHTML = '<div class="inc-card"><h3>✏️ 새 메모</h3><select class="inc-in" id="incMCat">' + I.MEMO_CATS.map(function (c) { return '<option value="' + c.key + '">' + c.label + "</option>"; }).join("") + "</select>"
      + '<textarea class="inc-in" id="incMTxt" rows="3" placeholder="오늘 배운 것, 식물 관찰, 궁금한 점, 실수한 것 등 자유롭게 적어보세요 🌱"></textarea>'
      + '<details style="margin-top:8px"><summary class="inc-hint">📖 이런 메모를 남겨보세요 (예시)</summary>' + I.MEMO_CATS.map(function (c) { return '<p class="inc-hint" style="margin-top:6px"><b>' + c.label + "</b><br>" + esc(c.ex) + "</p>"; }).join("") + "</details></div>"
      + '<button class="sw-btn sw-btn--primary" id="incMSave">저장하기</button>'
      + '<div class="inc-card" style="margin-top:12px"><h3>나의 메모</h3>' + (list.length ? list.map(function (n) {
          return '<div class="inc-row" style="display:block"><b>' + esc((catOf[n.cat] || catOf.learn).label) + '</b> <span class="inc-hint">' + esc(n.date.replace(/-/g, ".")) + '</span><div class="inc-note">' + esc(n.body) + "</div></div>";
        }).join("") : '<p class="inc-hint">아직 메모가 없어요</p>') + "</div>";
    document.getElementById("incMSave").onclick = function () {
      var t = document.getElementById("incMTxt").value.trim(); if (!t) { toast("메모를 써 주세요"); return; }
      S.addNote({ internId: p.id, kind: "memo", cat: document.getElementById("incMCat").value, body: t, createdBy: "인턴 본인" }).then(function (n) { notes.unshift(n); toast("📓 메모가 저장되었습니다"); paintMemo(); });
    };
  }

  return { open: open };
})();
