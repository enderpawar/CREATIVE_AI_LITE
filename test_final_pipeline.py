import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LinearRegression, Ridge, Lasso
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.svm import SVR
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix

# ========================================
# ML Pipeline Auto-Generated Code
# ========================================

# Load Data from uploaded CSV: class_score_en.csv
import io
import base64

# Embedded CSV data (uploaded from browser)
csv_content = base64.b64decode('IyBtaWR0ZXJtIChtYXggMTI1KSwgZmluYWwgKG1heCAxMDApDQoxMTMsIDg2DQoxMDQsIDgzDQoxMTAsIDc4DQoxMDEsIDc5DQoxMDEsIDc3DQoxMDMsIDc2DQo3MSwgOTQNCjEwMiwgNzENCjg4LCA3Ng0KMTAxLCA3Mg0KODEsIDc4DQo4NCwgNzgNCjkxLCA3Mg0KMTA3LCA2NQ0KNjQsIDg5DQo3OCwgODYNCjc0LCA3Mw0KMTE3LCA0NQ0KMTAwLCA1NQ0KMTA1LCA1Mw0KNzIsIDg4DQo4NywgNzMNCjQ0LCA3Mw0KNjYsIDgxDQo2NCwgNzANCjg2LCA1MQ0KNjgsIDUyDQo0NywgNjYNCjYzLCA2Ng0KNTEsIDU3DQo2NCwgNDENCjU0LCA0OQ0KNTMsIDQ3DQo5MiwgMjkNCjQ4LCAxOA0KNDIsIDM2DQoyMSwgMjINCjU1LCA1NQ0KNjEsIDI4DQo1MCwgMzUNCjIxLCAwDQo0NSwgMA0KNDIsIDA=').decode('utf-8')
data = pd.read_csv(io.StringIO(csv_content))

# 컬럼명 정리 (공백 및 특수문자 제거)
data.columns = data.columns.str.strip()
data.columns = [col.split('(')[0].strip().replace('#', '').replace(' ', '_').lower() for col in data.columns]

print(f"Data loaded from class_score_en.csv: {data.shape}")
print(f"Columns: {data.columns.tolist()}")
print("\nFirst 5 rows:")
print(data.head())

# 훈련/테스트 데이터 분할
# 목표 변수: 'final'
X = data.drop('final', axis=1)
y = data['final']
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.20, random_state=42
)
print(f"훈련 데이터: {len(X_train)}개, 테스트 데이터: {len(X_test)}개")
print(f"목표 변수: 'final'")

# 모델 훈련 (LinearRegression)
model = LinearRegression()
model.fit(X_train, y_train)
print("모델 훈련 완료: LinearRegression")
print(f"훈련 R² 점수: {model.score(X_train, y_train):.4f}")

# 예측 수행
y_pred = model.predict(X_test)
print(f"예측 완료: {len(y_pred)}개 샘플")
print(f"처음 10개 예측: {y_pred[:10]}")

# 모델 평가 (회귀)
from sklearn.metrics import mean_squared_error, r2_score, mean_absolute_error
mse = mean_squared_error(y_test, y_pred)
rmse = np.sqrt(mse)
mae = mean_absolute_error(y_test, y_pred)
r2 = r2_score(y_test, y_pred)
print(f"Mean Squared Error (MSE): {mse:.4f}")
print(f"Root Mean Squared Error (RMSE): {rmse:.4f}")
print(f"Mean Absolute Error (MAE): {mae:.4f}")
print(f"R² Score: {r2:.4f}")

# ========================================
# Pipeline Complete!
# ========================================
