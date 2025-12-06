"""
Python Analytics Service
Advanced data science features for the dashboard
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import numpy as np
from sklearn.linear_model import LinearRegression
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
import warnings
warnings.filterwarnings('ignore')

# Try to import statsmodels (optional)
try:
    from statsmodels.tsa.holtwinters import ExponentialSmoothing
    HAS_STATSMODELS = True
except ImportError:
    HAS_STATSMODELS = False
    print("WARNING: statsmodels not installed - exponential smoothing unavailable, using linear only")

app = Flask(__name__)
CORS(app)

# Health check
@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'service': 'analytics'})


# Forecast future values
@app.route('/forecast', methods=['POST'])
def forecast():
    """
    Predict future values based on historical data

    Input:
    {
        "data": [{"date": "2024-01-01", "value": 100}, ...],
        "periods": 3,  # Number of periods to forecast
        "method": "linear" or "exponential"
    }

    Output:
    {
        "forecast": [{"date": "2024-02-01", "value": 105, "lower": 95, "upper": 115}, ...],
        "trend": "increasing" or "decreasing" or "stable",
        "confidence": 0.85
    }
    """
    try:
        data = request.json.get('data', [])
        periods = request.json.get('periods', 3)
        method = request.json.get('method', 'linear')

        if not data or len(data) < 3:
            return jsonify({'error': 'Need at least 3 data points'}), 400

        # Convert to DataFrame
        df = pd.DataFrame(data)
        df['date'] = pd.to_datetime(df['date'])
        df = df.sort_values('date')
        df['time_index'] = range(len(df))

        # Forecast based on method
        if method == 'linear':
            # Linear regression
            X = df[['time_index']].values
            y = df['value'].values

            model = LinearRegression()
            model.fit(X, y)

            # Predict future
            future_indices = np.array([[len(df) + i] for i in range(periods)])
            predictions = model.predict(future_indices)

            # Calculate trend
            slope = model.coef_[0]
            if slope > df['value'].std() * 0.1:
                trend = 'increasing'
            elif slope < -df['value'].std() * 0.1:
                trend = 'decreasing'
            else:
                trend = 'stable'

            # Calculate confidence (R²)
            confidence = model.score(X, y)

            # Generate future dates
            last_date = df['date'].iloc[-1]
            date_diff = df['date'].diff().median()

            forecast_data = []
            for i, pred in enumerate(predictions):
                future_date = last_date + (date_diff * (i + 1))

                # Simple confidence interval (±std)
                std_error = df['value'].std()
                forecast_data.append({
                    'date': future_date.strftime('%Y-%m-%d'),
                    'value': float(pred),
                    'lower': float(pred - std_error),
                    'upper': float(pred + std_error)
                })

        elif method == 'exponential':
            # Exponential smoothing (better for trends)
            if not HAS_STATSMODELS:
                return jsonify({'error': 'Exponential smoothing requires statsmodels. Install with: pip install statsmodels'}), 400

            try:
                model = ExponentialSmoothing(
                    df['value'],
                    seasonal_periods=None,
                    trend='add'
                )
                fitted_model = model.fit()

                predictions = fitted_model.forecast(periods)

                # Calculate trend from fitted values
                fitted_values = fitted_model.fittedvalues
                slope = (fitted_values.iloc[-1] - fitted_values.iloc[0]) / len(fitted_values)

                if slope > df['value'].std() * 0.1:
                    trend = 'increasing'
                elif slope < -df['value'].std() * 0.1:
                    trend = 'decreasing'
                else:
                    trend = 'stable'

                # Confidence based on residuals
                residuals = df['value'] - fitted_values
                confidence = 1 - (residuals.std() / df['value'].std())

                # Generate forecast
                last_date = df['date'].iloc[-1]
                date_diff = df['date'].diff().median()
                std_error = residuals.std()

                forecast_data = []
                for i, pred in enumerate(predictions):
                    future_date = last_date + (date_diff * (i + 1))
                    forecast_data.append({
                        'date': future_date.strftime('%Y-%m-%d'),
                        'value': float(pred),
                        'lower': float(pred - std_error),
                        'upper': float(pred + std_error)
                    })

            except Exception as e:
                # Fall back to linear if exponential fails
                return jsonify({'error': f'Exponential smoothing failed: {str(e)}. Try linear method.'}), 400

        return jsonify({
            'forecast': forecast_data,
            'trend': trend,
            'confidence': float(confidence),
            'method': method
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# Detect anomalies
@app.route('/anomalies', methods=['POST'])
def detect_anomalies():
    """
    Find unusual data points

    Input:
    {
        "data": [{"label": "Product A", "value": 100}, ...],
        "sensitivity": 2.0  # Standard deviations (default 2)
    }

    Output:
    {
        "anomalies": [{"label": "Product X", "value": 500, "z_score": 3.2, "reason": "Much higher than average"}],
        "stats": {"mean": 120, "std": 30}
    }
    """
    try:
        data = request.json.get('data', [])
        sensitivity = request.json.get('sensitivity', 2.0)

        if not data:
            return jsonify({'error': 'No data provided'}), 400

        # Convert to DataFrame
        df = pd.DataFrame(data)
        values = df['value'].values

        # Calculate statistics
        mean = np.mean(values)
        std = np.std(values)

        # Find anomalies
        anomalies = []
        for _, row in df.iterrows():
            z_score = (row['value'] - mean) / std if std > 0 else 0

            if abs(z_score) > sensitivity:
                reason = 'Much higher than average' if z_score > 0 else 'Much lower than average'
                anomalies.append({
                    'label': row['label'],
                    'value': float(row['value']),
                    'z_score': float(z_score),
                    'reason': reason
                })

        return jsonify({
            'anomalies': anomalies,
            'stats': {
                'mean': float(mean),
                'std': float(std),
                'min': float(values.min()),
                'max': float(values.max())
            }
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# Cluster/segment data
@app.route('/cluster', methods=['POST'])
def cluster_data():
    """
    Group similar items together

    Input:
    {
        "data": [{"label": "Item 1", "features": [10, 20, 30]}, ...],
        "num_clusters": 3
    }

    Output:
    {
        "clusters": [
            {"cluster": 0, "items": ["Item 1", "Item 3"], "center": [15, 25, 35]},
            ...
        ]
    }
    """
    try:
        data = request.json.get('data', [])
        num_clusters = request.json.get('num_clusters', 3)

        if not data:
            return jsonify({'error': 'No data provided'}), 400

        # Convert to DataFrame
        df = pd.DataFrame(data)

        # Extract features
        features = np.array([row['features'] for _, row in df.iterrows()])

        # Normalize features
        scaler = StandardScaler()
        features_scaled = scaler.fit_transform(features)

        # Perform clustering
        kmeans = KMeans(n_clusters=num_clusters, random_state=42, n_init=10)
        df['cluster'] = kmeans.fit_predict(features_scaled)

        # Group by cluster
        clusters = []
        for cluster_id in range(num_clusters):
            cluster_df = df[df['cluster'] == cluster_id]
            cluster_center = scaler.inverse_transform([kmeans.cluster_centers_[cluster_id]])[0]

            clusters.append({
                'cluster': int(cluster_id),
                'items': cluster_df['label'].tolist(),
                'size': len(cluster_df),
                'center': cluster_center.tolist()
            })

        return jsonify({'clusters': clusters})

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# Statistical insights
@app.route('/insights', methods=['POST'])
def get_insights():
    """
    Generate statistical insights

    Input:
    {
        "data": [{"category": "A", "value": 100}, ...],
        "group_by": "category"
    }

    Output:
    {
        "insights": [
            {"type": "top_performer", "message": "Category A has 40% more than average"},
            {"type": "correlation", "message": "Strong positive correlation between X and Y"},
            ...
        ],
        "statistics": {...}
    }
    """
    try:
        data = request.json.get('data', [])
        group_by = request.json.get('group_by', None)

        if not data:
            return jsonify({'error': 'No data provided'}), 400

        df = pd.DataFrame(data)
        insights = []

        # Group statistics if requested
        if group_by and group_by in df.columns:
            grouped = df.groupby(group_by)['value'].agg(['mean', 'sum', 'count'])
            overall_mean = df['value'].mean()

            # Find top performer
            top_category = grouped['sum'].idxmax()
            top_value = grouped['sum'].max()
            top_pct = ((top_value / grouped['sum'].sum()) * 100)

            insights.append({
                'type': 'top_performer',
                'category': str(top_category),
                'message': f'{top_category} accounts for {top_pct:.1f}% of total',
                'value': float(top_value)
            })

            # Find categories above/below average
            for cat, row in grouped.iterrows():
                diff_pct = ((row['mean'] - overall_mean) / overall_mean) * 100

                if abs(diff_pct) > 20:  # More than 20% different
                    direction = 'above' if diff_pct > 0 else 'below'
                    insights.append({
                        'type': 'deviation',
                        'category': str(cat),
                        'message': f'{cat} is {abs(diff_pct):.0f}% {direction} average',
                        'difference': float(diff_pct)
                    })

        # Overall statistics
        statistics = {
            'total': float(df['value'].sum()),
            'mean': float(df['value'].mean()),
            'median': float(df['value'].median()),
            'std': float(df['value'].std()),
            'min': float(df['value'].min()),
            'max': float(df['value'].max()),
            'count': int(len(df))
        }

        return jsonify({
            'insights': insights,
            'statistics': statistics
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    print('Python Analytics Service starting...')
    print('Available endpoints:')
    print('   POST /forecast - Predict future values')
    print('   POST /anomalies - Detect unusual data')
    print('   POST /cluster - Segment data into groups')
    print('   POST /insights - Generate statistical insights')
    print('')
    print('Running on http://localhost:5000')
    print('')
    app.run(host='0.0.0.0', port=5000, debug=True)
