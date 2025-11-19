import os
import pandas as pd
import numpy as np
import joblib
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS  # <--- NEW IMPORT
from io import BytesIO

# --- Configuration ---
app = Flask(__name__)
# 1. Initialize CORS to allow requests from the React frontend
CORS(app)

MODEL_PATH = 'random_forest_traffic_classifier.pkl'  # Ensure your .pkl file is here

# Mapping the numerical predictions back to labels.
PREDICTION_MAP = {
    0: 'Benign',
    1: 'Bot'
}

# Load the model globally
try:
    MODEL = joblib.load(MODEL_PATH)
    print("ML Model loaded successfully.")
except Exception as e:
    MODEL = None
    print(f"ERROR loading model: {e}")


# --- Flask Routes ---

@app.route('/', methods=['GET']) # <--- ADDED BASE ROUTE
def home():
    """A simple status check for the backend."""
    return "Cyber Threat Prediction Backend Backend is Running!"


@app.route('/api/predict', methods=['POST'])
def predict_csv():
    if MODEL is None:
        return jsonify({'error': 'Prediction model is not loaded.'}), 503

    if 'file' not in request.files or not request.files['file'].filename:
        # Check for empty file object or missing 'file' key
        return jsonify({'error': 'No file part or selected file in the request.'}), 400

    file = request.files['file']

    try:
        file_stream = file.stream
        file_stream.seek(0)
        df_input = pd.read_csv(file_stream)

        # Keep a copy of the original data before dropping rows
        df_original = df_input.copy()

        # --- Data Preprocessing (Matching your script) ---
        # 1. Column Cleaning
        df_input.columns = df_input.columns.str.strip()

        # 2. Infinity/NaN Replacement
        df_input.replace([np.inf, -np.inf], np.nan, inplace=True)

        # 3. Handle Missing Values (Rows will be dropped here)
        df_input.dropna(inplace=True)

        # 4. Drop non-numeric features (Categorical features must be removed
        object_cols = df_input.select_dtypes(include=['object']).columns
        if len(object_cols) > 0:
            df_input.drop(columns=object_cols, inplace=True)

        # Ensure we only predict on the rows that were NOT dropped
        rows_to_keep_index = df_input.index
        df_original_clean = df_original.loc[rows_to_keep_index].copy()

        # 5. Make Predictions
        predictions_encoded = MODEL.predict(df_input)

        # 6. Map to Labels and Create Output DataFrame
        y_predictions_labels = pd.Series(predictions_encoded).map(PREDICTION_MAP)

        # 7. Add the prediction column to the cleaned version of the original data
        df_original_clean['Predicted_Label'] = y_predictions_labels

        # 8. Prepare for download
        buffer = BytesIO()
        df_original_clean.to_csv(buffer, index=False)
        buffer.seek(0)

        return send_file(
            buffer,
            mimetype='text/csv',
            as_attachment=True,
            download_name='classified_packets.csv'
        )

    except KeyError as e:
        return jsonify({'error': f'Missing expected column in CSV: {e}. Check your input data format.'}), 400
    except Exception as e:
        print(f"Prediction Error: {e}")
        return jsonify({'error': f'An error occurred during prediction: {str(e)}'}), 500


if __name__ == '__main__':
    app.run(debug=True, host='127.0.0.1', port=5000)