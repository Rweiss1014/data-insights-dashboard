// Extracted chart functions for testing
// These mirror the functions in script.js

// Parse a value that might have currency formatting ($1,234.56)
function parseNumericValue(val) {
    if (val == null) return NaN;
    if (typeof val === 'number') return val;
    const cleaned = String(val).replace(/[$€£¥,\s]/g, '').trim();
    return parseFloat(cleaned);
}

// Pivot function
function pivot(data, rowField, colField, valueField, aggType) {
    const rawRowKeys = [...new Set(data.map(row => row[rowField]))].filter(v => v != null);
    const rawColKeys = colField ? [...new Set(data.map(row => row[colField]))].filter(v => v != null) : [null];

    const rowKeys = rawRowKeys;
    const colKeys = colField ? rawColKeys : [null];

    const aggMap = {};

    data.forEach(row => {
        const rowKey = row[rowField];
        const colKey = colField ? row[colField] : null;
        const value = parseNumericValue(row[valueField]);

        if (rowKey == null) return;
        if (colField && colKey == null) return;

        const key = `${rowKey}|||${colKey}`;
        if (!aggMap[key]) {
            aggMap[key] = { sum: 0, count: 0, values: [] };
        }

        if (!isNaN(value)) {
            aggMap[key].sum += value;
            aggMap[key].values.push(value);
        }
        aggMap[key].count++;
    });

    const getValue = (r, c) => {
        const key = `${r}|||${c}`;
        const agg = aggMap[key];
        if (!agg) return null;

        if (aggType === 'sum') return agg.sum;
        if (aggType === 'count') return agg.count;
        if (aggType === 'avg') return agg.values.length > 0 ? agg.sum / agg.values.length : null;
        return null;
    };

    return { rowKeys, colKeys, getValue };
}

// Calculate optimal chart height based on data size and chart type
function calculateChartHeight(rowCount, chartType, isHorizontal = false) {
    const baseHeight = 220;
    const minHeight = 180;
    const maxHeight = 600;

    if (chartType === 'pie' || chartType === 'doughnut') {
        if (rowCount > 10) return Math.min(350 + (rowCount - 10) * 8, maxHeight);
        if (rowCount > 6) return 300;
        return baseHeight;
    }

    if (isHorizontal || chartType === 'horizontalBar') {
        const heightPerBar = 35;
        return Math.max(minHeight, Math.min(rowCount * heightPerBar + 60, maxHeight));
    }

    if (rowCount > 20) return Math.min(300 + (rowCount - 20) * 5, maxHeight);
    if (rowCount > 10) return 280;
    return baseHeight;
}

// Apply filters from query
function applyQueryFilters(data, filters) {
    if (!filters || filters.length === 0) return data;

    const consolidatedFilters = {};
    filters.forEach(filter => {
        if (!filter.column) return;

        const filterValues = filter.values || (filter.value ? [filter.value] : []);
        if (filterValues.length === 0) return;

        if (!consolidatedFilters[filter.column]) {
            consolidatedFilters[filter.column] = [];
        }
        filterValues.forEach(v => {
            const normalized = String(v).toLowerCase().trim();
            if (!consolidatedFilters[filter.column].some(existing => existing.toLowerCase().trim() === normalized)) {
                consolidatedFilters[filter.column].push(v);
            }
        });
    });

    let result = data;
    Object.entries(consolidatedFilters).forEach(([column, values]) => {
        if (values.length > 0) {
            result = result.filter(row => {
                const cellValue = String(row[column] || '').toLowerCase().trim();
                return values.some(v => {
                    const fv = String(v).toLowerCase().trim();
                    return cellValue === fv || cellValue.includes(fv);
                });
            });
        }
    });

    return result;
}

// Prepare pie chart data (simplified for testing)
function preparePieChartData(pivotResult) {
    const { rowKeys, colKeys, getValue } = pivotResult;

    // Sum across ALL colKeys for each rowKey
    const rawData = rowKeys.map((rk, idx) => {
        let totalValue = 0;
        colKeys.forEach(ck => {
            const val = getValue(rk, ck);
            if (val != null) totalValue += val;
        });
        return { label: rk, value: totalValue, idx };
    });

    // Filter out zero values
    const validData = rawData.filter(d => d.value > 0);

    return {
        labels: validData.map(d => d.label),
        data: validData.map(d => d.value),
        total: validData.reduce((sum, d) => sum + d.value, 0)
    };
}

// Prepare bar chart data (simplified for testing)
function prepareBarChartData(pivotResult) {
    const { rowKeys, colKeys, getValue } = pivotResult;

    const safeColKeys = (!colKeys || colKeys.length === 0) ? [null] : colKeys;

    const datasets = safeColKeys.map((ck, idx) => {
        const dataValues = rowKeys.map(rk => {
            const val = getValue(rk, ck);
            return val != null ? val : 0;
        });
        return {
            label: ck != null ? String(ck) : 'Value',
            data: dataValues
        };
    });

    return {
        labels: rowKeys,
        datasets: datasets
    };
}

module.exports = {
    parseNumericValue,
    pivot,
    calculateChartHeight,
    applyQueryFilters,
    preparePieChartData,
    prepareBarChartData
};
