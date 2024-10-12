from flask_cors import CORS
from flask import Flask, jsonify, request
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import OneHotEncoder
from sklearn.linear_model import LinearRegression
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer

app = Flask(__name__)
CORS(app)

sales_df = pd.read_csv('data/sales_data.csv')

cleaned_sales_df = sales_df[(sales_df['Date of Sale'] != 'Total') & (sales_df['Date of Sale'] != 'Grand Total')]

cleaned_sales_df['Date of Sale'] = pd.to_datetime(cleaned_sales_df['Date of Sale'])

cleaned_sales_df.rename(columns={'Menu Name': 'Item Name'}, inplace=True)

cleaned_sales_df = cleaned_sales_df[cleaned_sales_df['Item Name'] != 'Frank Roll']

cleaned_sales_df['DayOfWeek'] = cleaned_sales_df['Date of Sale'].dt.day_name()

features = ['Item Name', 'DayOfWeek']
target = 'Sales Quantity'

preprocessor = ColumnTransformer(
    transformers=[
        ('cat', OneHotEncoder(handle_unknown='ignore'), features)
    ])

model = Pipeline(steps=[
    ('preprocessor', preprocessor),
    ('regressor', LinearRegression())
])

X = cleaned_sales_df[features]
y = cleaned_sales_df[target]
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2)

model.fit(X_train, y_train)

def predict_sales_quantity(item_name, day_of_week):
    input_data = pd.DataFrame({'Item Name': [item_name], 'DayOfWeek': [day_of_week]})
    predicted_quantity = model.predict(input_data)
    return max(1, predicted_quantity[0]) 

items = cleaned_sales_df['Item Name'].unique()
days_of_week = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

recommendation_records = []

for item in items:
    for day in days_of_week:
        predicted_quantity = predict_sales_quantity(item, day)
        recommendation_records.append({
            'Item Name': item,
            'DayOfWeek': day,
            'Recommended Production': np.ceil(predicted_quantity)
        })

recommendations = pd.DataFrame(recommendation_records)

recommendations = recommendations.sort_values(by='Recommended Production', ascending=False)

@app.route('/recommendations/<day>', methods=['GET'])
def get_recommendations(day):
    if day.capitalize() not in days_of_week:
        return jsonify({"error": "Invalid day of the week"}), 400
    
    day_recommendations = recommendations[recommendations['DayOfWeek'] == day.capitalize()]
    return jsonify(day_recommendations.to_dict(orient='records'))

@app.route('/predict', methods=['POST'])
def predict():
    json_data = request.get_json()
    input_df = pd.DataFrame(json_data)
    
    preprocessed_data = input_df.copy()  
    predictions = model.predict(preprocessed_data)
    predictions = [max(1, pred) for pred in predictions] 
    
    return jsonify(predictions)

if __name__ == '__main__':
    app.run(debug=True)