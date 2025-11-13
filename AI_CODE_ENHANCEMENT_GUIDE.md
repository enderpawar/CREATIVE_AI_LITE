# AI 코드 후처리 기능 가이드

## 📌 개요

ML Pipeline Builder v3.0에서는 노드 기반으로 생성된 기본 Python 코드를 **Gemini AI가 자동으로 개선**하는 기능이 추가되었습니다. 단순한 노드 연결만으로는 부족한 부분을 AI가 보완하여 **실제 프로덕션에서 사용 가능한 완전한 코드**를 생성합니다.

## 🎯 왜 AI 코드 후처리가 필요한가?

### 노드 기반 코드의 한계
- ❌ 에러 처리 부재 (파일 없음, 데이터 오류 등)
- ❌ 로깅 및 모니터링 부족
- ❌ 결과 시각화 누락
- ❌ 모델 저장/로드 기능 없음
- ❌ 하이퍼파라미터 튜닝 미흡
- ❌ 데이터 검증 부족

### AI 개선 코드의 장점
- ✅ **완전한 에러 처리**: try-except로 안전하게 감싸기
- ✅ **상세한 로깅**: 각 단계마다 진행 상황 출력
- ✅ **자동 시각화**: confusion matrix, feature importance 등
- ✅ **모델 저장**: pickle/joblib로 학습된 모델 저장
- ✅ **Cross-validation**: 모델 성능 검증 강화
- ✅ **사용자 의도 반영**: 커스터마이징된 코드 생성

## 🚀 사용 방법

### Step 1: 코드 목적 설명
우측 사이드바의 **"💡 코드 목적 설명"** 섹션에 원하는 코드의 목적을 자세히 입력합니다.

**예시**:
```
아이리스 데이터셋으로 꽃의 종류를 분류하고, 
학습된 모델을 파일로 저장하고 싶습니다. 
또한 confusion matrix와 feature importance를 시각화해주세요.
```

**팁**:
- 구체적일수록 좋습니다
- 원하는 시각화나 추가 기능을 명시하세요
- 데이터셋 특성도 언급하면 더욱 정확합니다

### Step 2: 노드 배치
기존처럼 좌측에서 노드를 드래그하여 파이프라인을 구성합니다.

**기본 구조 예시**:
1. Data Loader (CSV 파일 로드)
2. Data Split (Train/Test 분할)
3. Scaler (데이터 정규화)
4. Classifier (RandomForest 모델)
5. Evaluate (모델 평가)

### Step 3: 코드 생성 및 AI 개선
1. **"🐍 코드 보기"** 버튼 클릭
2. 모달 창에서 **"노드 기반 코드"** 탭 확인
3. **"✨ AI로 개선하기"** 탭 클릭
4. AI가 자동으로 코드를 분석하고 개선 (약 5~10초 소요)
5. 탭을 전환하며 **원본 vs 개선 코드** 비교

### Step 4: 코드 다운로드
- **📋 복사하기**: 클립보드에 복사
- **📓 Jupyter로 저장**: `.ipynb` 파일로 다운로드
- **📄 .py로 저장**: Python 스크립트로 다운로드

**AI 개선 코드로 다운로드 시 파일명에 `_ai_enhanced` 접미사가 추가됩니다.**

## 🔍 AI가 추가하는 개선 사항

### 1. 에러 처리
```python
# Before (노드 기반)
data = pd.read_csv('iris.csv')

# After (AI 개선)
try:
    if not os.path.exists('iris.csv'):
        raise FileNotFoundError("iris.csv 파일을 찾을 수 없습니다.")
    data = pd.read_csv('iris.csv')
    print(f"✅ 데이터 로드 완료: {data.shape}")
except FileNotFoundError as e:
    print(f"❌ 파일 오류: {e}")
    sys.exit(1)
except Exception as e:
    print(f"❌ 예상치 못한 오류: {e}")
    sys.exit(1)
```

### 2. 시각화
```python
# AI가 자동 추가
import matplotlib.pyplot as plt
import seaborn as sns

# Confusion Matrix 시각화
plt.figure(figsize=(8, 6))
sns.heatmap(cm, annot=True, fmt='d', cmap='Blues')
plt.title('Confusion Matrix')
plt.ylabel('실제 값')
plt.xlabel('예측 값')
plt.savefig('confusion_matrix.png')
plt.show()

# Feature Importance 시각화
importances = model.feature_importances_
plt.figure(figsize=(10, 6))
plt.barh(feature_names, importances)
plt.xlabel('중요도')
plt.title('Feature Importance')
plt.tight_layout()
plt.savefig('feature_importance.png')
plt.show()
```

### 3. 모델 저장
```python
# AI가 자동 추가
import joblib
from datetime import datetime

# 모델 저장
model_filename = f'model_{datetime.now().strftime("%Y%m%d_%H%M%S")}.pkl'
joblib.dump(model, model_filename)
print(f"💾 모델 저장 완료: {model_filename}")

# 나중에 모델 로드
# loaded_model = joblib.load(model_filename)
```

### 4. Cross-Validation
```python
# AI가 자동 추가
from sklearn.model_selection import cross_val_score

# 5-fold Cross Validation
cv_scores = cross_val_score(model, X_train, y_train, cv=5)
print(f"Cross-Validation 점수: {cv_scores}")
print(f"평균 점수: {cv_scores.mean():.4f} (+/- {cv_scores.std() * 2:.4f})")
```

### 5. 상세 로깅
```python
# AI가 자동 추가
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

logger.info("데이터 전처리 시작...")
logger.info(f"훈련 데이터: {X_train.shape}, 테스트 데이터: {X_test.shape}")
logger.info("모델 학습 시작...")
logger.info(f"최종 정확도: {accuracy:.4f}")
```

## 💡 활용 팁

### 1. 의도를 명확히 작성하세요
**나쁜 예시**: "모델 만들어줘"
**좋은 예시**: "타이타닉 데이터로 생존 여부를 예측하는 RandomForest 모델을 만들고, 중요 변수를 시각화하며, 모델을 저장해주세요."

### 2. 특정 기능 요청
- "confusion matrix를 그려주세요"
- "모델을 pickle로 저장해주세요"
- "하이퍼파라미터 튜닝을 추가해주세요"
- "데이터 전처리 과정을 시각화해주세요"

### 3. 여러 번 시도
- AI 결과가 마음에 들지 않으면 의도를 수정하고 다시 개선
- 각기 다른 스타일의 코드가 생성될 수 있습니다

### 4. 원본 코드와 비교
- 탭을 전환하며 AI가 무엇을 추가했는지 확인
- 불필요한 부분은 수동으로 제거 가능

## ⚙️ 기술 세부사항

### API 사용
- **모델**: Gemini 2.0 Flash (Google)
- **Temperature**: 0.5 (안정적인 코드 생성)
- **Max Tokens**: 4096 (충분한 코드 길이)

### 개선 프로세스
1. 노드 기반 코드 분석
2. 사용자 의도 파싱
3. Gemini AI에 프롬프트 전송
4. 개선된 코드 수신 및 파싱
5. UI에 표시 및 다운로드 준비

### 로컬 저장
- 사용자 의도는 **세션 중에만 유지**됩니다
- 개선된 코드는 **다운로드 시에만 저장**됩니다
- API 키는 localStorage에 안전하게 저장됩니다

## 🐛 문제 해결

### "API 키가 설정되지 않았습니다" 오류
1. 우측 "🤖 AI Python 코드 생성" 섹션으로 이동
2. "API 키 관리" 버튼 클릭
3. [Google AI Studio](https://aistudio.google.com/app/apikey)에서 키 발급
4. 키 입력 후 저장

### "코드 개선에 실패했습니다" 오류
- 의도를 더 구체적으로 작성해보세요
- 노드 구성이 올바른지 확인하세요
- API 키가 유효한지 확인하세요
- 인터넷 연결을 확인하세요

### AI가 예상과 다른 코드 생성
- 의도를 더 상세히 작성하세요
- 원하는 기능을 명시적으로 나열하세요
- 여러 번 시도해보세요 (매번 조금씩 다른 결과)

## 📚 추가 리소스

- [Gemini AI 가이드](./GEMINI_AI_GUIDE.md)
- [ML 파이프라인 가이드](./ML_PIPELINE_GUIDE.md)
- [코드 생성 원리](./CODE_GENERATION_EXPLAINED.md)
- [노드 타입 소개](./INTRODUCTION_NODE.md)

## 🎉 결론

AI 코드 후처리 기능을 사용하면:
- ⏱️ **시간 절약**: 에러 처리와 시각화 자동 추가
- 🛡️ **안정성**: 프로덕션 수준의 코드 품질
- 📊 **인사이트**: 자동 시각화로 결과 분석 용이
- 🎓 **학습**: AI가 생성한 코드에서 베스트 프랙티스 학습

**노드 배치의 직관성 + AI 개선의 완성도 = 완벽한 ML 파이프라인!** ✨
