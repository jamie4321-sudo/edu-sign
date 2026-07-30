(function () {
  "use strict";

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }

  var qs = new URLSearchParams(location.search);
  var id = qs.get("id");
  document.getElementById("backBtn").addEventListener("click", function () { location.href = "index.html#/s/" + encodeURIComponent(id || ""); });
  document.getElementById("printBtn").addEventListener("click", function () { window.print(); });

  if (!id) { document.getElementById("sheets").innerHTML = '<div style="padding:40px;text-align:center;color:#888">잘못된 접근입니다</div>'; return; }

  Store.getSession(id).then(function (d) {
    if (!d || !d.session) { document.getElementById("sheets").innerHTML = '<div style="padding:40px;text-align:center;color:#888">세션을 찾을 수 없습니다</div>'; return; }
    render(d.session, d.roster || []);
  });

  function chunk(arr, size) {
    var out = [];
    for (var i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
  }

  function cell(r) {
    if (!r) return { seq: "", dept: "", name: "", sig: "" };
    var sig = r.signature ? '<img src="' + r.signature + '" alt="서명" />' : "";
    return { seq: r.seq, dept: esc(r.dept || ""), name: esc(r.name || ""), sig: sig };
  }

  function pairRows(left, right) {
    var n = Math.max(left.length, right.length);
    var rows = "";
    for (var i = 0; i < n; i++) {
      var L = cell(left[i]), R = cell(right[i]);
      rows += "<tr>"
        + "<td>" + L.seq + "</td><td>" + L.dept + "</td><td class=\"c-name\">" + L.name + "</td><td class=\"c-sig\">" + L.sig + "</td>"
        + "<td>" + R.seq + "</td><td>" + R.dept + "</td><td class=\"c-name\">" + R.name + "</td><td class=\"c-sig\">" + R.sig + "</td>"
        + "</tr>";
    }
    return rows;
  }

  function render(session, roster) {
    var pages = chunk(roster, 40);
    if (!pages.length) pages = [[]];
    document.getElementById("sheets").innerHTML = pages.map(function (page) {
      var half = Math.ceil(page.length / 2) || 20;
      var left = page.slice(0, half);
      var right = page.slice(half);
      return '<div class="sheet">'
        + '<h1 class="doc-title">교육참석자 명단</h1>'
        + '<div class="doc-meta"><b>교육일자</b> : ' + esc(session.date || "") + '<br><b>교육구분</b> : ' + esc(session.category || "") + '</div>'
        + '<table class="roster">'
        + '<colgroup><col class="c-seq"><col class="c-dept"><col class="c-name"><col class="c-sig"><col class="c-seq"><col class="c-dept"><col class="c-name"><col class="c-sig"></colgroup>'
        + '<thead><tr><th>연번</th><th>부서</th><th>성명</th><th>서명</th><th>연번</th><th>부서</th><th>성명</th><th>서명</th></tr></thead>'
        + '<tbody>' + pairRows(left, right) + '</tbody>'
        + '</table></div>';
    }).join("");
  }
})();
