// =============================================
// ROBUST PATTERN RECOGNITION SYSTEM
// Learns from Excel files and applies knowledge to new files
// =============================================

// Column type categories for semantic matching
const COLUMN_SEMANTICS = {
    person: {
        keywords: ['name', 'employee', 'person', 'user', 'staff', 'member', 'salesperson', 'rep', 'agent', 'owner', 'manager', 'lead', 'assigned'],
        patterns: [/^(first|last|full)?[\s_]?name$/i, /employee/i, /person/i]
    },
    role: {
        keywords: ['role', 'title', 'position', 'job', 'function', 'designation', 'level', 'rank'],
        patterns: [/role/i, /title/i, /position/i, /job/i]
    },
    location: {
        keywords: ['location', 'region', 'city', 'state', 'country', 'office', 'site', 'area', 'branch', 'territory', 'zone', 'address'],
        patterns: [/location/i, /region/i, /city/i, /state/i, /country/i, /office/i]
    },
    time: {
        keywords: ['date', 'time', 'month', 'day', 'year', 'period', 'week', 'quarter', 'fiscal', 'calendar'],
        patterns: [/date/i, /time/i, /month/i, /week/i, /period/i, /quarter/i, /year/i]
    },
    quantity: {
        keywords: ['hours', 'count', 'quantity', 'amount', 'total', 'sum', 'number', 'units', 'volume'],
        patterns: [/hours?$/i, /count$/i, /qty/i, /quantity/i, /amount/i, /total/i, /num(ber)?/i]
    },
    percentage: {
        keywords: ['percent', 'rate', 'ratio', '%', 'utilization', 'efficiency', 'performance'],
        patterns: [/%/i, /percent/i, /rate$/i, /ratio/i, /utilization/i]
    },
    money: {
        keywords: ['price', 'cost', 'revenue', 'sales', 'budget', 'expense', 'profit', 'margin', 'dollar', 'amount'],
        patterns: [/price/i, /cost/i, /revenue/i, /sales/i, /budget/i, /\$/]
    },
    category: {
        keywords: ['category', 'type', 'group', 'class', 'segment', 'department', 'division', 'team', 'unit'],
        patterns: [/category/i, /type$/i, /group/i, /class/i, /segment/i, /department/i]
    },
    status: {
        keywords: ['status', 'stage', 'phase', 'priority', 'state', 'condition', 'progress'],
        patterns: [/status/i, /stage/i, /phase/i, /priority/i, /state$/i]
    },
    identifier: {
        keywords: ['id', 'code', 'number', 'key', 'reference', 'sku', 'part'],
        patterns: [/^id$/i, /_id$/i, /code$/i, /number$/i, /ref/i, /sku/i]
    },
    project: {
        keywords: ['project', 'task', 'activity', 'work', 'assignment', 'initiative'],
        patterns: [/project/i, /task/i, /activity/i, /assignment/i]
    },
    description: {
        keywords: ['description', 'notes', 'comments', 'details', 'remarks', 'summary'],
        patterns: [/description/i, /notes?$/i, /comments?$/i, /details?$/i]
    }
};

// Sheet type patterns
const SHEET_TYPE_PATTERNS = {
    template: {
        namePatterns: [/template/i, /blank/i, /empty/i, /sample/i],
        characteristics: { hasFormulas: true, lowDataDensity: true }
    },
    dashboard: {
        namePatterns: [/dashboard/i, /summary/i, /overview/i, /report/i],
        characteristics: { hasCharts: true, hasPivots: true }
    },
    database: {
        namePatterns: [/^db$/i, /database/i, /data$/i, /^raw/i, /export/i],
        characteristics: { highRowCount: true, consistentColumns: true }
    },
    metadata: {
        namePatterns: [/meta/i, /config/i, /settings/i, /lookup/i, /reference/i],
        characteristics: { lowRowCount: true, keyValuePairs: true }
    },
    instructions: {
        namePatterns: [/instruction/i, /help/i, /readme/i, /guide/i, /how.?to/i],
        characteristics: { textHeavy: true, lowDataDensity: true }
    },
    monthlyData: {
        namePatterns: [/jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec/i, /q[1-4]/i, /\d{4}/],
        characteristics: { hasDatePattern: true }
    }
};

/**
 * Create a comprehensive fingerprint of an Excel file
 */
function createFileFingerprint(workbook, rawSheetData) {
    const fingerprint = {
        version: 2,
        createdAt: new Date().toISOString(),
        sheets: [],
        globalFeatures: {
            sheetCount: workbook.SheetNames.length,
            totalRows: 0,
            hasTemplateSheet: false,
            hasDashboardSheet: false,
            hasDbSheet: false,
            sheetNamePattern: null
        }
    };

    // Analyze each sheet
    workbook.SheetNames.forEach((sheetName, idx) => {
        const rawData = rawSheetData[sheetName] || [];
        const sheetFingerprint = createSheetFingerprint(sheetName, rawData);
        fingerprint.sheets.push(sheetFingerprint);
        fingerprint.globalFeatures.totalRows += sheetFingerprint.rowCount;

        // Track global features
        if (sheetFingerprint.sheetType === 'template') fingerprint.globalFeatures.hasTemplateSheet = true;
        if (sheetFingerprint.sheetType === 'dashboard') fingerprint.globalFeatures.hasDashboardSheet = true;
        if (sheetFingerprint.sheetType === 'database') fingerprint.globalFeatures.hasDbSheet = true;
    });

    // Detect sheet naming pattern (e.g., monthly sheets)
    fingerprint.globalFeatures.sheetNamePattern = detectSheetNamePattern(workbook.SheetNames);

    return fingerprint;
}

/**
 * Create fingerprint for a single sheet
 */
function createSheetFingerprint(sheetName, rawData) {
    const fingerprint = {
        name: sheetName,
        sheetType: detectSheetType(sheetName, rawData),
        rowCount: rawData.length,
        columns: [],
        structure: {
            headerRowIndex: -1,
            dataStartRow: -1,
            hasRepeatingColumns: false,
            repeatingPattern: null,
            columnCount: 0,
            dataDensity: 0
        },
        semanticProfile: {}
    };

    if (rawData.length === 0) return fingerprint;

    // Find header row
    const headerInfo = findHeaderRow(rawData);
    fingerprint.structure.headerRowIndex = headerInfo.rowIndex;
    fingerprint.structure.dataStartRow = headerInfo.rowIndex + 1;

    const headerRow = rawData[headerInfo.rowIndex] || [];
    fingerprint.structure.columnCount = headerRow.length;

    // Analyze columns
    headerRow.forEach((colName, idx) => {
        if (colName == null || String(colName).trim() === '') return;

        const cleanName = String(colName).trim();
        const colFingerprint = analyzeColumn(cleanName, rawData, headerInfo.rowIndex, idx);
        fingerprint.columns.push(colFingerprint);

        // Build semantic profile
        if (colFingerprint.semanticType) {
            if (!fingerprint.semanticProfile[colFingerprint.semanticType]) {
                fingerprint.semanticProfile[colFingerprint.semanticType] = [];
            }
            fingerprint.semanticProfile[colFingerprint.semanticType].push(cleanName);
        }
    });

    // Detect repeating column pattern
    const repeatPattern = detectRepeatingColumnPattern(headerRow);
    if (repeatPattern) {
        fingerprint.structure.hasRepeatingColumns = true;
        fingerprint.structure.repeatingPattern = repeatPattern;
    }

    // Calculate data density
    fingerprint.structure.dataDensity = calculateDataDensity(rawData, headerInfo.rowIndex);

    return fingerprint;
}

/**
 * Find the header row in raw data
 */
function findHeaderRow(rawData) {
    if (!rawData || rawData.length === 0) return { rowIndex: 0, confidence: 0 };

    let bestRowIndex = 0;
    let bestScore = 0;

    for (let i = 0; i < Math.min(10, rawData.length); i++) {
        const row = rawData[i] || [];
        let score = 0;

        // Count string values (headers are usually strings)
        const stringCount = row.filter(v => typeof v === 'string' && v.trim().length > 0).length;
        score += stringCount * 2;

        // Check if values look like column names (not data)
        const columnNameCount = row.filter(v => {
            if (typeof v !== 'string') return false;
            const s = v.trim().toLowerCase();
            // Column names are usually short, capitalized, without numbers
            return s.length > 0 && s.length < 50 && !/^\d+$/.test(s) && !/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(s);
        }).length;
        score += columnNameCount;

        // Penalize rows with many numbers (likely data rows)
        const numberCount = row.filter(v => typeof v === 'number').length;
        score -= numberCount;

        // Bonus for rows where next row has data
        if (i + 1 < rawData.length) {
            const nextRow = rawData[i + 1] || [];
            const nextHasData = nextRow.some(v => v != null && v !== '');
            if (nextHasData) score += 3;
        }

        if (score > bestScore) {
            bestScore = score;
            bestRowIndex = i;
        }
    }

    return { rowIndex: bestRowIndex, confidence: bestScore / 20 };
}

/**
 * Analyze a single column
 */
function analyzeColumn(columnName, rawData, headerRowIndex, colIndex) {
    const analysis = {
        name: columnName,
        normalizedName: normalizeColumnName(columnName),
        semanticType: detectSemanticType(columnName),
        dataType: 'unknown',
        sampleValues: [],
        statistics: {
            nullCount: 0,
            uniqueCount: 0,
            numericCount: 0,
            stringCount: 0
        }
    };

    // Sample data from this column
    const values = [];
    for (let i = headerRowIndex + 1; i < Math.min(headerRowIndex + 100, rawData.length); i++) {
        const row = rawData[i];
        if (row && row[colIndex] !== undefined) {
            values.push(row[colIndex]);
        }
    }

    // Analyze values
    const typeCount = { string: 0, number: 0, date: 0, null: 0 };
    const uniqueValues = new Set();

    values.forEach(v => {
        if (v == null || v === '') {
            typeCount.null++;
        } else if (typeof v === 'number') {
            typeCount.number++;
            uniqueValues.add(v);
        } else if (v instanceof Date) {
            typeCount.date++;
            uniqueValues.add(v.toISOString());
        } else {
            typeCount.string++;
            uniqueValues.add(String(v));
        }
    });

    analysis.statistics.nullCount = typeCount.null;
    analysis.statistics.numericCount = typeCount.number;
    analysis.statistics.stringCount = typeCount.string;
    analysis.statistics.uniqueCount = uniqueValues.size;

    // Determine data type
    const total = values.length - typeCount.null;
    if (total === 0) {
        analysis.dataType = 'empty';
    } else if (typeCount.number / total > 0.8) {
        analysis.dataType = isExcelDateColumn(values) ? 'date' : 'number';
    } else if (typeCount.string / total > 0.8) {
        analysis.dataType = 'string';
    } else if (typeCount.date / total > 0.8) {
        analysis.dataType = 'date';
    } else {
        analysis.dataType = 'mixed';
    }

    // Store sample values
    analysis.sampleValues = Array.from(uniqueValues).slice(0, 5);

    return analysis;
}

/**
 * Normalize column name for comparison
 */
function normalizeColumnName(name) {
    return String(name)
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '') // Remove special chars
        .replace(/\d+$/, ''); // Remove trailing numbers (Excel's auto-numbering)
}

/**
 * Detect semantic type of a column based on its name
 */
function detectSemanticType(columnName) {
    const nameLower = columnName.toLowerCase();

    for (const [type, config] of Object.entries(COLUMN_SEMANTICS)) {
        // Check keywords
        if (config.keywords.some(kw => nameLower.includes(kw))) {
            return type;
        }
        // Check patterns
        if (config.patterns.some(pattern => pattern.test(columnName))) {
            return type;
        }
    }

    return null;
}

/**
 * Detect sheet type based on name and content
 */
function detectSheetType(sheetName, rawData) {
    const nameLower = sheetName.toLowerCase();

    for (const [type, config] of Object.entries(SHEET_TYPE_PATTERNS)) {
        if (config.namePatterns.some(pattern => pattern.test(sheetName))) {
            return type;
        }
    }

    // Check data characteristics
    if (rawData.length > 100) {
        // Many rows suggests data sheet
        return 'data';
    }

    if (rawData.length < 10) {
        return 'sparse';
    }

    return 'unknown';
}

/**
 * Detect if sheet names follow a pattern (e.g., monthly)
 */
function detectSheetNamePattern(sheetNames) {
    const monthPattern = /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i;
    const yearPattern = /\d{4}/;
    const quarterPattern = /q[1-4]/i;

    const monthMatches = sheetNames.filter(n => monthPattern.test(n)).length;
    const yearMatches = sheetNames.filter(n => yearPattern.test(n)).length;
    const quarterMatches = sheetNames.filter(n => quarterPattern.test(n)).length;

    if (monthMatches >= 2) return 'monthly';
    if (quarterMatches >= 2) return 'quarterly';
    if (yearMatches >= 2) return 'yearly';

    return null;
}

/**
 * Detect repeating column pattern (for wide-to-long transformation)
 */
function detectRepeatingColumnPattern(headerRow) {
    const colNames = headerRow.map(h => h != null ? String(h).trim() : '');

    // Normalize names (remove trailing numbers)
    const normalizeColName = (name) => name.replace(/\d+$/, '').trim();

    // Count occurrences of normalized names
    const colCounts = {};
    colNames.forEach((name, idx) => {
        if (name && name.length > 0) {
            const normalized = normalizeColName(name);
            if (!colCounts[normalized]) colCounts[normalized] = [];
            colCounts[normalized].push({ idx, originalName: name });
        }
    });

    // Find columns that repeat
    let repeatingCol = null;
    let repeatPositions = [];

    for (const [name, entries] of Object.entries(colCounts)) {
        if (entries.length >= 2 && entries.length <= 20) {
            const positions = entries.map(e => e.idx);
            // Check if evenly spaced
            const gaps = [];
            for (let i = 1; i < positions.length; i++) {
                gaps.push(positions[i] - positions[i - 1]);
            }
            const allSameGap = gaps.every(g => g === gaps[0]);
            if (allSameGap && gaps[0] >= 2) {
                repeatingCol = name;
                repeatPositions = positions;
                break;
            }
        }
    }

    if (!repeatingCol || repeatPositions.length < 2) return null;

    const gap = repeatPositions[1] - repeatPositions[0];
    const firstRepeatStart = repeatPositions[0];

    return {
        anchorColumn: repeatingCol,
        repeatCount: repeatPositions.length,
        gap: gap,
        startIndex: firstRepeatStart,
        fixedColumnCount: firstRepeatStart,
        repeatingColumns: colNames.slice(firstRepeatStart, firstRepeatStart + gap).map(normalizeColName)
    };
}

/**
 * Check if numeric values look like Excel serial dates
 */
function isExcelDateColumn(values) {
    const numericValues = values.filter(v => typeof v === 'number');
    if (numericValues.length === 0) return false;

    // Excel dates for 2000-2100 are roughly between 36526 and 73050
    const dateRangeCount = numericValues.filter(v => v > 30000 && v < 80000).length;
    return dateRangeCount / numericValues.length > 0.8;
}

/**
 * Calculate data density (percentage of non-empty cells)
 */
function calculateDataDensity(rawData, headerRowIndex) {
    if (rawData.length <= headerRowIndex + 1) return 0;

    let totalCells = 0;
    let filledCells = 0;

    for (let i = headerRowIndex + 1; i < Math.min(headerRowIndex + 50, rawData.length); i++) {
        const row = rawData[i] || [];
        row.forEach(cell => {
            totalCells++;
            if (cell != null && cell !== '') filledCells++;
        });
    }

    return totalCells > 0 ? filledCells / totalCells : 0;
}

/**
 * Calculate similarity between two fingerprints
 */
function calculateFingerprintSimilarity(fp1, fp2) {
    let score = 0;
    let maxScore = 0;

    // Compare semantic profiles
    const allTypes = new Set([
        ...Object.keys(fp1.semanticProfile || {}),
        ...Object.keys(fp2.semanticProfile || {})
    ]);

    for (const type of allTypes) {
        maxScore += 10;
        const cols1 = fp1.semanticProfile?.[type] || [];
        const cols2 = fp2.semanticProfile?.[type] || [];

        if (cols1.length > 0 && cols2.length > 0) {
            // Both have this type
            score += 8;

            // Check for similar column names
            const normalized1 = cols1.map(normalizeColumnName);
            const normalized2 = cols2.map(normalizeColumnName);
            const overlap = normalized1.filter(n => normalized2.includes(n)).length;
            if (overlap > 0) score += 2;
        } else if (cols1.length === 0 && cols2.length === 0) {
            // Neither has this type
            score += 5;
        }
    }

    // Compare structure
    maxScore += 20;
    if (fp1.structure?.hasRepeatingColumns === fp2.structure?.hasRepeatingColumns) {
        score += 10;
    }
    if (fp1.structure?.repeatingPattern && fp2.structure?.repeatingPattern) {
        const rp1 = fp1.structure.repeatingPattern;
        const rp2 = fp2.structure.repeatingPattern;
        if (rp1.gap === rp2.gap) score += 5;
        if (rp1.fixedColumnCount === rp2.fixedColumnCount) score += 5;
    }

    return maxScore > 0 ? score / maxScore : 0;
}

/**
 * Find the best data sheet to use
 */
function findBestDataSheet(fingerprint) {
    if (!fingerprint.sheets || fingerprint.sheets.length === 0) return null;

    // Priority: database > data > monthlyData > unknown
    const priorities = {
        database: 100,
        data: 80,
        monthlyData: 60,
        unknown: 40,
        sparse: 20,
        template: 0,
        dashboard: 0,
        metadata: 0,
        instructions: 0
    };

    let bestSheet = null;
    let bestScore = -1;

    for (const sheet of fingerprint.sheets) {
        let score = priorities[sheet.sheetType] || 30;

        // Bonus for row count
        score += Math.min(sheet.rowCount / 10, 50);

        // Bonus for data density
        score += sheet.structure.dataDensity * 20;

        // Bonus for having semantic columns
        score += Object.keys(sheet.semanticProfile).length * 5;

        if (score > bestScore) {
            bestScore = score;
            bestSheet = sheet;
        }
    }

    return bestSheet;
}

/**
 * Generate transformation recommendation
 */
function recommendTransformation(sheetFingerprint) {
    const recommendation = {
        type: 'none',
        confidence: 0,
        details: {}
    };

    if (!sheetFingerprint) return recommendation;

    // Check for wide-to-long transformation
    if (sheetFingerprint.structure.hasRepeatingColumns) {
        const pattern = sheetFingerprint.structure.repeatingPattern;
        recommendation.type = 'wide-to-long';
        recommendation.confidence = 0.8;
        recommendation.details = {
            fixedColumns: pattern.fixedColumnCount,
            repeatingGroup: pattern.repeatingColumns,
            repeatCount: pattern.repeatCount
        };
        return recommendation;
    }

    // Already long format
    if (sheetFingerprint.rowCount > 20 && sheetFingerprint.structure.dataDensity > 0.5) {
        recommendation.type = 'none';
        recommendation.confidence = 0.9;
        recommendation.details = { reason: 'Data appears to be in long format already' };
        return recommendation;
    }

    return recommendation;
}

// Export functions for use in browser and Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        COLUMN_SEMANTICS,
        SHEET_TYPE_PATTERNS,
        createFileFingerprint,
        createSheetFingerprint,
        findHeaderRow,
        analyzeColumn,
        normalizeColumnName,
        detectSemanticType,
        detectSheetType,
        detectSheetNamePattern,
        detectRepeatingColumnPattern,
        calculateFingerprintSimilarity,
        findBestDataSheet,
        recommendTransformation
    };
}

// Also expose globally for browser
if (typeof window !== 'undefined') {
    window.PatternRecognition = {
        COLUMN_SEMANTICS,
        SHEET_TYPE_PATTERNS,
        createFileFingerprint,
        createSheetFingerprint,
        findHeaderRow,
        analyzeColumn,
        normalizeColumnName,
        detectSemanticType,
        detectSheetType,
        detectSheetNamePattern,
        detectRepeatingColumnPattern,
        calculateFingerprintSimilarity,
        findBestDataSheet,
        recommendTransformation
    };
}
