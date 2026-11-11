// 카톡 링크 미리보기 — 서명 전용 링크(/sign?s=<세션id>)는 미리보기 제목을 그 서명 이름으로 바꿈
// (sign.html 은 모든 서명이 같이 쓰는 페이지라, 크롤러가 읽는 OG 태그를 여기서 고쳐 내보냄)
const PREVIEW = {
  // 촬영 및 초상권 활용 동의서 — 오티즘 레이스 in 판교
  "c37c0fcf-4135-4bcc-815e-d621df9f489b": {
    title: "오티즘 레이스 서명",
    desc: "연결의 시작 · 촬영 및 초상권 활용 동의서"
  },
  // 2026 법정의무교육 — 교육을 마친 뒤 완료 서명 (legal.js YEARS.signs)
  "idmwbemuoqqncb": {
    title: "2026 법정의무교육 체크",
    desc: "연결의 시작 · 들은 교육을 하나씩 체크해 주세요"
  }
};

export async function onRequest(context) {
  const res = await context.next();
  const url = new URL(context.request.url);
  // 중증장애인턴제 출석 전용 링크 (/sign?intern=<인턴 id>)
  const p = url.searchParams.get("intern") ? { title: "중증장애인턴제 출석", desc: "연결의 시작 · 오늘 출석하고 서명해요" } : PREVIEW[url.searchParams.get("s") || ""];
  if (!p || !(res.headers.get("content-type") || "").includes("text/html")) return res;
  const set = (v) => ({ element(el) { el.setAttribute("content", v); } });
  return new HTMLRewriter()
    .on('meta[property="og:title"]', set(p.title))
    .on('meta[property="og:description"]', set(p.desc))
    .on('meta[property="og:url"]', set(url.origin + url.pathname + url.search))
    .on("title", { element(el) { el.setInnerContent(p.title); } })
    .transform(res);
}
