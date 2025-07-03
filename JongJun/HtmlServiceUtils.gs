// HtmlServiceUtils.gs

/**
 * HtmlService.createTemplateFromFile()에서 사용할 수 있는 include 함수.
 * HTML 템플릿에 다른 HTML 파일의 내용을 포함시킬 때 사용합니다.
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename)
      .getContent();
}