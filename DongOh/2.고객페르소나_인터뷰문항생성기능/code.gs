function doGet(e) {
  return HtmlService.createTemplateFromFile('index').evaluate()
    .setTitle('고객 페르소나 & 인터뷰 문항 추천')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function generatePersonaAndQuestions(projectData) {
  try {
    // 프롬프트 생성
    const prompt = createPersonaPrompt(projectData);

    // 포텐스닷 AI API 호출
    const aiResponse = callPotensAI(prompt);

    // 결과 파싱
    const parsed = parsePersonaResponse(aiResponse);

    return parsed;

  } catch (error) {
    console.error('Error generating persona/questions:', error);
    throw new Error('추천 생성 중 오류가 발생했습니다: ' + error.message);
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

function callPotensAI(prompt) {
  const apiUrl = 'https://ai.potens.ai/api/chat';
  const apiKey = '1zMPFImaBe78W5aEC9MlVSvj1bzZFoei';

  const payload = {
    prompt: prompt,
    max_tokens: 2500
  };

  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(apiUrl, options);
  const responseText = response.getContentText();
  const responseCode = response.getResponseCode();

  if (responseCode !== 200) {
    throw new Error(`API 호출 실패: ${responseCode} - ${responseText}`);
  }

  // API 응답 구조에 따라 적절한 필드에서 텍스트 추출
  try {
    const responseData = JSON.parse(responseText);
    if (responseData.choices && responseData.choices.length > 0 && responseData.choices[0].text) {
      return responseData.choices[0].text;
    }
    if (responseData.response) return responseData.response;
    if (responseData.message) return responseData.message;
    if (responseData.content) return responseData.content;
    if (responseData.result && responseData.result.content) return responseData.result.content;

    // 다른 가능한 응답 구조가 없으면 전체 응답 반환
    return responseText;
  } catch (e) {
    console.error('API 응답 파싱 오류:', e);
    return responseText;
  }
}

function parsePersonaResponse(aiResponse) {
  try {
    // "페르소나 1:" 기준으로 분리
    const personaBlocks = aiResponse.split(/페르소나\s*1\s*[:：]/i);

    if (personaBlocks.length < 2) {
      // 파싱 실패 시 원문 반환
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
        // 번호 + 질문 형태로 되어있을 경우
        questions = rawQuestions
          .split(/(?:\d+\.|\n-|\n\*|\n•)/g) // 번호나 불릿으로 분리
          .map(q => q.trim())
          .filter(q => q.length > 2); // 공백이나 너무 짧은 문자열 제거
      }

      // 질문이 5개 미만이라면, 줄바꿈으로 분리 시도
      if (questions.length < 3 && parts.length > 1) {
        questions = parts[1].trim().split('\n')
          .map(q => q.trim())
          .filter(q => q.length > 5);
      }

      return {
        title: title,
        description: description,
        questions: questions.slice(0, 8) // 너무 많은 문항이 나오면 최대 8개로 제한
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
