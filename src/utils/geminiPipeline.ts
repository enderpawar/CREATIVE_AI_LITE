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

**중요**: 노드 연결 정보를 명확히 포함해야 합니다!

출력 형식 (반드시 JSON):
\`\`\`json
{
  "code": "완전한 Python 코드",
  "nodeGuide": [
    {
      "step": 1,
      "nodeType": "dataLoader",
      "nodeName": "데이터 로더",
      "description": "CSV 파일에서 데이터를 로드합니다",
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
      "nodeName": "데이터 분할",
      "description": "훈련/테스트 데이터로 분할합니다",
      "settings": {
        "ratio": 0.8,
        "targetColumn": "species"
      },
      "connections": {
        "from": [
          { "step": 1, "output": "data" }
        ],
        "to": []
      }
    },
    {
      "step": 3,
      "nodeType": "scaler",
      "nodeName": "표준 정규화",
      "description": "StandardScaler로 데이터를 정규화합니다",
      "settings": {
        "method": "StandardScaler"
      },
      "connections": {
        "from": [
          { "step": 2, "output": "X_train" }
        ],
        "to": []
      }
    }
  ]
}
\`\`\`

사용 가능한 노드 타입과 **정확한 입출력 소켓**:

1. **dataLoader** (데이터 로더)
   - 입력: 없음
   - 출력: **data**
   - settings: { fileName: "파일명.csv" }

2. **dataSplit** (데이터 분할)
   - 입력: **data**
   - 출력: **X_train**, **y_train**, **X_test**, **y_test**
   - settings: { ratio: 0.8, targetColumn: "target" }

3. **scaler** (정규화)
   - 입력: **data** (보통 X_train을 연결)
   - 출력: **scaled**
   - settings: { method: "StandardScaler" 또는 "MinMaxScaler" }

4. **featureSelection** (피처 선택)
   - 입력: **data**
   - 출력: **selected**
   - settings: { method: "SelectKBest", k: 10 }

5. **classifier** (분류 모델)
   - 입력: **X_train**, **y_train**
   - 출력: **model**
   - settings: { algorithm: "RandomForest", n_estimators: 100 }

6. **regressor** (회귀 모델)
   - 입력: **X_train**, **y_train**
   - 출력: **model**
   - settings: { algorithm: "LinearRegression" }

7. **neuralNet** (신경망)
   - 입력: **X_train**, **y_train**
   - 출력: **model**
   - settings: { layers: "64,32", epochs: 50 }

8. **evaluate** (모델 평가)
   - 입력: **model**, **X_test**, **y_test**
   - 출력: **metrics**
   - settings: {}

9. **predict** (예측)
   - 입력: **model**, **data**
   - 출력: **prediction**
   - settings: {}

**완전한 예시 - 아이리스 분류**:
\`\`\`json
{
  "code": "# 필요한 라이브러리 import\\nimport pandas as pd\\nimport numpy as np\\nfrom sklearn.model_selection import train_test_split\\nfrom sklearn.preprocessing import StandardScaler\\nfrom sklearn.ensemble import RandomForestClassifier\\nfrom sklearn.metrics import accuracy_score, classification_report\\nfrom sklearn.datasets import load_iris\\n\\n# 데이터 로딩\\niris = load_iris()\\nX = iris.data\\ny = iris.target\\n\\n# 훈련/테스트 데이터 분할\\nX_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)\\n\\n# 정규화\\nscaler = StandardScaler()\\nX_train_scaled = scaler.fit_transform(X_train)\\nX_test_scaled = scaler.transform(X_test)\\n\\n# 모델 훈련\\nmodel = RandomForestClassifier(n_estimators=100, random_state=42)\\nmodel.fit(X_train_scaled, y_train)\\n\\n# 예측 및 평가\\ny_pred = model.predict(X_test_scaled)\\naccuracy = accuracy_score(y_test, y_pred)\\nprint(f'Accuracy: {accuracy:.4f}')\\nprint(classification_report(y_test, y_pred))",
  "nodeGuide": [
    {
      "step": 1,
      "nodeType": "dataLoader",
      "nodeName": "아이리스 데이터 로더",
      "description": "아이리스 데이터셋을 로드합니다",
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
      "nodeName": "데이터 분할",
      "description": "80% 훈련, 20% 테스트로 분할합니다",
      "settings": {
        "ratio": 0.8,
        "targetColumn": "species"
      },
      "connections": {
        "from": [
          { "step": 1, "output": "data", "input": "data" }
        ],
        "to": [
          { "step": 3, "output": "X_train", "input": "data" },
          { "step": 4, "output": "y_train", "input": "y_train" },
          { "step": 5, "output": "X_test", "input": "X_test" },
          { "step": 5, "output": "y_test", "input": "y_test" }
        ]
      }
    },
    {
      "step": 3,
      "nodeType": "scaler",
      "nodeName": "표준 정규화",
      "description": "StandardScaler로 X_train을 정규화합니다",
      "settings": {
        "method": "StandardScaler"
      },
      "connections": {
        "from": [
          { "step": 2, "output": "X_train", "input": "data" }
        ],
        "to": [
          { "step": 4, "output": "scaled", "input": "X_train" }
        ]
      }
    },
    {
      "step": 4,
      "nodeType": "classifier",
      "nodeName": "랜덤 포레스트 분류기",
      "description": "100개 트리를 가진 랜덤 포레스트로 학습합니다",
      "settings": {
        "algorithm": "RandomForest",
        "n_estimators": 100
      },
      "connections": {
        "from": [
          { "step": 3, "output": "scaled", "input": "X_train" },
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
      "nodeName": "모델 평가",
      "description": "정확도와 분류 리포트를 출력합니다",
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

**연결 규칙**:
- **from**: 이 노드의 입력 소켓에 연결할 이전 노드 정보
  - step: 이전 노드의 단계 번호
  - output: 이전 노드의 출력 소켓 이름
  - input: 현재 노드의 입력 소켓 이름
- **to**: 이 노드의 출력 소켓을 연결할 다음 노드 정보
  - step: 다음 노드의 단계 번호
  - output: 현재 노드의 출력 소켓 이름
  - input: 다음 노드의 입력 소켓 이름

예시:
- scaler의 입력 "data"에 dataSplit의 출력 "X_train" 연결
  → from: [{ step: 2, output: "X_train", input: "data" }]
- scaler의 출력 "scaled"를 classifier의 입력 "X_train"에 연결
  → to: [{ step: 4, output: "scaled", input: "X_train" }]

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
