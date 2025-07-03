function doGet(e) {
  const page = e.parameter.page || 'main';

  switch(page) {
    case 'timeline':
      return HtmlService.createTemplateFromFile('index').evaluate()
        .setTitle('프로젝트 일정 관리')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    default:
      return HtmlService.createTemplateFromFile('index').evaluate()
        .setTitle('프로젝트 일정 관리')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function generateProjectTimeline(projectData) {
  try {
    // 프로젝트 정보를 기반으로 AI 프롬프트 생성
    const prompt = createPrompt(projectData);

    // 제미나이 API 호출
    const aiResponse = callGeminiAI(prompt);

    // AI 응답을 파싱하여 타임라인 구조로 변환
    const timeline = parseTimelineResponse(aiResponse);

    return timeline;

  } catch (error) {
    console.error('Error generating timeline:', error);
    throw new Error('타임라인 생성 중 오류가 발생했습니다: ' + error.message);
  }
}

function createPrompt(projectData) {
  const prompt = `
다음 프로젝트 정보를 바탕으로 구체적이고 실무적인 프로젝트 일정을 주차별로 작성해주세요.

**프로젝트 정보:**
- 프로젝트명: ${projectData.projectName}
- 프로젝트 유형: ${projectData.projectType}
- 예상 기간: ${projectData.duration}주
- 팀 규모: ${projectData.teamSize}
- 우선순위: ${projectData.priority}
- 주요 요구사항: ${projectData.requirements}
- 제약사항: ${projectData.constraints || '없음'}

**요청사항:**
1. ${projectData.duration}주 동안의 주차별 상세 일정을 작성해주세요
2. 각 주차별로 구체적인 작업 내용과 목표를 제시해주세요
3. 팀 규모와 우선순위를 고려한 현실적인 일정을 제안해주세요
4. 위험 요소와 대응 방안도 포함해주세요

**응답 형식:** (반드시 이 형식을 따라주세요)
주차: 1주차
제목: [작업 제목]
내용: [구체적인 작업 내용과 목표, 산출물]

주차: 2주차
제목: [작업 제목]
내용: [구체적인 작업 내용과 목표, 산출물]

이런 식으로 ${projectData.duration}주차까지 작성해주세요.
`;

  return prompt;
}

function callGeminiAI(prompt) {
  const apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
  const apiKey = '---------------------------------'; // 실제 API 키로 교체 필요

  const payload = {
    contents: [{
      parts: [{
        text: prompt
      }]
    }]
  };

  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-goog-api-key': apiKey
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  try {
    const response = UrlFetchApp.fetch(apiUrl, options);
    const responseCode = response.getResponseCode();

    if (responseCode !== 200) {
      throw new Error(`API 호출 실패: ${responseCode}, ${response.getContentText()}`);
    }

    const responseText = response.getContentText();
    const responseData = JSON.parse(responseText);

    // Gemini API 응답 구조에서 텍스트 추출
    if (responseData.candidates &&
        responseData.candidates[0] &&
        responseData.candidates[0].content &&
        responseData.candidates[0].content.parts) {
      return responseData.candidates[0].content.parts[0].text;
    } else {
      console.error('예상치 못한 API 응답 형식:', JSON.stringify(responseData));
      throw new Error('API 응답 형식이 예상과 다릅니다.');
    }

  } catch (error) {
    console.error('API 호출 오류:', error);
    throw new Error('Gemini API 호출 중 오류가 발생했습니다: ' + error.message);
  }
}

function parseTimelineResponse(aiResponse) {
  try {
    const timeline = [];

    // AI 응답을 줄 단위로 분할
    const lines = aiResponse.split('\n');
    let currentItem = {};

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (line.startsWith('주차:')) {
        // 이전 아이템이 있으면 배열에 추가
        if (currentItem.period) {
          timeline.push(currentItem);
        }

        // 새로운 아이템 시작
        currentItem = {
          period: line.replace('주차:', '').trim(),
          title: '',
          description: ''
        };
      } else if (line.startsWith('제목:')) {
        currentItem.title = line.replace('제목:', '').trim();
      } else if (line.startsWith('내용:')) {
        currentItem.description = line.replace('내용:', '').trim();
      } else if (line && currentItem.period && line.length > 0) {
        // 추가 설명이 있는 경우
        if (currentItem.description) {
          currentItem.description += ' ' + line;
        }
      }
    }

    // 마지막 아이템 추가
    if (currentItem.period) {
      timeline.push(currentItem);
    }

    // 파싱이 제대로 되지 않은 경우 대체 파싱 시도
    if (timeline.length === 0) {
      return parseAlternativeFormat(aiResponse);
    }

    return timeline;

  } catch (error) {
    console.error('타임라인 파싱 오류:', error);
    // 파싱 실패 시 기본 구조로 반환
    return createDefaultTimeline(aiResponse);
  }
}

function parseAlternativeFormat(aiResponse) {
  const timeline = [];
  const sections = aiResponse.split(/\d+주차/);

  for (let i = 1; i < sections.length; i++) {
    const section = sections[i].trim();
    const lines = section.split('\n').filter(line => line.trim());

    if (lines.length > 0) {
      timeline.push({
        period: `${i}주차`,
        title: lines[0] || `${i}주차 작업`,
        description: lines.slice(1).join(' ') || '상세 내용을 확인해주세요.'
      });
    }
  }

  return timeline;
}

function createDefaultTimeline(aiResponse) {
  // AI 응답을 그대로 보여주는 기본 타임라인 생성
  const paragraphs = aiResponse.split('\n\n');
  const timeline = [];

  paragraphs.forEach((paragraph, index) => {
    if (paragraph.trim()) {
      timeline.push({
        period: `${index + 1}단계`,
        title: `프로젝트 진행 단계 ${index + 1}`,
        description: paragraph.trim()
      });
    }
  });

  return timeline;
}

// 테스트용 함수
function testAPI() {
  const testData = {
    projectName: '테스트 프로젝트',
    projectType: '웹 개발',
    duration: '8',
    teamSize: '4-7명',
    priority: '보통',
    requirements: '사용자 관리, 데이터 처리',
    constraints: '예산 제한'
  };

  try {
    const result = generateProjectTimeline(testData);
    console.log('테스트 결과:', result);
    return result;
  } catch (error) {
    console.error('테스트 오류:', error);
    return error.message;
  }
}
