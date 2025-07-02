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
    timeline: 'https://script.google.com/macros/s/AKfycbwfrKgMKEv0s1-jrE4GOlsxURv3bOeGBi994ADDHlx2X_gwN2XJKCMS9HV01pWJVF9vJg/exec',
    feature2: 'https://script.google.com/macros/s/AKfycbyR_IDcArj5NESGUEwdYdSxwwbLDiX655zoI9Ei1P1tm8IYj8X-yI5pLotx2f19AxJYkw/exec'
  };
}
