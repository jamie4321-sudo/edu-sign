// 카톡 링크 미리보기 — 서명 전용 링크(/sign?s=<세션id>)는 미리보기 제목을 그 서명 이름으로 바꿈
// (sign.html 은 모든 서명이 같이 쓰는 페이지라, 크롤러가 읽는 OG 태그를 여기서 고쳐 내보냄)
const PREVIEW = {
  // 촬영 및 초상권 활용 동의서 — 오티즘 레이스 in 판교
  "c37c0fcf-4135-4bcc-815e-d621df9f489b": {
    title: "오티즘 레이스 서명",
    desc: "연결의 시작 · 촬영 및 초상권 활용 동의서"
  }
};

export async function onRequest(context) {
  const res = await context.next();
  const url = new URL(context.request.url);
  const p = PREVIEW[url.searchParams.get("s") || ""];
  if (!p || !(res.headers.get("content-type") || "").includes("text/html")) return res;
  const set = (v) => ({ element(el) { el.setAttribute("content", v); } });
  return new HTMLRewriter()
    .on('meta[property="og:title"]', set(p.title))
    .on('meta[property="og:description"]', set(p.desc))
    .on('meta[property="og:url"]', set(url.origin + url.pathname + url.search))
    .on("title", { element(el) { el.setInnerContent(p.title); } })
    .transform(res);
}
