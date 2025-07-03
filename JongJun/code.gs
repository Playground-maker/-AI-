// Code.gs

/**
 * 웹 앱을 초기 로드하거나 특정 페이지를 로드할 때 실행되는 함수.
 * URL 파라미터 'page'에 따라 다른 HTML 파일을 보여줍니다.
 * 예: WebAppURL?page=TimelinePage
 */
function doGet(e) {
  // 기본적으로 'Index' 페이지를 로드합니다.
  let pageName = 'Index';

  // URL 파라미터 'page'가 있으면 해당 페이지를 로드합니다.
  if (e && e.parameter && e.parameter.page) {
    const requestedPage = e.parameter.page;
    const validPages = ['TimelinePage', 'PersonaPage', 'Index']; // 유효한 HTML 파일 목록
    if (validPages.includes(requestedPage)) {
      pageName = requestedPage;
    }
  }

  return HtmlService.createTemplateFromFile(pageName)
      .evaluate()
      .setTitle('현대해상 기획 도우미');
}

/**
 * HtmlService.createTemplateFromFile()에서 사용할 수 있는 include 함수.
 * HTML 템플릿에 다른 HTML 파일의 내용을 포함시킬 때 사용합니다.
 * 이 함수는 HtmlServiceUtils.gs 파일로 분리할 수도 있습니다.
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename)
      .getContent();
}


// --- 아래 generateTimeline 및 generatePersona 함수는 이전과 동일 ---

/**
 * 타임라인 생성을 위한 AI 호출 함수
 * @param {Object} formData 사용자 입력 데이터
 * @return {string} AI가 생성한 타임라인 HTML
 */
function generateTimeline(formData) {
  const apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`;

  const prompt = `
    현대해상 내부 기획 도우미 봇입니다. 아래 프로젝트 정보를 바탕으로 프로젝트 타임라인을 상세하게 생성해주세요.
    각 단계는 최소 2~3개의 세부 활동을 포함해야 하며, 모든 응답은 한글로 해주세요.
    응답 형식은 HTML div 태그 안의 h3 제목과 ul li 목록 형태여야 합니다.
    각 타임라인 항목은 <div class="timeline-item"></div>으로 감싸주세요.
    추가적인 설명 없이 오직 HTML 코드만 출력하세요. (예: "다음은 ~입니다" 같은 문장, 코드블록 마크다운 제외)

    ---
    프로젝트명: ${formData.projectName}
    프로젝트 유형: ${formData.projectType}
    예상 기간: ${formData.expectedDuration}
    팀 규모: ${formData.teamSize}
    우선 순위: ${formData.priority}
    주요 요구사항 및 기능: ${formData.requirements}
    제약 사항 및 특이사항: ${formData.constraints}
    ---

    예시 형식:
    <div class="timeline-item">
      <h3>1. 프로젝트 기획 및 범위 정의</h3>
      <ul>
        <li>프로젝트 목표 및 범위 설정</li>
        <li>요구사항 상세 분석 및 정의</li>
        <li>주요 이해관계자 식별 및 협의</li>
      </ul>
    </div>
    <div class="timeline-item">
      <h3>2. 시스템 설계</h3>
      <ul>
        <li>아키텍처 설계</li>
        <li>데이터베이스 모델링</li>
        <li>UI/UX 설계</li>
      </ul>
    </div>
  `;

  const requestBody = {
    contents: [{
      parts: [{
        text: prompt
      }]
    }]
  };

  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(requestBody),
    muteHttpExceptions: true
  };

  try {
    const response = UrlFetchApp.fetch(endpoint, options);
    const jsonResponse = JSON.parse(response.getContentText());

    if (jsonResponse.candidates && jsonResponse.candidates[0] && jsonResponse.candidates[0].content && jsonResponse.candidates[0].content.parts) {
      const generatedText = jsonResponse.candidates[0].content.parts[0].text;
      const htmlContent = generatedText.replace(/```html\n|\n```/g, '').trim();
      return `<div class="title">프로젝트 타임라인: ${formData.projectName}</div><div class="description">AI가 생성한 프로젝트 타임라인입니다.</div>${htmlContent}`;
    } else if (jsonResponse.error) {
      console.error('Gemini API 오류:', jsonResponse.error);
      throw new Error(`API 응답 오류: ${jsonResponse.error.message || '알 수 없는 오류'}`);
    } else {
      console.error('Gemini API 응답 형식 오류:', jsonResponse);
      throw new Error('AI 응답을 처리할 수 없습니다. 형식을 확인해주세요.');
    }
  } catch (e) {
    console.error('API 호출 중 오류 발생:', e);
    throw new Error('AI 타임라인 생성에 실패했습니다: ' + e.message);
  }
}

/**
 * 페르소나 생성을 위한 AI 호출 함수
 * @param {Object} formData 사용자 입력 데이터
 * @return {string} AI가 생성한 페르소나 HTML
 */
function generatePersona(formData) {
  const apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`;

  const prompt = `
    현대해상 내부 기획 도우미 봇입니다. 아래 프로젝트 정보를 바탕으로 타겟 고객의 페르소나를 상세하게 생성해주세요.
    모든 응답은 한글로 해주세요. 응답 형식은 HTML div 태그 안의 h3 제목과 p 태그, ul li 목록 형태여야 합니다.
    각 페르소나 섹션은 <div class="persona-section"></div>으로 감싸주세요.
    추가적인 설명 없이 오직 HTML 코드만 출력하세요. (예: "다음은 ~입니다" 같은 문장, 코드블록 마크다운 제외)

    ---
    프로젝트명: ${formData.projectName}
    프로젝트 유형: ${formData.projectType}
    주요 기능/요구사항: ${formData.mainFeatures}
    원하는 타겟 시장/고객: ${formData.targetMarket}
    기타 참고사항: ${formData.otherNotes}
    ---

    예시 형식:
    <div class="persona-name">페르소나 이름: 스마트 라이프 추구자 김현대</div>
    <div class="persona-section">
      <h3>개요</h3>
      <p>30대 초반의 직장인 김현대 씨는 건강과 효율성을 중시하며...</p>
    </div>
    <div class="persona-section">
      <h3>인구통계학적 정보</h3>
      <ul>
        <li>나이: 32세</li>
        <li>직업: IT 스타트업 개발자</li>
        <li>거주지: 서울 마포구 (1인 가구)</li>
      </ul>
    </div>
  `;

  const requestBody = {
    contents: [{
      parts: [{
        text: prompt
      }]
    }]
  };

  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(requestBody),
    muteHttpExceptions: true
  };

  try {
    const response = UrlFetchApp.fetch(endpoint, options);
    const jsonResponse = JSON.parse(response.getContentText());

    if (jsonResponse.candidates && jsonResponse.candidates[0] && jsonResponse.candidates[0].content && jsonResponse.candidates[0].content.parts) {
      const generatedText = jsonResponse.candidates[0].content.parts[0].text;
      const htmlContent = generatedText.replace(/```html\n|\n```/g, '').trim();
      return `<div class="title">페르소나: ${formData.projectName}</div><div class="description">AI가 생성한 페르소나입니다.</div>${htmlContent}`;
    } else if (jsonResponse.error) {
      console.error('Gemini API 오류:', jsonResponse.error);
      throw new Error(`API 응답 오류: ${jsonResponse.error.message || '알 수 없는 오류'}`);
    } else {
      console.error('Gemini API 응답 형식 오류:', jsonResponse);
      throw new Error('AI 응답을 처리할 수 없습니다. 형식을 확인해주세요.');
    }
  } catch (e) {
    console.error('API 호출 중 오류 발생:', e);
    throw new Error('AI 페르소나 생성에 실패했습니다: ' + e.message);
  }
}