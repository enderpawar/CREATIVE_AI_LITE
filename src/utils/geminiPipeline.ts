// Gemini API를 사용하여 Python 코드 생성

const getApiKey = (): string | null => {
    const envKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (envKey) return envKey;
    return localStorage.getItem('gemini_api_key');
};

export interface NodeGuide {
    step: number;
    nodeType: string;
    nodeName: string;
    description: string;
    reason?: string; // 이 노드를 왜 사용하는지 설명
    settings?: Record<string, any>;
    connections?: {
        from?: { step: number; output: string; input: string }[];
        to?: { step: number; output: string; input: string }[];
    };
}

export interface CodeGenerationResult {
    code: string;
    nodeGuide: NodeGuide[];
}

/**
 * Gemini API를 사용하여 사용자 프롬프트로부터 Python 코드와 노드 배치 가이드를 생성합니다.
 */
export async function generatePythonCode(userPrompt: string): Promise<CodeGenerationResult> {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error('API 키가 설정되지 않았습니다.');

    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    
    const systemPrompt = `Parse free-form ML description and generate pipeline JSON.

USER INPUT (free-form Korean text):
${userPrompt}

Your task:
1. Extract: CSV file, columns, target, task type (classification/regression/clustering)
2. Generate ML pipeline JSON with Korean descriptions (brief)

OUTPUT JSON:
\`\`\`json
{"code":"Python code","nodeGuide":[{"step":1,"nodeType":"dataLoader","nodeName":"Name (한글)","description":"간단설명","reason":"이유","settings":{},"connections":{"from":[],"to":[{"step":2,"output":"data","input":"data"}]}}]}
\`\`\`

NODES: dataLoader→data, dataSplit:data→train/test, scaler:data→data, classifier/regressor:train→model, predict:model+test→prediction, evaluate:prediction+test→metrics

SOCKETS: data,train,test,model,prediction,metrics (English only)

EXAMPLE INPUT:
"이 시나리오는 대학생의 주간 학습 시간, 수면 시간, 이전 학기 학점을 기반으로 현재 학기의 예상 학점을 예측하는 선형 회귀 문제입니다."

EXAMPLE OUTPUT:
\`\`\`json
{"code":"import pandas as pd\\nfrom sklearn.model_selection import train_test_split\\nfrom sklearn.linear_model import LinearRegression\\nfrom sklearn.metrics import mean_squared_error,r2_score\\ndf=pd.read_csv('student_grades.csv')\\nX=df[['주간학습시간','수면시간','이전학기학점']]\\ny=df['현재학기학점']\\nX_train,X_test,y_train,y_test=train_test_split(X,y,test_size=0.2)\\nmodel=LinearRegression()\\nmodel.fit(X_train,y_train)\\ny_pred=model.predict(X_test)\\nprint(f'R2: {r2_score(y_test,y_pred):.4f}')","nodeGuide":[{"step":1,"nodeType":"dataLoader","nodeName":"Loader (로더)","description":"학생 성적 데이터","reason":"데이터 로드","settings":{"fileName":"student_grades.csv"},"connections":{"from":[],"to":[{"step":2,"output":"data","input":"data"}]}},{"step":2,"nodeType":"dataSplit","nodeName":"Split (분할)","description":"80/20 분할","reason":"훈련/테스트","settings":{"ratio":0.8,"targetColumn":"현재학기학점"},"connections":{"from":[{"step":1,"output":"data","input":"data"}],"to":[{"step":3,"output":"train","input":"train"}]}},{"step":3,"nodeType":"regressor","nodeName":"LR (회귀)","description":"선형회귀","reason":"학점 예측","settings":{"algorithm":"LinearRegression"},"connections":{"from":[{"step":2,"output":"train","input":"train"}],"to":[{"step":4,"output":"model","input":"model"}]}},{"step":4,"nodeType":"predict","nodeName":"Predict (예측)","description":"예측","reason":"테스트","settings":{},"connections":{"from":[{"step":3,"output":"model","input":"model"},{"step":2,"output":"test","input":"test"}],"to":[{"step":5,"output":"prediction","input":"prediction"}]}},{"step":5,"nodeType":"evaluate","nodeName":"Eval (평가)","description":"R2/MSE","reason":"성능확인","settings":{},"connections":{"from":[{"step":4,"output":"prediction","input":"prediction"},{"step":2,"output":"test","input":"test"}],"to":[]}}]}
\`\`\`

Parse user's free-form text, infer missing details, generate JSON. Korean text: brief. JSON only.`;

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: systemPrompt }] }],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 8192,
                }
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const errorMessage = errorData.error?.message || response.statusText;
            
            // 상태 코드별 처리
            if (response.status === 503) {
                throw new Error('⚠️ Gemini API 서버가 과부하 상태입니다.\n잠시 후 다시 시도해주세요.');
            } else if (response.status === 429) {
                throw new Error('⚠️ API 요청 한도를 초과했습니다.\n잠시 후 다시 시도하거나 새 API 키를 발급받으세요.');
            }
            
            throw new Error(`API 오류: ${errorMessage}`);
        }

        const data = await response.json();
        console.log('🔍 Gemini API 응답:', data);
        
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        
        // 응답이 비어있는지 확인
        if (!text || text.trim() === '') {
            console.error('❌ 빈 응답 받음. 전체 데이터:', JSON.stringify(data, null, 2));
            throw new Error('⚠️ Gemini가 빈 응답을 반환했습니다.\n\n가능한 원인:\n1. 프롬프트가 너무 길거나 복잡함\n2. API 서버 불안정\n3. gemini-2.5-flash 모델 문제\n\n💡 해결방법: 더 짧고 명확한 프롬프트로 다시 시도하거나, 잠시 후 다시 시도해주세요.');
        }
        
        console.log('📄 응답 텍스트 길이:', text.length, '첫 200자:', text.substring(0, 200));
        
        // JSON 블록 추출
        let jsonText = text.trim();
        if (jsonText.startsWith('```json')) {
            jsonText = jsonText.replace(/^```json\n/, '').replace(/\n```$/, '');
        } else if (jsonText.startsWith('```')) {
            jsonText = jsonText.replace(/^```\n/, '').replace(/\n```$/, '');
        }
        
        // JSON 유효성 확인
        if (!jsonText || jsonText.trim() === '') {
            console.error('❌ JSON 추출 실패. 원본 텍스트:', text.substring(0, 500));
            throw new Error('응답에서 유효한 JSON을 찾을 수 없습니다.');
        }
        
        // JSON 파싱 (잘린 JSON 복구 시도)
        let result: CodeGenerationResult;
        try {
            result = JSON.parse(jsonText) as CodeGenerationResult;
            console.log('✅ JSON 파싱 성공:', result);
        } catch {
            console.error('❌ JSON 파싱 실패. jsonText:', jsonText.substring(0, 500));
            
            // 잘린 JSON 복구 시도
            if (!jsonText.endsWith('}')) {
                console.log('🔧 잘린 JSON 감지, 복구 시도...');
                // 마지막 완전한 노드까지만 사용
                const lastCompleteNode = jsonText.lastIndexOf('}]}');
                if (lastCompleteNode > 0) {
                    const fixedJson = jsonText.substring(0, lastCompleteNode + 3);
                    try {
                        result = JSON.parse(fixedJson) as CodeGenerationResult;
                        console.log('✅ 잘린 JSON 복구 성공');
                    } catch {
                        throw new Error('⚠️ 응답이 잘렸습니다.\n\n더 간단한 프롬프트로 다시 시도해주세요.');
                    }
                } else {
                    throw new Error('⚠️ 응답 형식이 올바르지 않습니다.\n\nGemini가 JSON 형식으로 응답하지 않았습니다.');
                }
            } else {
                throw new Error('⚠️ 응답 형식이 올바르지 않습니다.\n\nGemini가 JSON 형식으로 응답하지 않았습니다.');
            }
        }
        
        // 기본 검증
        if (!result.code || !result.nodeGuide) {
            console.error('❌ 필수 필드 누락:', result);
            throw new Error('응답에 필수 필드(code, nodeGuide)가 없습니다.');
        }
        
        return result;
    } catch (error) {
        console.error('Gemini API 오류:', error);
        
        // 이미 포맷된 메시지는 그대로 전달
        if (error instanceof Error && error.message.includes('⚠️')) {
            throw error;
        }
        
        throw new Error(`코드 생성 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }
}

/**
 * API 키를 localStorage에 저장합니다.
 */
export function saveGeminiApiKey(apiKey: string): void {
    localStorage.setItem('gemini_api_key', apiKey);
}

/**
 * 저장된 API 키를 가져옵니다.
 */
export function getStoredGeminiApiKey(): string | null {
    return localStorage.getItem('gemini_api_key');
}

/**
 * API 키를 삭제합니다.
 */
export function removeGeminiApiKey(): void {
    localStorage.removeItem('gemini_api_key');
}

/**
 * 노드 기반으로 생성된 기본 코드를 AI로 후처리하여 완전한 형태로 개선합니다.
 * @param generatedCode 노드로부터 생성된 기본 Python 코드
 * @param userIntent 사용자가 원하는 코드의 목적/의도
 * @returns AI가 개선한 완전한 Python 코드
 */
export async function enhanceCodeWithAI(generatedCode: string, userIntent: string): Promise<string> {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error('API 키가 설정되지 않았습니다.');

    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    
    const systemPrompt = `당신은 Python 머신러닝 코드 리팩토링 전문가입니다. 

**중요: 원본 코드의 구조와 데이터를 정확히 유지하면서 개선만 하세요!**

아래 자동 생성된 코드를 분석하고, **사용자 요구사항**에 맞춰 개선해주세요.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 원본 코드
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
\`\`\`python
${generatedCode}
\`\`\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 사용자 요구사항
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${userIntent}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ 개선 가이드라인
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**1. 원본 코드 분석 (반드시 확인)**
   • CSV 파일명 추출 → 그대로 사용
   • 컬럼명 추출 (특히 target 컬럼) → 정확히 유지
   • train_test_split 비율 → 변경하지 말 것
   • 사용된 모델 → 동일한 알고리즘 유지
   • 임베드된 CSV 데이터 → 절대 삭제 금지

**2. 변수명 개선**
   • step_xxxxx_model → model 또는 regressor/classifier
   • step_xxxxx_X_train → X_train
   • step_xxxxx_prediction → y_pred
   • 의미 있고 간결한 이름으로 변경

**3. 코드 구조 개선**
   • 불필요한 import 제거
   • 중복 코드 제거
   • 명확한 섹션 구분 (주석으로)

**4. 에러 처리 (최소한)**
   • try-except는 필수적인 부분만
   • 과도한 함수 분리 금지
   • 단순하고 읽기 쉽게

**5. 시각화 추가 (사용자 요구 시)**
   • matplotlib으로 결과 플롯
   • 파일명은 사용자가 요구한 대로
   • 간단하고 명확한 차트

**6. 금지 사항 체크**
   • 사용자가 금지한 라이브러리 절대 사용 금지
   • 예: "sklearn.linear_model.LinearRegression 사용 금지" → numpy.linalg.pinv 사용
   • 원본에 없던 복잡한 기능 추가 금지

**7. 출력 파일명**
   • 사용자가 명시한 파일명 사용
   • 예: class_score_predict.png, model.pkl 등

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📤 출력 규칙
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. **Python 코드만** 출력 (설명 금지)
2. 주석은 한국어로 간결하게
3. 실행 가능한 완전한 코드
4. 마크다운 코드 블록 사용: \`\`\`python ... \`\`\`
5. 원본의 데이터 소스(CSV 임베딩 또는 파일 경로) 유지

**출력 시작**:`;

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: systemPrompt }] }],
                generationConfig: {
                    temperature: 0.3, // 더 정확한 개선을 위해 낮춤
                    maxOutputTokens: 8192, // 더 긴 코드 허용
                }
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`API 오류: ${errorData.error?.message || response.statusText}`);
        }

        const data = await response.json();
        let text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        
        // 코드 블록 추출
        text = text.trim();
        if (text.startsWith('```python')) {
            text = text.replace(/^```python\n/, '').replace(/\n```$/, '');
        } else if (text.startsWith('```')) {
            text = text.replace(/^```\n/, '').replace(/\n```$/, '');
        }
        
        return text;
    } catch (error) {
        console.error('AI 코드 개선 오류:', error);
        throw new Error(`코드 개선 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }
}
