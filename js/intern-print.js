/* 중증장애인 인턴제 출·퇴근 기록부 출력 — intern-print.html?id=<인턴>&m=<YYYY-MM | all>
   인쇄 = 브라우저 인쇄(A4 세로, 여백 0) · 드라이브 저장 = 쪽마다 그림 → PDF → GAS(handlePdf_) '중증장애인턴제' 폴더 */
(function () {
  "use strict";
  var qs = new URLSearchParams(location.search), id = qs.get("id"), m = qs.get("m") || "", demo = qs.get("demo") === "1";
  var LIBS = { h2c: "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js", pdf: "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js" };
  var pages = document.getElementById("pages"), msg = document.getElementById("msg"), sel = document.getElementById("month"), data = null;
  document.getElementById("ptCss").textContent = Intern.PRINT_CSS;
  document.getElementById("back").onclick = function () { location.href = "index.html" + (demo ? "?demo=1" : "") + "#/sign/intern/" + encodeURIComponent(id || ""); };
  document.getElementById("print").onclick = function () { window.print(); };
  function say(t) { msg.textContent = t || ""; }
  if (!id) { pages.innerHTML = '<div style="padding:40px;text-align:center">잘못된 접근입니다</div>'; return; }

  Promise.all([Intern.store.getProfile(id), Intern.store.listDays(id)]).then(function (a) {
    if (!a[0]) { pages.innerHTML = '<div style="padding:40px;text-align:center">인턴을 찾을 수 없어요</div>'; return; }
    data = { p: a[0], days: a[1], months: Intern.monthsOf(a[0]) };
    if (!m) m = data.months.indexOf(Intern.today().slice(0, 7)) > -1 ? Intern.today().slice(0, 7) : data.months[0];
    sel.innerHTML = '<option value="all">전체 기간 (' + data.months.length + "쪽)</option>" + data.months.map(function (k) { return '<option value="' + k + '">' + k.slice(0, 4) + "년 " + (+k.slice(5)) + "월</option>"; }).join("");
    sel.value = m;
    sel.onchange = function () { m = sel.value; history.replaceState(null, "", "?id=" + encodeURIComponent(id) + "&m=" + m + (demo ? "&demo=1" : "")); draw(); };
    draw();
  }).catch(function (e) { console.warn(e); pages.innerHTML = '<div style="padding:40px;text-align:center">불러오지 못했어요</div>'; });

  function list() { return m === "all" ? data.months : [m]; }
  function draw() {
    pages.innerHTML = list().map(function (k) { return '<div class="a4">' + Intern.printHtml(data.p, data.days, k) + "</div>"; }).join("");
    var miss = data.days.filter(function (r) { return list().indexOf(r.date.slice(0, 7)) > -1 && r.legacySigned && !r.signData; }).length;
    say(miss ? "예전 구글 출퇴근부에서 서명한 " + miss + "일은 서명 그림이 없어 빈칸으로 나와요" : "");
    document.title = data.p.name + " " + (m === "all" ? "전체" : (+m.slice(5)) + "월") + " 출·퇴근 기록부";
  }

  function load(src) { return new Promise(function (res, rej) { if (document.querySelector('script[src="' + src + '"]')) return res(); var s = document.createElement("script"); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); }); }
  document.getElementById("drive").onclick = function () {
    var btn = this, ep = window.CONFIG && CONFIG.endpoint;
    if (!ep) { say("드라이브 연동 주소가 없어요"); return; }
    btn.disabled = true; say("PDF 만드는 중…");
    load(LIBS.h2c).then(function () { return load(LIBS.pdf); }).then(function () { return document.fonts && document.fonts.ready; }).then(function () {
      var doc = new window.jspdf.jsPDF({ unit: "mm", format: "a4", orientation: "portrait" }), els = [].slice.call(document.querySelectorAll(".a4"));
      return els.reduce(function (pr, el, i) {
        return pr.then(function () {
          say("PDF 만드는 중… " + (i + 1) + "/" + els.length);
          return window.html2canvas(el, { scale: 2, backgroundColor: "#ffffff", useCORS: true }).then(function (c) { if (i) doc.addPage(); doc.addImage(c.toDataURL("image/jpeg", 0.92), "JPEG", 0, 0, 210, 297); });
        });
      }, Promise.resolve()).then(function () { return doc; });
    }).then(function (doc) {
      var name = (data.p.name + "_중증장애인인턴제_출퇴근기록부_" + (m === "all" ? "전체" : m)).replace(/[\\/:*?"<>|]/g, "_") + ".pdf";
      var dataUrl = doc.output("datauristring").replace(/^data:[^,]*,/, "data:application/pdf;base64,");
      say("드라이브에 넣는 중…");
      var send = function () {
        return fetch(ep, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({ key: CONFIG.apiKey || "", type: "pdf", action: "save", materialId: "intern-" + id + "-" + m, name: name, folder: "중증장애인턴제", dataUrl: dataUrl }) })
          .then(function (r) { return r.json(); }).then(function (j) { if (!j || !j.ok) throw new Error((j && j.error) || "저장 실패"); return j; });
      };
      return send().catch(function () { return new Promise(function (r) { setTimeout(r, 2500); }).then(send); }).then(function (j) {
        say("드라이브에 저장했어요 · 같은 달 예전 파일은 휴지통으로");
        if (j.url) window.open(j.url, "_blank", "noopener");
      });
    }).catch(function (e) { console.warn(e); say("드라이브 저장을 못 했어요 · ‘인쇄 / PDF 저장’으로 내려받아 주세요"); })
      .then(function () { btn.disabled = false; });
  };
})();
