/* 사진 줄이기 — 관리자 화면(교육 사진 · 교육 자료)에서 같이 쓴다 */
(function () {
  "use strict";
  /* ---------------- 사진 줄이기 ----------------
     교육 사진은 긴 쪽 1600px · JPEG 82% 로 줄여서 올린다 (폰 원본 3~8MB → 약 0.3MB).
     Supabase 무료 저장 공간(1GB, 게임즈 가든과 같이 씀)을 오래 쓰기 위함.
     이미 작은 사진은 그대로, 브라우저가 못 여는 형식(일부 HEIC 등)은 원본 그대로 올린다. */
  var PHOTO_MAX = 1600, PHOTO_Q = 0.82;
  function readAsDataUrl_(file) {
    return new Promise(function (res, rej) { var r = new FileReader(); r.onload = function () { res(r.result); }; r.onerror = rej; r.readAsDataURL(file); });
  }
  function shrinkPhoto(file) {
    var original = function () { return readAsDataUrl_(file).then(function (d) { return { dataUrl: d, name: file.name, size: file.size }; }); };
    return new Promise(function (res) {
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () {
        var w = img.naturalWidth, h = img.naturalHeight, k = Math.min(1, PHOTO_MAX / Math.max(w, h));
        if (k === 1 && file.size < 500 * 1024) { URL.revokeObjectURL(url); res(original()); return; }
        var c = document.createElement("canvas"); c.width = Math.round(w * k); c.height = Math.round(h * k);
        var g = c.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        var d = c.toDataURL("image/jpeg", PHOTO_Q), size = Math.round((d.length - d.indexOf(",") - 1) * 3 / 4);
        if (size >= file.size) { res(original()); return; }
        res({ dataUrl: d, name: String(file.name || "photo").replace(/\.[^.]+$/, "") + ".jpg", size: size });
      };
      img.onerror = function () { URL.revokeObjectURL(url); res(original()); };
      img.src = url;
    });
  }
  window.shrinkPhoto = shrinkPhoto;
})();
