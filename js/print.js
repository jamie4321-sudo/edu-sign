(function () {
  "use strict";

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }

  var qs = new URLSearchParams(location.search);
  // ?id=<세션>  또는  ?ids=<세션,세션,…> (여러 교육을 한 파일로) · &photos=0 이면 교육 사진 빼기
  var ids = (qs.get("ids") || qs.get("id") || "").split(",").map(function (x) { return x.trim(); }).filter(Boolean);
  var withPhotos = qs.get("photos") !== "0";
  var loaded = null;
  document.getElementById("backBtn").addEventListener("click", function () {
    location.href = ids.length === 1 ? "index.html#/sign/" + encodeURIComponent(ids[0]) : "index.html#/sign";
  });
  document.getElementById("printBtn").addEventListener("click", function () { window.print(); });
  var photoToggle = document.getElementById("photoToggle");
  if (photoToggle) {
    photoToggle.checked = withPhotos;
    photoToggle.addEventListener("change", function () {
      withPhotos = photoToggle.checked;
      try { var u = new URL(location.href); u.searchParams.set("photos", withPhotos ? "1" : "0"); history.replaceState(null, "", u); } catch (e) {}
      if (loaded) paint(loaded);
    });
  }

  if (!ids.length) { document.getElementById("sheets").innerHTML = '<div style="padding:40px;text-align:center;color:#888">잘못된 접근입니다</div>'; return; }

  Promise.all(ids.map(function (sid) {
    return Promise.all([Store.getSession(sid), Store.listPhotos(sid).catch(function () { return []; })])
      .then(function (arr) { return arr[0] && arr[0].session ? { session: arr[0].session, roster: arr[0].roster || [], photos: (arr[1] || []).slice().reverse() } : null; });
  })).then(function (list) {
    loaded = list.filter(Boolean).sort(function (a, b) { return a.session.date < b.session.date ? -1 : a.session.date > b.session.date ? 1 : 0; });
    if (!loaded.length) { document.getElementById("sheets").innerHTML = '<div style="padding:40px;text-align:center;color:#888">세션을 찾을 수 없습니다</div>'; return; }
    paint(loaded);
  });

  function paint(list) {
    var out = [];
    list.forEach(function (d) {
      if (window.Consent && Consent.isConsent(d.session)) out.push(consentHtml(d.session, d.roster));
      else out.push(reportHtml(d.session, d.roster, withPhotos ? d.photos : []));
    });
    document.getElementById("sheets").innerHTML = out.join("");
    var first = list[0].session, last = list[list.length - 1].session;
    document.title = list.length === 1
      ? (first.date + " " + (first.title || first.category || "교육") + " 서명 리포트")
      : (first.date.slice(0, 7) + "~" + last.date.slice(0, 7) + " 교육 서명 리포트 (" + list.length + "건)");
  }

  function chunk(arr, size) {
    var out = [];
    for (var i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
  }

  /* 동의서: 1쪽 본문 + 다음 쪽부터 성명/서명/확인 칸 표 (원본 hwpx: 4칸 균등, 한 쪽 21명) */
  function consentHtml(session, roster) {
    var doc = Consent.doc, cols = Consent.cols(session);
    var body = '<div class="sheet consent">' + Consent.docHtml(session) + '</div>';
    var head = '<tr><th>성명</th><th>' + esc(doc.sigLabel) + '</th>' + cols.map(function (c) {
      return '<th>' + esc(c.label) + (c.sub ? '<br>' + esc(c.sub) : "") + '</th>';
    }).join("") + '</tr>';
    var pages = chunk(roster, 21);
    if (!pages.length) pages = [[]];
    var tables = pages.map(function (page) {
      var rows = page.map(function (r) {
        var x = r.extra || {};
        return '<tr><td class="c-name">' + esc(Consent.printName(r)) + '</td>'
          + '<td class="c-sig">' + (r.signature ? '<img src="' + r.signature + '" alt="서명" />' : (Consent.isRefused(r) ? '<span class="cs-refused">미동의</span>' : "")) + '</td>'
          + cols.map(function (c) { return '<td>' + esc(x[c.key] || "") + '</td>'; }).join("") + '</tr>';
      }).join("");
      return '<div class="sheet consent"><table class="cs-table"><thead>' + head + '</thead><tbody>' + rows + '</tbody></table></div>';
    }).join("");
    return body + tables;
  }

  /* ---------- A안 · 에디토리얼 리포트 (채용 키트 시트 톤) ----------
     1쪽: 큰 월 숫자 · 주제 · 요약 4칸 · 교육 사진(작게, 한 줄에 3장) · 서명 표 시작
     다음 쪽: 서명 표 이어서. 표는 쪽마다 왼쪽 단 → 오른쪽 단 순서 */
  var DOW = "일월화수목금토";
  var PART_ORDER = ["가든", "스낵", "총무지원"];
  function dow(d) { var x = new Date(String(d) + "T00:00:00"); return isNaN(x) ? "" : DOW[x.getDay()]; }
  function shortName(n) { return String(n || "").split("(")[0]; }

  function reportHtml(session, roster, photos) {
    roster.forEach(function (r, i) { r.__no = i + 1; });
    var total = roster.length;
    var signed = roster.filter(function (r) { return !!r.signature; }).length;
    var rate = total ? Math.round(signed / total * 100) : 0;
    var mm = (session.date || "").slice(5, 7) || "··";
    var title = session.title || session.category || "교육";
    var topic = title.indexOf(" - ") > -1 ? title.split(" - ").slice(1).join(" - ") : title;
    var kind = /월간\s*안전/.test(title) ? "월간 안전교육 리포트" : "교육 서명 리포트";
    var depts = [];
    roster.forEach(function (r) { if (r.dept && depts.indexOf(r.dept) < 0) depts.push(r.dept); });
    depts.sort(function (a, b) { var x = PART_ORDER.indexOf(a), y = PART_ORDER.indexOf(b); return (x < 0 ? 9 : x) - (y < 0 ? 9 : y); });
    var meta = [session.date + (dow(session.date) ? " (" + dow(session.date) + ")" : ""), session.category, depts.join(" · ")].filter(Boolean).map(esc).join(" · ");

    var ph = photos || [];
    var photoRows = Math.ceil(ph.length / 3);
    // 1쪽에 들어가는 줄 수: 사진 한 줄마다 약 7줄 덜 들어감
    var cap1 = Math.max(6, 25 - photoRows * 7), capN = 31;
    var chunks = [], i = 0, first = true;
    while (i < roster.length || first) {
      var n = (first ? cap1 : capN) * 2;
      chunks.push(roster.slice(i, i + n)); i += n; first = false;
    }
    var pages = chunks.length;

    function cell(r) {
      if (!r) return "<td></td><td></td><td></td><td></td>";
      return '<td class="n">' + r.__no + "</td><td>" + esc(r.dept || "") + "</td><td><b>" + esc(shortName(r.name)) + "</b></td>"
        + '<td class="sig">' + (r.signature ? '<img src="' + r.signature + '" alt="서명" />' : '<span class="miss">미서명</span>') + "</td>";
    }
    function table(list) {
      var h = Math.ceil(list.length / 2), rows = "";
      for (var k = 0; k < h; k++) rows += "<tr>" + cell(list[k]) + '<td class="gap"></td>' + cell(list[k + h]) + "</tr>";
      return '<table class="rp-tbl"><colgroup><col class="c-no"><col class="c-dept"><col><col class="c-sig"><col class="gap"><col class="c-no"><col class="c-dept"><col><col class="c-sig"></colgroup>'
        + '<thead><tr><th>No</th><th>파트</th><th>이름</th><th>서명</th><th class="gap"></th><th>No</th><th>파트</th><th>이름</th><th>서명</th></tr></thead>'
        + "<tbody>" + rows + "</tbody></table>";
    }
    function foot(n) { return '<div class="rp-foot"><span>SNACK &amp; GARDEN · 주식회사 링키지랩 · ' + esc(title) + "</span><span>" + n + " / " + pages + "</span></div>"; }

    var head = '<div class="rp-lbl">SNACK &amp; GARDEN · ' + kind + "</div>"
      + '<div class="rp-hero"><div class="rp-mm">' + esc(mm) + "</div><div><h1>" + esc(topic) + "</h1><p>" + meta + "</p></div></div>"
      + '<div class="rp-stats"><div class="st"><small>대상</small><b>' + total + '</b></div><div class="st"><small>서명</small><b>' + signed + "</b></div>"
      + '<div class="st"><small>미서명</small><b>' + (total - signed) + '</b></div><div class="st hl"><small>서명률</small><b>' + rate + "%</b></div></div>"
      + (ph.length ? '<div class="rp-phs">' + ph.map(function (p) { return '<figure><img src="' + esc(p.url) + '" alt="교육 사진" /></figure>'; }).join("") + "</div>"
          + '<div class="rp-cap"><span>교육 현장 사진 ' + ph.length + "장</span><span>" + esc(session.date || "") + "</span></div>" : "");
    function secHead(cont) {
      return '<div class="rp-h2"><h2>참석자 서명' + (cont ? " <small>(이어서)</small>" : "") + "</h2><span>" + esc(String(+mm || mm)) + "월 · " + signed + " / " + total + "명</span></div>";
    }
    return chunks.map(function (list, pi) {
      return '<div class="sheet rp">' + (pi === 0 ? head : "") + secHead(pi > 0)
        + (list.length ? table(list) : '<p class="rp-empty">등록된 명단이 없습니다.</p>') + foot(pi + 1) + "</div>";
    }).join("");
  }
})();
