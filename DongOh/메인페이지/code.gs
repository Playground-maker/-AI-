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
    timeline: 'https://script.google.com/macros/s/AKfycbwXrZEfhIZfhDYLLvgsLRlnyc5tLuhh1nDDy3aEMqNhGGKZU5lgfYkX5fAhEuwNSm5eyw/exec',
    feature2: 'https://script.google.com/macros/s/AKfycbyCynw34CcPKcKTW2WGXrt5FbDHpn1GBB8pknzFxJOKYfX1DGX0oh5SGuBM4ccKiOwp7g/exec'
  };
}
