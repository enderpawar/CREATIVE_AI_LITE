import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_squared_error, r2_score
import io
import base64

# ========================================
# ML Pipeline - 수정된 코드
# ========================================

print("=" * 50)
print("ML Pipeline: class_score_en.csv 회귀 분석")
print("=" * 50)

# 1. 데이터 로드
csv_content = base64.b64decode('IyBtaWR0ZXJtIChtYXggMTI1KSwgZmluYWwgKG1heCAxMDApDQoxMTMsIDg2DQoxMDQsIDgzDQoxMTAsIDc4DQoxMDEsIDc5DQoxMDEsIDc3DQoxMDMsIDc2DQo3MSwgOTQNCjEwMiwgNzENCjg4LCA3Ng0KMTAxLCA3Mg0KODEsIDc4DQo4NCwgNzgNCjkxLCA3Mg0KMTA3LCA2NQ0KNjQsIDg5DQo3OCwgODYNCjc0LCA3Mw0KMTE3LCA0NQ0KMTAwLCA1NQ0KMTA1LCA1Mw0KNzIsIDg4DQo4NywgNzMNCjQ0LCA3Mw0KNjYsIDgxDQo2NCwgNzANCjg2LCA1MQ0KNjgsIDUyDQo0NywgNjYNCjYzLCA2Ng0KNTEsIDU3DQo2NCwgNDENCjU0LCA0OQ0KNTMsIDQ3DQo5MiwgMjkNCjQ4LCAxOA0KNDIsIDM2DQoyMSwgMjINCjU1LCA1NQ0KNjEsIDI4DQo1MCwgMzUNCjIxLCAwDQo0NSwgMA0KNDIsIDA=').decode('utf-8')
data = pd.read_csv(io.StringIO(csv_content))
print(f"\n✅ 데이터 로드 완료: {data.shape}")
print(f"컬럼명: {list(data.columns)}")
print("\n처음 5개 행:")
print(data.head())

# 2. 데이터 분할 (올바른 컬럼명 사용)
target_column = 'final'  # ✅ 수정: 'target' → 'final'
X = data.drop(target_column, axis=1)
y = data[target_column]

print(f"\n✅ 입력 변수 (X): {X.columns.tolist()}")
print(f"✅ 목표 변수 (y): '{target_column}'")

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.20, random_state=42
)
print(f"\n훈련 데이터: {len(X_train)}개, 테스트 데이터: {len(X_test)}개")

# 3. 모델 훈련 (LinearRegression)
model = LinearRegression()
model.fit(X_train, y_train)
print(f"\n✅ 모델 훈련 완료: LinearRegression")
print(f"   - 기울기 (coefficient): {model.coef_[0]:.4f}")
print(f"   - 절편 (intercept): {model.intercept_:.4f}")
print(f"   - 훈련 R² 점수: {model.score(X_train, y_train):.4f}")

# 4. 예측 수행
y_pred = model.predict(X_test)
print(f"\n✅ 예측 완료: {len(y_pred)}개 샘플")

# 5. 모델 평가
mse = mean_squared_error(y_test, y_pred)
rmse = np.sqrt(mse)
r2 = r2_score(y_test, y_pred)

print(f"\n📊 모델 평가 결과:")
print(f"   - Mean Squared Error (MSE): {mse:.4f}")
print(f"   - Root Mean Squared Error (RMSE): {rmse:.4f}")
print(f"   - R² Score: {r2:.4f}")

# 6. 예측 결과 출력
print(f"\n📋 예측 결과 (처음 10개):")
print(f"{'중간고사':<10} {'실제 기말':<12} {'예측 기말':<12} {'오차':<10}")
print("-" * 50)
for i in range(min(10, len(y_test))):
    actual = y_test.iloc[i]
    predicted = y_pred[i]
    error = abs(actual - predicted)
    midterm = X_test.iloc[i, 0]
    print(f"{midterm:<10.0f} {actual:<12.0f} {predicted:<12.2f} {error:<10.2f}")

print("\n" + "=" * 50)
print("Pipeline Complete!")
print("=" * 50)
