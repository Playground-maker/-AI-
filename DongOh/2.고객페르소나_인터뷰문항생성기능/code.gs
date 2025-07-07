function doGet(e) {
  return HtmlService.createTemplateFromFile('index').evaluate()
    .setTitle('고객 페르소나 & 인터뷰 문항 추천')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function generatePersonaAndQuestions(projectData) {
  let aiResponse = '';
  let parsed = {};

  try {
    console.log('페르소나 생성 시작:', JSON.stringify(projectData));

    // 프롬프트 생성
    const prompt = createPersonaPrompt(projectData);
    console.log('프롬프트 생성 완료');

    // 제미나이 API 호출
    aiResponse = callGeminiAI(prompt);
    console.log('AI 응답 받음');

    // 결과 파싱
    parsed = parsePersonaResponse(aiResponse);
    console.log('페르소나 파싱 완료');

  } catch (error) {
    console.error('페르소나/인터뷰 생성 오류:', error);
    throw new Error('추천 생성 중 오류가 발생했습니다: ' + error.message);
  }

  // 스프레드시트 저장은 별도로 처리 (실패해도 결과는 반환)
  try {
    console.log('스프레드시트 저장 시작');
    savePersonaToSpreadsheet(projectData, aiResponse);
    console.log('스프레드시트 저장 완료');
  } catch (saveError) {
    console.error('스프레드시트 저장 실패:', saveError);
    // 저장 실패해도 페르소나 결과는 정상 반환
  }

  return parsed;
}

// 스프레드시트에 데이터를 저장하는 함수
function savePersonaToSpreadsheet(projectData, aiResponse) {
  try {
    // 고객 페르소나 전용 스프레드시트 ID
    const spreadsheetId = '1E6-----------...'; // 본인 스프레드 시트 ID로 바꿔주기

    // 스프레드시트와 시트 가져오기
    const spreadsheet = SpreadsheetApp.openById(spreadsheetId);

    // 첫 번째 시트 사용
    const sheet = spreadsheet.getSheets()[0];

    // 현재 데이터 행 수 확인
    const lastRow = sheet.getLastRow();
    console.log('페르소나 현재 마지막 행:', lastRow);

    // 헤더가 없으면 추가
    if (lastRow === 0) {
      console.log('페르소나 헤더 추가 중...');
      const headers = [
        '기록일시',
        '프로젝트명',
        '프로젝트유형',
        '주요기능요구사항',
        '타겟시장고객',
        '기타참고사항',
        'AI응답'
      ];
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

      // 헤더 서식 지정
      const headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setBackground('#4CAF50');
      headerRange.setFontColor('white');
      headerRange.setFontWeight('bold');

      // 열 너비 조정
      sheet.setColumnWidth(1, 180); // 기록일시
      sheet.setColumnWidth(2, 200); // 프로젝트명
      sheet.setColumnWidth(3, 150); // 프로젝트유형
      sheet.setColumnWidth(4, 300); // 주요기능요구사항
      sheet.setColumnWidth(5, 200); // 타겟시장고객
      sheet.setColumnWidth(6, 200); // 기타참고사항
      sheet.setColumnWidth(7, 500); // AI응답
    }

    // 현재 시간
    const now = new Date();
    const timestamp = Utilities.formatDate(now, 'Asia/Seoul', 'yyyy-MM-dd HH:mm:ss');

    // 새 데이터 행 추가
    const newRow = [
      timestamp,
      projectData.projectName || '',
      projectData.projectType || '',
      projectData.requirements || '',
      projectData.targetMarket || '미입력',
      projectData.etc || '없음',
      aiResponse || ''
    ];

    console.log('페르소나 새 행 데이터:', newRow);
    sheet.appendRow(newRow);
    console.log('페르소나 데이터 추가 완료');

    return true;

  } catch (error) {
    console.error('페르소나 스프레드시트 저장 상세 오류:', error);
    throw error;
  }
}

function createPersonaPrompt(projectData) {
  return `
아래 프로젝트 정보를 참고하여,
1) 추천 고객 페르소나 2개(각 페르소나의 특징, 니즈, 사용 맥락 포함)
2) 각 페르소나별로 고객 인터뷰 설문 문항 5개씩
를 표 형식 없이 명확하게 구분하여 제시해줘.

각 페르소나는 "페르소나 1:", "페르소나 2:"로 시작하고,
각 페르소나의 인터뷰 문항은 "인터뷰 문항:"으로 구분해줘.

[프로젝트 정보]
- 프로젝트명: ${projectData.projectName}
- 프로젝트 유형: ${projectData.projectType}
- 주요 기능/요구사항: ${projectData.requirements}
- 타겟 시장/고객: ${projectData.targetMarket || '미입력'}
- 기타 참고: ${projectData.etc || '없음'}
`;
}

function callGeminiAI(prompt) {
  const apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
  const apiKey = 'API 키 발급받아 넣기';

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

function parsePersonaResponse(aiResponse) {
  try {
    // "페르소나 1:" 기준으로 분리
    const personaBlocks = aiResponse.split(/페르소나\s*1\s*[:：]/i);

    if (personaBlocks.length < 2) {
      console.log('페르소나 1을 찾을 수 없습니다');
      return { personas: [], raw: aiResponse };
    }

    // "페르소나 2:" 기준으로 두번째 분리
    const secondSplit = personaBlocks[1].split(/페르소나\s*2\s*[:：]/i);
    const persona1Block = secondSplit[0].trim();
    const persona2Block = secondSplit.length > 1 ? secondSplit[1].trim() : '';

    if (!persona2Block) {
      console.log('페르소나 2를 찾을 수 없습니다');
    }

    // 페르소나 객체 생성 함수
    function createPersona(block, title) {
      // "인터뷰 문항:" 기준으로 분리
      const parts = block.split(/인터뷰\s*문항\s*[:：]/i);

      const description = parts[0].trim();
      let questions = [];

      if (parts.length > 1) {
        const rawQuestions = parts[1].trim();
        questions = rawQuestions
          .split(/(?:\d+\.|\n-|\n\*|\n•)/g)
          .map(q => q.trim())
          .filter(q => q.length > 2);
      }

      if (questions.length < 3 && parts.length > 1) {
        questions = parts[1].trim().split('\n')
          .map(q => q.trim())
          .filter(q => q.length > 5);
      }

      return {
        title: title,
        description: description,
        questions: questions.slice(0, 8)
      };
    }

    const persona1 = createPersona(persona1Block, '페르소나 1');
    const persona2 = createPersona(persona2Block, '페르소나 2');

    return {
      personas: [persona1, persona2],
      raw: aiResponse
    };
  } catch (error) {
    console.error('페르소나 파싱 오류:', error);
    return { personas: [], raw: aiResponse, error: error.toString() };
  }
}

// 테스트용 함수
function testPersonaAPI() {
  const testData = {
    projectName: '테스트 페르소나 프로젝트',
    projectType: '모바일 앱',
    requirements: '사용자 관리, 커뮤니티 기능',
    targetMarket: '20-30대',
    etc: '테스트 참고사항'
  };

  try {
    const result = generatePersonaAndQuestions(testData);
    console.log('페르소나 테스트 결과:', result);
    return result;
  } catch (error) {
    console.error('페르소나 테스트 오류:', error);
    return error.message;
  }
}
