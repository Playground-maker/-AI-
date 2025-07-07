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
  let aiResponse = '';
  let timeline = [];

  try {
    console.log('프로젝트 데이터:', JSON.stringify(projectData));

    // 프로젝트 정보를 기반으로 AI 프롬프트 생성
    const prompt = createPrompt(projectData);
    console.log('프롬프트 생성 완료');

    // 제미나이 API 호출
    aiResponse = callGeminiAI(prompt);
    console.log('AI 응답 받음');

    // AI 응답을 파싱하여 타임라인 구조로 변환
    timeline = parseTimelineResponse(aiResponse);
    console.log('타임라인 파싱 완료');

  } catch (error) {
    console.error('타임라인 생성 오류:', error);
    throw new Error('타임라인 생성 중 오류가 발생했습니다: ' + error.message);
  }

  // 스프레드시트 저장은 별도로 처리 (실패해도 타임라인은 반환)
  try {
    console.log('스프레드시트 저장 시작');
    saveToSpreadsheet(projectData, aiResponse);
    console.log('스프레드시트 저장 완료');
  } catch (saveError) {
    console.error('스프레드시트 저장 실패:', saveError);
    // 저장 실패해도 타임라인은 정상 반환
  }

  return timeline;
}

function saveToSpreadsheet(projectData, aiResponse) {
  try {
    // 스프레드시트 URL에서 ID 추출
    const spreadsheetUrl = 'https://docs.google.com/spreadsheets/d/1ra1J-------------....'; // 스프레드 시트 주소 넣기
    const spreadsheetId = '1ra1JCj------------....'; // 본인 스프레드시트 ID.. 넣기

    console.log('스프레드시트 ID:', spreadsheetId);

    // 스프레드시트 열기
    const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    console.log('스프레드시트 열기 성공');

    // 첫 번째 시트 가져오기
    const sheet = spreadsheet.getSheets()[0];
    console.log('시트 이름:', sheet.getName());

    // 현재 데이터 행 수 확인
    const lastRow = sheet.getLastRow();
    console.log('현재 마지막 행:', lastRow);

    // 헤더가 없으면 추가
    if (lastRow === 0) {
      console.log('헤더 추가 중...');
      const headers = [
        '기록일시',
        '프로젝트명',
        '프로젝트유형',
        '예상기간',
        '팀규모',
        '우선순위',
        '주요요구사항',
        '제약사항',
        'AI응답'
      ];
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

      // 헤더 서식 지정
      const headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setBackground('#4CAF50');
      headerRange.setFontColor('white');
      headerRange.setFontWeight('bold');
    }

    // 현재 시간
    const now = new Date();
    const timestamp = Utilities.formatDate(now, 'Asia/Seoul', 'yyyy-MM-dd HH:mm:ss');

    // 새 데이터 행 추가
    const newRow = [
      timestamp,
      projectData.projectName || '',
      projectData.projectType || '',
      projectData.duration || '',
      projectData.teamSize || '',
      projectData.priority || '',
      projectData.requirements || '',
      projectData.constraints || '',
      aiResponse || ''
    ];

    console.log('새 행 데이터:', newRow);
    sheet.appendRow(newRow);
    console.log('데이터 추가 완료');

    return true;

  } catch (error) {
    console.error('스프레드시트 저장 상세 오류:', error);
    throw error;
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
  const apiKey = '-----------------'; // 본인 API key 넣기

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
    const lines = aiResponse.split('\n');
    let currentItem = {};

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (line.startsWith('주차:')) {
        if (currentItem.period) {
          timeline.push(currentItem);
        }
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
        if (currentItem.description) {
          currentItem.description += ' ' + line;
        }
      }
    }

    if (currentItem.period) {
      timeline.push(currentItem);
    }

    if (timeline.length === 0) {
      return parseAlternativeFormat(aiResponse);
    }

    return timeline;

  } catch (error) {
    console.error('타임라인 파싱 오류:', error);
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

// 테스트 함수들
function testSpreadsheetSave() {
  const testData = {
    projectName: '테스트 프로젝트',
    projectType: '웹 개발',
    duration: '4',
    teamSize: '3-5명',
    priority: '보통',
    requirements: '테스트 요구사항',
    constraints: '테스트 제약사항'
  };

  try {
    saveToSpreadsheet(testData, 'AI 테스트 응답입니다.');
    return '테스트 성공!';
  } catch (error) {
    return '테스트 실패: ' + error.message;
  }
}

function testSpreadsheetAccess() {
  try {
    const spreadsheetId = '1ra1JCjgB-hAkPsYiVo19YSukONObJUkTkEry0nmKHXA';
    const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    const sheets = spreadsheet.getSheets();
    return `접근 성공! 시트 개수: ${sheets.length}, 첫 번째 시트: ${sheets[0].getName()}`;
  } catch (error) {
    return `접근 실패: ${error.message}`;
  }
}
