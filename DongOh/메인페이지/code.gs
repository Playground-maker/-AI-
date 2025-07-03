function doGet(e) {
  return HtmlService.createTemplateFromFile('index').evaluate()
    .setTitle('AI 업무 도구 모음')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// 각 기능의 URL 정보를 반환하는 함수
function getAppUrls() {
  return {
    timeline: '타임라인 GAS 최종 배포 url 올리기',
    feature2: '고객페르소나_문항추천 최종 배포 url 올리기'
  };
}
