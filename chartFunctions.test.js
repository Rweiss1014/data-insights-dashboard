const {
    parseNumericValue,
    pivot,
    calculateChartHeight,
    applyQueryFilters,
    preparePieChartData,
    prepareBarChartData
} = require('./chartFunctions');

// Sample test data
const sampleData = [
    { Product: 'Cookies', Region: 'North', Sales: 100, Quantity: 10 },
    { Product: 'Cookies', Region: 'South', Sales: 150, Quantity: 15 },
    { Product: 'Cookies', Region: 'East', Sales: 200, Quantity: 20 },
    { Product: 'Brownies', Region: 'North', Sales: 80, Quantity: 8 },
    { Product: 'Brownies', Region: 'South', Sales: 120, Quantity: 12 },
    { Product: 'Brownies', Region: 'East', Sales: 90, Quantity: 9 },
    { Product: 'Cake', Region: 'North', Sales: 300, Quantity: 5 },
    { Product: 'Cake', Region: 'South', Sales: 250, Quantity: 4 },
    { Product: 'Cake', Region: 'East', Sales: 350, Quantity: 6 }
];

// ============================================
// parseNumericValue tests
// ============================================
describe('parseNumericValue', () => {
    test('parses regular numbers', () => {
        expect(parseNumericValue(100)).toBe(100);
        expect(parseNumericValue(3.14)).toBe(3.14);
    });

    test('parses string numbers', () => {
        expect(parseNumericValue('100')).toBe(100);
        expect(parseNumericValue('3.14')).toBe(3.14);
    });

    test('parses currency formatted values', () => {
        expect(parseNumericValue('$1,234.56')).toBe(1234.56);
        expect(parseNumericValue('$100')).toBe(100);
        expect(parseNumericValue('€500')).toBe(500);
    });

    test('handles null and undefined', () => {
        expect(parseNumericValue(null)).toBeNaN();
        expect(parseNumericValue(undefined)).toBeNaN();
    });

    test('handles invalid strings', () => {
        expect(parseNumericValue('abc')).toBeNaN();
    });
});

// ============================================
// pivot tests
// ============================================
describe('pivot', () => {
    test('aggregates with sum correctly', () => {
        const result = pivot(sampleData, 'Product', null, 'Sales', 'sum');

        expect(result.rowKeys).toContain('Cookies');
        expect(result.rowKeys).toContain('Brownies');
        expect(result.rowKeys).toContain('Cake');

        // Cookies: 100 + 150 + 200 = 450
        expect(result.getValue('Cookies', null)).toBe(450);
        // Brownies: 80 + 120 + 90 = 290
        expect(result.getValue('Brownies', null)).toBe(290);
        // Cake: 300 + 250 + 350 = 900
        expect(result.getValue('Cake', null)).toBe(900);
    });

    test('aggregates with count correctly', () => {
        const result = pivot(sampleData, 'Product', null, 'Sales', 'count');

        expect(result.getValue('Cookies', null)).toBe(3);
        expect(result.getValue('Brownies', null)).toBe(3);
        expect(result.getValue('Cake', null)).toBe(3);
    });

    test('aggregates with avg correctly', () => {
        const result = pivot(sampleData, 'Product', null, 'Sales', 'avg');

        // Cookies: (100 + 150 + 200) / 3 = 150
        expect(result.getValue('Cookies', null)).toBe(150);
        // Brownies: (80 + 120 + 90) / 3 = 96.67
        expect(result.getValue('Brownies', null)).toBeCloseTo(96.67, 1);
        // Cake: (300 + 250 + 350) / 3 = 300
        expect(result.getValue('Cake', null)).toBe(300);
    });

    test('handles colField grouping', () => {
        const result = pivot(sampleData, 'Product', 'Region', 'Sales', 'sum');

        expect(result.colKeys).toContain('North');
        expect(result.colKeys).toContain('South');
        expect(result.colKeys).toContain('East');

        expect(result.getValue('Cookies', 'North')).toBe(100);
        expect(result.getValue('Cookies', 'South')).toBe(150);
        expect(result.getValue('Brownies', 'East')).toBe(90);
    });

    test('returns null for non-existent combinations', () => {
        const result = pivot(sampleData, 'Product', 'Region', 'Sales', 'sum');
        expect(result.getValue('NonExistent', 'North')).toBeNull();
    });
});

// ============================================
// calculateChartHeight tests
// ============================================
describe('calculateChartHeight', () => {
    test('returns base height for small datasets', () => {
        expect(calculateChartHeight(5, 'bar')).toBe(220);
        expect(calculateChartHeight(5, 'line')).toBe(220);
        expect(calculateChartHeight(5, 'pie')).toBe(220);
    });

    test('increases height for pie charts with many items', () => {
        expect(calculateChartHeight(7, 'pie')).toBe(300);
        expect(calculateChartHeight(15, 'pie')).toBe(390); // 350 + (15-10)*8
    });

    test('scales horizontal bar charts by bar count', () => {
        // 10 bars * 35 + 60 = 410
        expect(calculateChartHeight(10, 'horizontalBar')).toBe(410);
        // 5 bars * 35 + 60 = 235
        expect(calculateChartHeight(5, 'horizontalBar')).toBe(235);
    });

    test('respects max height limit', () => {
        expect(calculateChartHeight(100, 'pie')).toBe(600);
        expect(calculateChartHeight(100, 'horizontalBar')).toBe(600);
    });

    test('respects min height limit', () => {
        expect(calculateChartHeight(1, 'horizontalBar')).toBe(180);
    });
});

// ============================================
// applyQueryFilters tests
// ============================================
describe('applyQueryFilters', () => {
    test('returns original data when no filters', () => {
        const result = applyQueryFilters(sampleData, []);
        expect(result.length).toBe(9);
    });

    test('filters by single value', () => {
        const filters = [{ column: 'Product', value: 'Cookies' }];
        const result = applyQueryFilters(sampleData, filters);

        expect(result.length).toBe(3);
        expect(result.every(r => r.Product === 'Cookies')).toBe(true);
    });

    test('filters by multiple values (OR within column)', () => {
        const filters = [{ column: 'Product', values: ['Cookies', 'Cake'] }];
        const result = applyQueryFilters(sampleData, filters);

        expect(result.length).toBe(6);
        expect(result.every(r => r.Product === 'Cookies' || r.Product === 'Cake')).toBe(true);
    });

    test('filters by multiple columns (AND across columns)', () => {
        const filters = [
            { column: 'Product', value: 'Cookies' },
            { column: 'Region', value: 'North' }
        ];
        const result = applyQueryFilters(sampleData, filters);

        expect(result.length).toBe(1);
        expect(result[0].Product).toBe('Cookies');
        expect(result[0].Region).toBe('North');
    });

    test('is case-insensitive', () => {
        const filters = [{ column: 'Product', value: 'cookies' }];
        const result = applyQueryFilters(sampleData, filters);

        expect(result.length).toBe(3);
    });
});

// ============================================
// preparePieChartData tests
// ============================================
describe('preparePieChartData', () => {
    test('sums across all colKeys for pie chart', () => {
        const pivotResult = pivot(sampleData, 'Product', 'Region', 'Sales', 'sum');
        const pieData = preparePieChartData(pivotResult);

        // Should sum all regions for each product
        expect(pieData.labels).toContain('Cookies');
        expect(pieData.labels).toContain('Brownies');
        expect(pieData.labels).toContain('Cake');

        const cookiesIndex = pieData.labels.indexOf('Cookies');
        const browniesIndex = pieData.labels.indexOf('Brownies');
        const cakeIndex = pieData.labels.indexOf('Cake');

        // Cookies: 100 + 150 + 200 = 450
        expect(pieData.data[cookiesIndex]).toBe(450);
        // Brownies: 80 + 120 + 90 = 290
        expect(pieData.data[browniesIndex]).toBe(290);
        // Cake: 300 + 250 + 350 = 900
        expect(pieData.data[cakeIndex]).toBe(900);

        // Total should be 450 + 290 + 900 = 1640
        expect(pieData.total).toBe(1640);
    });

    test('filters out zero values', () => {
        const dataWithZero = [
            { Product: 'A', Sales: 100 },
            { Product: 'B', Sales: 0 },
            { Product: 'C', Sales: 50 }
        ];
        const pivotResult = pivot(dataWithZero, 'Product', null, 'Sales', 'sum');
        const pieData = preparePieChartData(pivotResult);

        expect(pieData.labels).toContain('A');
        expect(pieData.labels).toContain('C');
        expect(pieData.labels).not.toContain('B');
    });

    test('handles single colKey (no secondary grouping)', () => {
        const pivotResult = pivot(sampleData, 'Product', null, 'Sales', 'sum');
        const pieData = preparePieChartData(pivotResult);

        expect(pieData.labels.length).toBe(3);
        expect(pieData.total).toBe(1640); // 450 + 290 + 900
    });
});

// ============================================
// prepareBarChartData tests
// ============================================
describe('prepareBarChartData', () => {
    test('creates separate datasets for each colKey', () => {
        const pivotResult = pivot(sampleData, 'Product', 'Region', 'Sales', 'sum');
        const barData = prepareBarChartData(pivotResult);

        expect(barData.labels).toEqual(['Cookies', 'Brownies', 'Cake']);
        expect(barData.datasets.length).toBe(3); // North, South, East

        const northDataset = barData.datasets.find(d => d.label === 'North');
        expect(northDataset.data).toEqual([100, 80, 300]);
    });

    test('handles no colField (single dataset)', () => {
        const pivotResult = pivot(sampleData, 'Product', null, 'Sales', 'sum');
        const barData = prepareBarChartData(pivotResult);

        expect(barData.datasets.length).toBe(1);
        expect(barData.datasets[0].label).toBe('Value');
        expect(barData.datasets[0].data).toEqual([450, 290, 900]);
    });

    test('converts null values to 0', () => {
        const sparseData = [
            { Product: 'A', Region: 'X', Sales: 100 },
            { Product: 'B', Region: 'Y', Sales: 200 }
        ];
        const pivotResult = pivot(sparseData, 'Product', 'Region', 'Sales', 'sum');
        const barData = prepareBarChartData(pivotResult);

        // Product A has no data for Region Y, should be 0
        // Product B has no data for Region X, should be 0
        barData.datasets.forEach(dataset => {
            dataset.data.forEach(value => {
                expect(typeof value).toBe('number');
                expect(value).not.toBeNull();
            });
        });
    });
});

// ============================================
// Integration tests
// ============================================
describe('Integration: Full chart data flow', () => {
    test('filtered data produces correct pie chart', () => {
        const filters = [{ column: 'Region', value: 'North' }];
        const filteredData = applyQueryFilters(sampleData, filters);
        const pivotResult = pivot(filteredData, 'Product', null, 'Sales', 'sum');
        const pieData = preparePieChartData(pivotResult);

        // Only North region data
        expect(pieData.total).toBe(480); // 100 + 80 + 300
    });

    test('filtered data produces correct bar chart', () => {
        const filters = [{ column: 'Product', values: ['Cookies', 'Cake'] }];
        const filteredData = applyQueryFilters(sampleData, filters);
        const pivotResult = pivot(filteredData, 'Region', null, 'Sales', 'sum');
        const barData = prepareBarChartData(pivotResult);

        expect(barData.labels.length).toBe(3); // North, South, East
        // North: 100 + 300 = 400
        // South: 150 + 250 = 400
        // East: 200 + 350 = 550
        expect(barData.datasets[0].data).toContain(400);
        expect(barData.datasets[0].data).toContain(550);
    });
});
