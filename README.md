# ML Pipeline Builder

머신러닝 파이프라인을 시각적으로 설계하고 Python 코드로 자동 변환하는 노드 기반 에디터입니다.
<img width="3837" height="1979" alt="image" src="https://github.com/user-attachments/assets/ce1113d0-1e80-4c39-8a7a-3a38fc020fe8" />
<img width="2807" height="1969" alt="image" src="https://github.com/user-attachments/assets/65d62a3e-1371-475e-ae65-b3c11e8078ff" />
<img width="1431" height="1708" alt="image" src="https://github.com/user-attachments/assets/9df427fb-e75f-4d3c-a626-442566b9edfa" />
노드 구성 및 입력
<img width="2387" height="1905" alt="image" src="https://github.com/user-attachments/assets/c84376f4-7e50-473a-bbd4-fd84e999bf1a" />
제출된 코드
<img width="805" height="1056" alt="image" src="https://github.com/user-attachments/assets/e62fc40d-6c69-4c93-a302-d04512743e98" />
실제 실행 코드
<img width="759" height="820" alt="image" src="https://github.com/user-attachments/assets/8d80f8a7-0e67-45f9-b890-11b232251741" />

## ✨ 주요 기능

### 🎨 시각적 노드 에디터
- 드래그 앤 드롭으로 ML 파이프라인 구성
- 10가지 전문 ML 노드 타입 제공
- 실시간 그래프 시각화

### 🤖 AI 자동 생성 (NEW!)
- **Gemini AI 통합**: 자연어 프롬프트로 파이프라인 자동 생성
- 예시: "아이리스 데이터로 꽃 분류하는 랜덤 포레스트 모델 만들어줘"
- 노드 배치 및 연결 자동화

### ✨ AI 코드 후처리 (NEW!)
- **스마트 코드 개선**: 노드 기반 코드를 AI가 완전한 형태로 개선
- **자동 에러 처리**: try-except 블록 및 데이터 검증 추가
- **시각화 추가**: matplotlib 기반 결과 시각화 코드 생성
- **모델 저장**: pickle/joblib을 사용한 모델 저장 기능
- **사용자 의도 반영**: 코드 목적에 맞는 커스터마이징

### 📊 데이터 관리
- CSV 파일 업로드 및 관리
- 데이터 미리보기 (행/열 개수, 샘플 표시)
- Base64 인코딩으로 코드에 데이터 임베딩

### 🐍 Python 코드 생성
- 노드 그래프 → Python 코드 자동 변환
- Jupyter Notebook (.ipynb) 내보내기
- Python 스크립트 (.py) 다운로드
- 토폴로지 정렬로 실행 순서 최적화
- **AI 개선 옵션**: 원본 코드 vs AI 개선 코드 선택 가능

## 🚀 시작하기

### 설치
```bash
npm install
```

### 개발 서버 실행
```bash
npm run dev
```

### Gemini AI 설정 (선택사항)
1. [Google AI Studio](https://aistudio.google.com/app/apikey)에서 무료 API 키 발급
2. UI에서 직접 입력하거나 `.env` 파일에 설정:
```env
VITE_GEMINI_API_KEY=your_api_key_here
```

자세한 내용은 [Gemini AI 가이드](./GEMINI_AI_GUIDE.md)를 참고하세요.

## 📚 문서

- [ML 파이프라인 사용 가이드](./ML_PIPELINE_GUIDE.md)
- [노드 타입 소개](./INTRODUCTION_NODE.md)
- [코드 생성 원리](./CODE_GENERATION_EXPLAINED.md)
- [Gemini AI 자동 생성](./GEMINI_AI_GUIDE.md)

## 🎯 사용 가능한 노드

1. **Data Loader** - CSV 데이터 로드
2. **Data Split** - Train/Test 분할
3. **Scaler** - 데이터 정규화/스케일링
4. **Feature Selection** - 특성 선택
5. **Classifier** - 분류 모델 (Logistic, RandomForest, SVM 등)
6. **Regressor** - 회귀 모델 (Linear, Ridge, Lasso 등)
7. **Neural Network** - 신경망 모델
8. **Evaluate** - 모델 평가
9. **Predict** - 예측 수행
10. **Hyperparam Tune** - 하이퍼파라미터 튜닝

## 🔧 기술 스택

- **React 19** - UI 프레임워크
- **Vite** - 빌드 도구
- **Rete.js** - 노드 에디터 라이브러리
- **TypeScript** - 타입 안전성
- **Gemini AI** - 자동 파이프라인 생성
- **localStorage** - 데이터 영속성

## 📖 사용 예시

### 1. 수동으로 파이프라인 구성
1. 좌측 사이드바에서 "Data Loader" 노드를 드래그
2. "Data Split" → "Scaler" → "Classifier" 순서로 추가
3. 노드 간 연결 (출력 → 입력)
4. 각 노드의 파라미터 설정
5. "코드 생성" 버튼으로 Python 코드 확인

### 2. AI로 자동 생성 (NEW!)
1. 우측 "🤖 AI 파이프라인 생성" 섹션으로 이동
2. 프롬프트 입력: "타이타닉 생존 예측 RandomForest 모델"
3. "✨ AI로 파이프라인 생성하기" 클릭
4. 자동 생성된 노드 확인 및 수정

### 3. AI 코드 개선 (NEW!)
1. 우측 상단 "💡 코드 목적 설명" 섹션에 의도 입력
   - 예: "아이리스 데이터로 꽃을 분류하고, 모델을 파일로 저장하고 싶습니다."
2. 노드 배치 완료 후 "🐍 코드 보기" 클릭
3. 모달에서 "✨ AI로 개선하기" 탭 클릭
4. AI가 자동으로 에러 처리, 시각화, 모델 저장 코드 추가
5. 원본 코드와 AI 개선 코드를 탭으로 비교 가능

### 4. 코드 내보내기
- **Jupyter Notebook**: 셀 단위로 구성된 .ipynb 파일
- **Python Script**: 실행 가능한 .py 파일
- **미리보기**: 코드 확인 후 복사 가능
- **AI 개선 버전**: 파일명에 `_ai_enhanced` 접미사 추가

## 🌟 주요 업데이트

### v3.0 - AI 코드 후처리 (NEW!)
- 사용자 의도 입력 UI 추가
- Gemini AI 기반 코드 후처리 기능
- 자동 에러 처리 및 로깅 추가
- 시각화 코드 자동 생성 (confusion matrix, feature importance)
- 모델 저장/로드 기능 추가
- 탭 방식으로 원본/개선 코드 비교

### v2.0 - AI 자동 생성
- Gemini AI 통합
- 자연어 프롬프트 지원
- 자동 노드 배치 및 연결

### v1.0 - ML Pipeline Builder
- 10가지 ML 노드 구현
- Python 코드 자동 생성
- CSV 데이터 관리
- Jupyter Notebook 내보내기

## 📝 라이선스

MIT License

