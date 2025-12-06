// ANALYTICS HANDLERS - Append to script.js

async function handleForecast() {
    if (!lastPivotResult || !lastPivotMeta) {
        showAlert('Create a chart first, then use forecasting.', 'warning');
        return;
    }

    showAlert('🔮 Forecasting...', 'info');
    const result = await callAnalytics('/analytics/forecast');
    if (result) {
        alert(`Trend: ${result.trend}\nConfidence: ${(result.confidence * 100).toFixed(0)}%\n\nNext 3 predictions:\n` +
            result.forecast.map((f, i) => `${i+1}: ${f.value.toFixed(0)}`).join('\n'));
    }
}

async function handleAnomalies() {
    if (!lastPivotResult || !lastPivotMeta) {
        showAlert('Create a chart first, then detect anomalies.', 'warning');
        return;
    }

    showAlert('🔍 Finding outliers...', 'info');
    const result = await callAnalytics('/analytics/anomalies');
    if (result) {
        if (result.anomalies.length === 0) {
            alert('No anomalies found - all values are normal!');
        } else {
            alert(`Found ${result.anomalies.length} outliers:\n\n` +
                result.anomalies.map(a => `${a.label}: ${a.value.toFixed(0)} (${a.reason})`).join('\n'));
        }
    }
}

async function handleCluster() {
    showAlert('Clustering feature coming soon!', 'info');
}

async function handleInsights() {
    if (!lastPivotResult || !lastPivotMeta) {
        showAlert('Create a chart first, then get insights.', 'warning');
        return;
    }

    showAlert('💡 Generating insights...', 'info');
    const result = await callAnalytics('/analytics/insights');
    if (result) {
        alert(`Key Insights:\n\n` +
            result.insights.map(i => i.message).join('\n') +
            `\n\nTotal: ${result.statistics.total.toFixed(0)}\nAverage: ${result.statistics.mean.toFixed(0)}`);
    }
}

async function callAnalytics(endpoint) {
    try {
        const { rowKeys, getValue, colKeys } = lastPivotResult;
        let data;

        if (endpoint.includes('forecast')) {
            data = { data: rowKeys.map((rk, i) => ({ date: `2024-${i+1}-01`, value: getValue(rk, colKeys[0]) || 0 })), periods: 3, method: 'linear' };
        } else {
            data = { data: rowKeys.map(rk => ({ label: rk, value: getValue(rk, colKeys[0]) || 0, category: rk })), group_by: 'category' };
        }

        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error);

        showAlert('✅ Analysis complete!', 'success');
        return result;
    } catch (error) {
        showAlert(`Error: ${error.message}`, 'error');
        return null;
    }
}
