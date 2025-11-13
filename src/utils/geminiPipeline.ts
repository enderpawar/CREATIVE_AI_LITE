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

    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`;
    
    const systemPrompt = `당신은 머신러닝 전문가입니다. 사용자의 요구사항에 맞는 scikit-learn 기반 Python 코드를 생성하고, 노드 기반 에디터에서 구현하기 위한 **상세한 가이드**를 제공해주세요.

**중요**: 
1. nodeName은 반드시 "영어이름(한국어설명)" 형식으로 작성해주세요. 예: "Data Loader (데이터 로더)"
2. 노드 연결 정보를 명확히 포함해야 합니다!
3. 소켓 이름은 표준 ML 명명 규칙을 따라야 합니다 (X_train, y_train, X_test, y_test, model, prediction, metrics)

출력 형식 (반드시 JSON):
\`\`\`json
{
  "code": "완전한 Python 코드",
  "nodeGuide": [
    {
      "step": 1,
      "nodeType": "dataLoader",
      "nodeName": "Data Loader (데이터 로더)",
      "description": "CSV 파일에서 데이터를 로드합니다",
      "reason": "머신러닝 파이프라인의 첫 단계로, 분석할 데이터를 불러와야 합니다. 아이리스 데이터셋은 꽃의 특성(꽃받침 길이/너비, 꽃잎 길이/너비)과 종류 정보를 담고 있습니다.",
      "settings": {
        "fileName": "iris.csv"
      },
      "connections": {
        "to": []
      }
    },
    {
      "step": 2,
      "nodeType": "dataSplit",
      "nodeName": "Data Split (데이터 분할)",
      "description": "훈련/테스트 데이터로 분할합니다",
      "reason": "모델의 성능을 정확히 평가하기 위해 데이터를 훈련용(80%)과 테스트용(20%)으로 나눕니다. 훈련 데이터로 학습하고, 보지 못한 테스트 데이터로 평가해야 과적합을 방지할 수 있습니다.",
      "settings": {
        "ratio": 0.8,
        "targetColumn": "species"
      },
      "connections": {
        "from": [
          { "step": 1, "output": "data", "input": "data" }
        ],
        "to": []
      }
    }
  ]
}
\`\`\`

사용 가능한 노드 타입과 **정확한 입출력 소켓**:

1. **dataLoader** - "Data Loader (데이터 로더)"
   - 입력: 없음
   - 출력: **data**
   - settings: { fileName: "파일명.csv" }

2. **dataSplit** - "Data Split (데이터 분할)"
   - 입력: **data**
   - 출력: **X_train**, **y_train**, **X_test**, **y_test**
   - settings: { ratio: 0.8, targetColumn: "target" }

3. **scaler** - "Scaler (정규화)"
   - 입력: **X_train**
   - 출력: **X_train**
   - settings: { method: "StandardScaler" 또는 "MinMaxScaler" }
   - 참고: 입출력이 모두 X_train으로 같습니다 (변환된 데이터)

4. **featureSelection** - "Feature Selection (피처 선택)"
   - 입력: **X_train**, **y_train**
   - 출력: **X_train**
   - settings: { method: "SelectKBest", k: 10 }
   - 참고: y_train이 필요하며, 선택된 피처를 X_train으로 출력합니다

5. **classifier** - "Classifier (분류 모델)"
   - 입력: **X_train**, **y_train**
   - 출력: **model**
   - settings: { algorithm: "RandomForest", n_estimators: 100 }

6. **regressor** - "Regressor (회귀 모델)"
   - 입력: **X_train**, **y_train**
   - 출력: **model**
   - settings: { algorithm: "LinearRegression" }

7. **neuralNet** - "Neural Network (신경망)"
   - 입력: **X_train**, **y_train**
   - 출력: **model**
   - settings: { layers: "64,32", epochs: 50 }

8. **hyperparamTune** - "Hyperparameter Tuning (하이퍼파라미터 튜닝)"
   - 입력: **X_train**, **y_train**
   - 출력: **model**
   - settings: {}

9. **predict** - "Predict (예측)"
   - 입력: **model**, **X_test**
   - 출력: **prediction**
   - settings: {}

10. **evaluate** - "Evaluate (모델 평가)"
   - 입력 옵션 1: **model**, **X_test**, **y_test** (모델로부터 예측 생성)
   - 입력 옵션 2: **prediction**, **y_test** (이미 생성된 예측값 사용)
   - 출력: **metrics**
   - settings: {}
   - 참고: predict 노드 사용 시 옵션 2, 사용 안 하면 옵션 1

**완전한 예시 - 아이리스 분류**:
\`\`\`json
{
  "code": "# 필요한 라이브러리 import\\nimport pandas as pd\\nimport numpy as np\\nfrom sklearn.model_selection import train_test_split\\nfrom sklearn.preprocessing import StandardScaler\\nfrom sklearn.ensemble import RandomForestClassifier\\nfrom sklearn.metrics import accuracy_score, classification_report\\nfrom sklearn.datasets import load_iris\\n\\n# 데이터 로딩\\niris = load_iris()\\nX = iris.data\\ny = iris.target\\n\\n# 훈련/테스트 데이터 분할\\nX_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)\\n\\n# 정규화\\nscaler = StandardScaler()\\nX_train_scaled = scaler.fit_transform(X_train)\\nX_test_scaled = scaler.transform(X_test)\\n\\n# 모델 훈련\\nmodel = RandomForestClassifier(n_estimators=100, random_state=42)\\nmodel.fit(X_train_scaled, y_train)\\n\\n# 예측 및 평가\\ny_pred = model.predict(X_test_scaled)\\naccuracy = accuracy_score(y_test, y_pred)\\nprint(f'Accuracy: {accuracy:.4f}')\\nprint(classification_report(y_test, y_pred))",
  "nodeGuide": [
    {
      "step": 1,
      "nodeType": "dataLoader",
      "nodeName": "Data Loader (아이리스 데이터 로더)",
      "description": "아이리스 데이터셋을 로드합니다",
      "reason": "머신러닝의 첫 단계는 데이터 수집입니다. 아이리스 데이터셋은 150개의 꽃 샘플과 4가지 특성(꽃받침/꽃잎의 길이와 너비)을 포함하며, 3가지 품종을 분류하는 데 사용됩니다.",
      "settings": {
        "fileName": "iris.csv"
      },
      "connections": {
        "from": [],
        "to": [
          { "step": 2, "output": "data", "input": "data" }
        ]
      }
    },
    {
      "step": 2,
      "nodeType": "dataSplit",
      "nodeName": "Data Split (데이터 분할)",
      "description": "80% 훈련, 20% 테스트로 분할합니다",
      "reason": "모델이 보지 못한 데이터에서도 잘 작동하는지 검증하기 위해 데이터를 나눕니다. 훈련 데이터로 패턴을 학습하고, 테스트 데이터로 실제 성능을 측정합니다. 80:20 비율이 일반적으로 적절합니다.",
      "settings": {
        "ratio": 0.8,
        "targetColumn": "species"
      },
      "connections": {
        "from": [
          { "step": 1, "output": "data", "input": "data" }
        ],
        "to": [
          { "step": 3, "output": "X_train", "input": "X_train" },
          { "step": 4, "output": "y_train", "input": "y_train" },
          { "step": 5, "output": "X_test", "input": "X_test" },
          { "step": 5, "output": "y_test", "input": "y_test" }
        ]
      }
    },
    {
      "step": 3,
      "nodeType": "scaler",
      "nodeName": "Scaler (표준 정규화)",
      "description": "StandardScaler로 X_train을 정규화합니다",
      "reason": "각 특성의 스케일이 다르면(예: 길이는 cm, 무게는 kg) 모델이 큰 값에 편향될 수 있습니다. StandardScaler는 모든 특성을 평균 0, 표준편차 1로 조정하여 공정한 학습을 가능하게 합니다.",
      "settings": {
        "method": "StandardScaler"
      },
      "connections": {
        "from": [
          { "step": 2, "output": "X_train", "input": "X_train" }
        ],
        "to": [
          { "step": 4, "output": "X_train", "input": "X_train" }
        ]
      }
    },
    {
      "step": 4,
      "nodeType": "classifier",
      "nodeName": "Classifier (랜덤 포레스트 분류기)",
      "description": "100개 트리를 가진 랜덤 포레스트로 학습합니다",
      "reason": "랜덤 포레스트는 여러 개의 결정 트리를 조합한 앙상블 모델로, 과적합에 강하고 높은 정확도를 제공합니다. 100개의 트리를 사용하면 안정적인 예측이 가능합니다.",
      "settings": {
        "algorithm": "RandomForest",
        "n_estimators": 100
      },
      "connections": {
        "from": [
          { "step": 3, "output": "X_train", "input": "X_train" },
          { "step": 2, "output": "y_train", "input": "y_train" }
        ],
        "to": [
          { "step": 5, "output": "model", "input": "model" }
        ]
      }
    },
    {
      "step": 5,
      "nodeType": "evaluate",
      "nodeName": "Evaluate (모델 평가)",
      "description": "정확도와 분류 리포트를 출력합니다",
      "reason": "학습된 모델이 실제로 얼마나 잘 작동하는지 측정해야 합니다. 정확도, 정밀도, 재현율 등의 지표를 통해 모델의 강점과 약점을 파악할 수 있습니다.",
      "settings": {},
      "connections": {
        "from": [
          { "step": 4, "output": "model", "input": "model" },
          { "step": 2, "output": "X_test", "input": "X_test" },
          { "step": 2, "output": "y_test", "input": "y_test" }
        ],
        "to": []
      }
    }
  ]
}
\`\`\`

**중요**: 각 노드에 대해 반드시 "reason" 필드를 포함하여, 사용자가 왜 이 노드를 사용하는지 이해할 수 있게 해주세요. 이유는 초보자도 이해할 수 있도록 쉽고 구체적으로 설명해야 합니다.

**연결 규칙**:
- **from**: 이 노드의 입력 소켓에 연결할 이전 노드 정보
  - step: 이전 노드의 단계 번호
  - output: 이전 노드의 출력 소켓 이름
  - input: 현재 노드의 입력 소켓 이름
- **to**: 이 노드의 출력 소켓을 연결할 다음 노드 정보
  - step: 다음 노드의 단계 번호
  - output: 현재 노드의 출력 소켓 이름
  - input: 다음 노드의 입력 소켓 이름

**중요한 소켓 연결 패턴**:
- scaler의 입력/출력이 모두 "X_train"입니다 → from: [{ output: "X_train", input: "X_train" }]
- featureSelection도 입출력이 "X_train"이지만 "y_train"도 필요합니다
- classifier/regressor/neuralNet는 모두 "model"을 출력합니다
- evaluate는 "model"+"X_test"+"y_test" 또는 "prediction"+"y_test"를 입력받습니다

이제 사용자 요구사항에 맞는 Python 코드와 **양방향 연결 정보를 포함한** 노드 가이드를 JSON 형식으로 생성해주세요.

사용자 요구사항: ${userPrompt}`;

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: systemPrompt }] }],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 3072,
                }
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`API 오류: ${errorData.error?.message || response.statusText}`);
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        
        // JSON 블록 추출
        let jsonText = text.trim();
        if (jsonText.startsWith('```json')) {
            jsonText = jsonText.replace(/^```json\n/, '').replace(/\n```$/, '');
        } else if (jsonText.startsWith('```')) {
            jsonText = jsonText.replace(/^```\n/, '').replace(/\n```$/, '');
        }
        
        const result = JSON.parse(jsonText) as CodeGenerationResult;
        
        // 기본 검증
        if (!result.code || !result.nodeGuide) {
            throw new Error('잘못된 응답 형식입니다.');
        }
        
        return result;
    } catch (error) {
        console.error('Gemini API 오류:', error);
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

    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`;
    
    const systemPrompt = `당신은 머신러닝 코드 전문가입니다. 노드 기반 에디터에서 자동 생성된 Python 코드를 받아서, 실제 프로덕션에서 사용할 수 있는 **완전하고 견고한 코드**로 개선해주세요.

**개선 작업 항목**:

1. **에러 처리 추가**
   - try-except 블록으로 안전하게 감싸기
   - 파일 존재 여부 확인
   - 데이터 유효성 검사

2. **로깅 및 모니터링**
   - 주요 단계마다 진행 상황 출력
   - 중간 결과 시각화 (matplotlib 사용)
   - 성능 메트릭 상세 출력

3. **코드 최적화**
   - 불필요한 중복 제거
   - 변수명 개선 (의미 있는 이름 사용)
   - 주석 추가 (한국어)

4. **추가 기능**
   - 모델 저장/로드 기능 (pickle 또는 joblib)
   - 하이퍼파라미터 자동 튜닝 제안
   - Cross-validation 추가
   - 시각화 코드 (confusion matrix, feature importance 등)

5. **사용자 의도 반영**
   - 사용자가 명시한 목적에 맞게 코드 커스터마이징
   - 추가적인 분석이나 전처리 단계 제안

**원본 코드**:
\`\`\`python
${generatedCode}
\`\`\`

**사용자 의도**: ${userIntent}

**요구사항**:
- 원본 코드의 핵심 로직은 유지하되, 개선 사항을 추가하세요
- 주석은 한국어로 작성하세요
- import 문은 상단에 정리하세요
- 실행 가능한 완전한 코드를 생성하세요
- 코드만 출력하고, 설명은 주석으로만 포함하세요

**출력 형식**: Python 코드만 출력 (마크다운 코드 블록 사용)`;

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: systemPrompt }] }],
                generationConfig: {
                    temperature: 0.5,
                    maxOutputTokens: 4096,
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
