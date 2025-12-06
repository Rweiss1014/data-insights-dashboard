// Global state
let allRows = [];
let filteredRows = [];
let columnNames = [];
let columnProfiles = {};
let availableSheets = [];
let selectedSheets = new Set();
let currentChart = null;
let lastPivotResult = null;
let lastPivotMeta = null;
let currentFilters = []; // NL-inferred filters: Array<{ column: string, values: string[] }>
let pivotChart = null; // Chart.js instance for the pivot result card

// Chat-first conversation state
let analysisCounter = 0; // Unique ID for each analysis card
let analysisCharts = {}; // Chart.js instances keyed by cardId
let pinnedCharts = []; // Array of pinned chart configurations (legacy)
let pinnedChartInstances = {}; // Chart.js instances for pinned charts (legacy)
let aiEnabled = false; // Checked from backend
let aiSuggestions = [];
let selectedSuggestions = new Set();
let chatHistory = []; // Conversation history for context
// Auto-detect API URL (works for both local dev and deployed environments)
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3001/api'
    : `${window.location.origin}/api`;

// NEW: Chat-based dashboard state
let dashboardCharts = []; // Array of {id, config, chartInstance}
let conversationHistory = []; // For AI context
let chartIdCounter = 0;
let globalSlicerFilters = {}; // { columnName: selectedValue }
let isPresentationMode = false;

// DOM elements
const fileInput = document.getElementById('file-input');
const uploadBtn = document.getElementById('upload-btn');
const fileSummary = document.getElementById('file-summary');
const querySection = document.getElementById('query-section');
const nlQuery = document.getElementById('nl-query');
const showMeBtn = document.getElementById('show-me-btn');
const nlFeedback = document.getElementById('nl-feedback');
const toggleAdvancedBtn = document.getElementById('toggle-advanced');
const advancedSection = document.getElementById('advanced-section');
const sheetSelectorCard = document.getElementById('sheet-selector-card');
const sheetCheckboxes = document.getElementById('sheet-checkboxes');
const applySheetsBtn = document.getElementById('apply-sheets');
const rowFieldSelect = document.getElementById('row-field');
const colFieldSelect = document.getElementById('col-field');
const valueFieldSelect = document.getElementById('value-field');
const aggFnSelect = document.getElementById('agg-fn');
const filterFieldSelect = document.getElementById('filter-field');
const filterValuesContainer = document.getElementById('filter-values');
const applyFiltersBtn = document.getElementById('apply-filters');
const alertsContainer = document.getElementById('alerts');
const resultsSection = document.getElementById('results-section');
const interpretation = document.getElementById('interpretation');
const chartTitle = document.getElementById('chart-title');
const chartTypeSelector = document.getElementById('chart-type-selector');
const chartContainer = document.getElementById('chart-container');
const mainChartCanvas = document.getElementById('main-chart');
const exportExcelBtn = document.getElementById('export-excel');
const toggleTableBtn = document.getElementById('toggle-table');
const pivotContainer = document.getElementById('pivot-container');
const pinChartBtn = document.getElementById('pin-chart');
const pinnedChartsSection = document.getElementById('pinned-charts-section');
const pinnedChartsGrid = document.getElementById('pinned-charts-grid');
const clearAllPinsBtn = document.getElementById('clear-all-pins');
const settingsBtn = document.getElementById('settings-btn');
const settingsModal = document.getElementById('settings-modal');
const closeSettingsBtn = document.getElementById('close-settings');
const openaiApiKeyInput = document.getElementById('openai-api-key');
const saveApiKeyBtn = document.getElementById('save-api-key');
const clearApiKeyBtn = document.getElementById('clear-api-key');
const aiStatusText = document.getElementById('ai-status-text');
const aiSuggestionsSection = document.getElementById('ai-suggestions-section');
const aiSuggestionsGrid = document.getElementById('ai-suggestions-grid');
const aiSuggestionsLoading = document.getElementById('ai-suggestions-loading');
const analyticsActions = document.getElementById('analytics-actions');
const btnForecast = document.getElementById('btn-forecast');
const btnAnomalies = document.getElementById('btn-anomalies');
const btnCluster = document.getElementById('btn-cluster');
const btnInsights = document.getElementById('btn-insights');
const chatHistoryElement = document.getElementById('chat-history');
const chatMessagesContainer = document.getElementById('chat-messages');
const helpBtn = document.getElementById('help-btn');
const helpModal = document.getElementById('help-modal');
const closeHelpBtn = document.getElementById('close-help');

// NEW: Chat UI DOM elements
const uploadScreen = document.getElementById('upload-screen');
const mainApp = document.getElementById('main-app');
const chatPanel = document.getElementById('chat-panel');
const chatInput = document.getElementById('chat-input');
const chatSendBtn = document.getElementById('chat-send-btn');
const changeFileBtn = document.getElementById('change-file-btn');
const dashboardPanel = document.getElementById('dashboard-panel');
const chartsSection = document.getElementById('charts-section');
const chartsEmptyState = document.getElementById('charts-empty-state');
const chartsGrid = document.getElementById('charts-grid');

// Chat-first UI DOM elements
const conversationContainer = document.getElementById('conversation-container');
const conversationEmptyState = document.getElementById('conversation-empty-state');
const clearConversationBtn = document.getElementById('clear-conversation');
const dashboardSection = document.getElementById('dashboard-section');

// Tab UI elements
const tabChat = document.getElementById('tab-chat');
const tabDashboard = document.getElementById('tab-dashboard');
const chatTabContent = document.getElementById('chat-tab-content');
const dashboardTabContent = document.getElementById('dashboard-tab-content');
const dashboardCount = document.getElementById('dashboard-count');
const dashboardEmptyState = document.getElementById('dashboard-empty-state');
const toggleFiltersBtn = document.getElementById('toggle-filters');
const filterBadge = document.getElementById('filter-badge');
const slicerPanel = document.getElementById('slicer-panel');

// Event listeners
uploadBtn.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', handleFileUpload);
showMeBtn.addEventListener('click', handleShowMe);
toggleAdvancedBtn.addEventListener('click', () => {
    advancedSection.classList.toggle('hidden');
});
applySheetsBtn.addEventListener('click', handleApplySheets);
filterFieldSelect.addEventListener('change', handleFilterFieldChange);
applyFiltersBtn.addEventListener('click', handleApplyFilters);
chartTypeSelector.addEventListener('change', handleChartTypeChange);
exportExcelBtn.addEventListener('click', handleExportExcel);
toggleTableBtn.addEventListener('click', () => {
    pivotContainer.classList.toggle('hidden');
});
pinChartBtn.addEventListener('click', handlePinChart);
clearAllPinsBtn.addEventListener('click', handleClearAllPins);
settingsBtn.addEventListener('click', () => settingsModal.classList.remove('hidden'));
closeSettingsBtn.addEventListener('click', () => settingsModal.classList.add('hidden'));
saveApiKeyBtn.addEventListener('click', handleSaveApiKey);
clearApiKeyBtn.addEventListener('click', handleClearApiKey);
btnForecast.addEventListener('click', handleForecast);
btnAnomalies.addEventListener('click', handleAnomalies);
btnCluster.addEventListener('click', handleCluster);
btnInsights.addEventListener('click', handleInsights);
helpBtn.addEventListener('click', () => helpModal.classList.remove('hidden'));
closeHelpBtn.addEventListener('click', () => helpModal.classList.add('hidden'));

// Modal controls
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !helpModal.classList.contains('hidden')) {
        helpModal.classList.add('hidden');
    }
});
helpModal.addEventListener('click', (e) => {
    if (e.target === helpModal) {
        helpModal.classList.add('hidden');
    }
});

// CHAT-FIRST: Single entry point via bottom chat bar
console.log('Setting up chat-first UI...');
console.log('chatInput:', chatInput);
console.log('chatSendBtn:', chatSendBtn);
console.log('conversationContainer:', conversationContainer);

if (chatSendBtn) {
    chatSendBtn.addEventListener('click', handleUserQuery);
    console.log('✓ Chat send button listener attached');
}

if (chatInput) {
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleUserQuery();
        }
    });
    console.log('✓ Chat input Enter listener attached');
}

// Clear conversation button
if (clearConversationBtn) {
    clearConversationBtn.addEventListener('click', handleClearConversation);
}

// Tab switching
if (tabChat) {
    tabChat.addEventListener('click', () => switchTab('chat'));
}
if (tabDashboard) {
    tabDashboard.addEventListener('click', () => switchTab('dashboard'));
}

// Filter toggle
if (toggleFiltersBtn) {
    toggleFiltersBtn.addEventListener('click', () => {
        if (slicerPanel) {
            slicerPanel.classList.toggle('hidden');
        }
    });
}
if (changeFileBtn) {
    changeFileBtn.addEventListener('click', () => {
        // Reset state and go back to upload screen
        allRows = [];
        filteredRows = [];
        columnNames = [];
        dashboardCharts = [];
        conversationHistory = [];
        globalSlicerFilters = {};
        analysisCounter = 0;

        // Clear conversation
        Object.keys(analysisCharts).forEach(cardId => {
            if (analysisCharts[cardId]) analysisCharts[cardId].destroy();
        });
        analysisCharts = {};
        window.cardData = {};

        if (conversationContainer) {
            const cards = conversationContainer.querySelectorAll('[id^="analysis-"]');
            cards.forEach(card => card.remove());
        }
        if (conversationEmptyState) conversationEmptyState.classList.remove('hidden');

        if (mainApp) mainApp.classList.add('hidden');
        if (uploadScreen) uploadScreen.classList.remove('hidden');
        if (chartsGrid) chartsGrid.innerHTML = '';
        if (chatMessagesContainer) chatMessagesContainer.innerHTML = '';
        if (dashboardSection) dashboardSection.classList.add('hidden');
        fileInput.value = '';
    });
}

// Clear all dashboard charts
if (clearAllPinsBtn) {
    clearAllPinsBtn.addEventListener('click', () => {
        // Destroy all chart instances
        dashboardCharts.forEach(chart => {
            if (chart.chartInstance) {
                chart.chartInstance.destroy();
            }
        });

        // Clear the array
        dashboardCharts = [];
        chartIdCounter = 0;

        // Update display
        updateChartsDisplay();

        showAlert('All charts cleared', 'info');
    });
}

// File upload handler
async function handleFileUpload(event) {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    clearAlerts();
    showAlert('Loading your data...', 'info');

    allRows = [];
    availableSheets = [];
    selectedSheets = new Set();

    for (const file of files) {
        try {
            const arrayBuffer = await readFileAsArrayBuffer(file);
            const workbook = XLSX.read(arrayBuffer, { type: 'array' });

            workbook.SheetNames.forEach(sheetName => {
                const worksheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet);

                const sheetKey = `${file.name}|${sheetName}`;
                availableSheets.push({
                    file: file.name,
                    sheet: sheetName,
                    key: sheetKey,
                    rowCount: jsonData.length
                });
                selectedSheets.add(sheetKey);

                jsonData.forEach(row => {
                    row._file = file.name;
                    row._sheet = sheetName;
                    row._sheetKey = sheetKey;
                    allRows.push(row);
                });
            });
        } catch (error) {
            console.error('Error reading file:', file.name, error);
            showAlert(`Could not parse ${file.name}. Please check the file format.`, 'error');
        }
    }

    if (allRows.length === 0) {
        showAlert('No data found in uploaded files.', 'error');
        return;
    }

    filteredRows = [...allRows];
    processLoadedData();
    populateSheetSelector();

    // NEW: Switch to chat UI
    if (uploadScreen) uploadScreen.classList.add('hidden');
    if (mainApp) mainApp.classList.remove('hidden');

    // Initialize slicers and dashboard filters
    populateSlicerControls();
    populateDashboardFilters();

    // Clear previous charts
    dashboardCharts = [];
    chartIdCounter = 0;
    updateChartsDisplay();

    // Show welcome message in chat with suggestions
    showWelcomeMessage();

    clearAlerts();
    showAlert(`Loaded ${allRows.length} rows from ${files.length} file(s)`, 'success');
}

// Read file as ArrayBuffer
function readFileAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(e);
        reader.readAsArrayBuffer(file);
    });
}

// Process loaded data
function processLoadedData() {
    // FIRST: Preprocess dates - convert Excel serial numbers and create derived columns
    preprocessDates();

    // Build union of column names
    const columnSet = new Set();
    filteredRows.forEach(row => {
        Object.keys(row).forEach(key => {
            if (!key.startsWith('_')) {
                columnSet.add(key);
            }
        });
    });
    columnNames = Array.from(columnSet).sort();

    // Profile columns
    columnProfiles = {};
    columnNames.forEach(col => {
        columnProfiles[col] = profileColumn(col, filteredRows);
    });

    // Update file summary
    const fileCount = new Set(filteredRows.map(r => r._file)).size;
    const sheetCount = new Set(filteredRows.map(r => r._sheetKey)).size;
    fileSummary.textContent = `📁 ${filteredRows.length} rows • ${fileCount} file(s) • ${sheetCount} sheet(s)`;

    // Populate dropdowns (for advanced mode - legacy)
    populateFieldDropdowns();
    populateFilterDropdown();

    // Generate AI suggestions if API key is configured
    generateAISuggestions();

    // Show analytics buttons after data is loaded
    if (analyticsActions) {
        analyticsActions.classList.remove('hidden');
    }

    // If in presentation mode, update slicer controls
    if (isPresentationMode) {
        slicerPanel.classList.remove('hidden');
        populateSlicerControls();
        populateDashboardFilters();
    }
}

// ========================================
// DATE PREPROCESSING
// ========================================

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
                     'July', 'August', 'September', 'October', 'November', 'December'];

// Check if a value looks like an Excel serial date (number between ~1 and ~60000)
function isExcelSerialDate(value) {
    if (typeof value !== 'number') return false;
    // Excel dates for years 1900-2100 are roughly between 1 and 73000
    return value > 0 && value < 100000 && Number.isInteger(value) ||
           (value > 0 && value < 100000 && Math.abs(value - Math.round(value)) < 0.0001);
}

// Convert Excel serial date to JavaScript Date
function excelSerialToDate(serial) {
    // Excel's epoch is January 1, 1900, but there's a leap year bug
    // Day 1 = Jan 1, 1900; Day 60 = Feb 29, 1900 (doesn't exist, but Excel thinks it does)
    const excelEpoch = new Date(1899, 11, 30); // Dec 30, 1899
    return new Date(excelEpoch.getTime() + serial * 24 * 60 * 60 * 1000);
}

// Detect date columns and preprocess them
function preprocessDates() {
    if (!filteredRows || filteredRows.length === 0) return;

    // Get all column names (excluding internal ones)
    const cols = Object.keys(filteredRows[0]).filter(k => !k.startsWith('_'));

    // Identify date columns
    const dateColumns = [];

    cols.forEach(col => {
        // Sample first 50 non-null values
        const sample = filteredRows
            .slice(0, 50)
            .map(r => r[col])
            .filter(v => v != null && v !== '');

        if (sample.length === 0) return;

        // Check if column name suggests a date
        const isDateName = /date|time|month|day|year|period/i.test(col);

        // Check if values are Excel serial dates (numbers like 45294)
        const serialDateCount = sample.filter(v => isExcelSerialDate(v)).length;
        const isSerialDate = serialDateCount / sample.length > 0.8;

        // Check if values are JavaScript Date objects (SheetJS can return these)
        const jsDateCount = sample.filter(v => v instanceof Date && !isNaN(v.getTime())).length;
        const isJsDate = jsDateCount / sample.length > 0.8;

        // Check if values are date strings that can be parsed
        const dateStringCount = sample.filter(v => {
            if (typeof v === 'string') {
                const d = new Date(v);
                return !isNaN(d.getTime());
            }
            return false;
        }).length;
        const isDateString = dateStringCount / sample.length > 0.8;

        // Log what we found for debugging
        console.log(`[Date Preprocessing] Column "${col}": serial=${serialDateCount}, jsDate=${jsDateCount}, string=${dateStringCount}, isDateName=${isDateName}`);

        // IMPORTANT: Only treat columns as dates if they have a date-like name
        // This prevents numeric columns like "Sales Amount" or "Quantity Sold" from being corrupted
        if (!isDateName) {
            console.log(`[Date Preprocessing] Skipping "${col}" - not a date-like column name`);
            return; // Skip this column
        }

        // Accept column if it has dates in any format AND has a date-like name
        if (isSerialDate) {
            dateColumns.push({ name: col, type: 'serial' });
        } else if (isJsDate) {
            dateColumns.push({ name: col, type: 'jsdate' });
        } else if (isDateString) {
            dateColumns.push({ name: col, type: 'string' });
        } else if (sample.length > 0) {
            // If column is named "Date" but we couldn't detect format, try anyway
            console.log(`[Date Preprocessing] Column "${col}" has date-like name, will attempt parsing`);
            dateColumns.push({ name: col, type: 'unknown' });
        }
    });

    console.log('[Date Preprocessing] Found date columns:', dateColumns);

    // Process each date column
    dateColumns.forEach(dateCol => {
        const monthColName = `${dateCol.name}_Month`;
        const yearColName = `${dateCol.name}_Year`;
        const quarterColName = `${dateCol.name}_Quarter`;
        const formattedColName = `${dateCol.name}_Formatted`;

        let successCount = 0;
        let failCount = 0;

        filteredRows.forEach(row => {
            let dateValue = row[dateCol.name];
            let jsDate = null;

            // Try all parsing methods in order of likelihood
            if (dateValue instanceof Date && !isNaN(dateValue.getTime())) {
                // Already a JavaScript Date object
                jsDate = dateValue;
            } else if (isExcelSerialDate(dateValue)) {
                // Excel serial number
                jsDate = excelSerialToDate(dateValue);
            } else if (typeof dateValue === 'string' && dateValue.trim()) {
                // Try parsing as string
                jsDate = new Date(dateValue);
            } else if (typeof dateValue === 'number') {
                // Try as Excel serial anyway
                jsDate = excelSerialToDate(dateValue);
            }

            if (jsDate && !isNaN(jsDate.getTime())) {
                const month = jsDate.getMonth(); // 0-11
                const year = jsDate.getFullYear();
                const quarter = Math.floor(month / 3) + 1;

                row[monthColName] = MONTH_NAMES[month];
                row[yearColName] = year;
                row[quarterColName] = `Q${quarter}`;
                row[formattedColName] = jsDate.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                });

                // Also update the original column to be formatted
                row[dateCol.name] = row[formattedColName];
                successCount++;
            } else {
                failCount++;
            }
        });

        console.log(`[Date Preprocessing] Column "${dateCol.name}": ${successCount} dates parsed, ${failCount} failed`);
        console.log(`[Date Preprocessing] Created columns: ${monthColName}, ${yearColName}, ${quarterColName}`);

        // Log sample values for debugging
        if (filteredRows.length > 0) {
            console.log(`[Date Preprocessing] Sample: Month="${filteredRows[0][monthColName]}", Year="${filteredRows[0][yearColName]}"`);
        }
    });

    // Also update allRows to have the same transformations
    if (allRows !== filteredRows) {
        dateColumns.forEach(dateCol => {
            const monthColName = `${dateCol.name}_Month`;
            const yearColName = `${dateCol.name}_Year`;
            const quarterColName = `${dateCol.name}_Quarter`;
            const formattedColName = `${dateCol.name}_Formatted`;

            allRows.forEach(row => {
                let dateValue = row[dateCol.name];
                let jsDate = null;

                // Try all parsing methods
                if (dateValue instanceof Date && !isNaN(dateValue.getTime())) {
                    jsDate = dateValue;
                } else if (isExcelSerialDate(dateValue)) {
                    jsDate = excelSerialToDate(dateValue);
                } else if (typeof dateValue === 'string' && dateValue.trim()) {
                    jsDate = new Date(dateValue);
                } else if (typeof dateValue === 'number') {
                    jsDate = excelSerialToDate(dateValue);
                }

                if (jsDate && !isNaN(jsDate.getTime())) {
                    const month = jsDate.getMonth();
                    const year = jsDate.getFullYear();
                    const quarter = Math.floor(month / 3) + 1;

                    row[monthColName] = MONTH_NAMES[month];
                    row[yearColName] = year;
                    row[quarterColName] = `Q${quarter}`;
                    row[formattedColName] = jsDate.toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                    });
                    row[dateCol.name] = row[formattedColName];
                }
            });
        });
    }
}

// Profile column
function profileColumn(columnName, data) {
    const values = data.map(row => row[columnName]).filter(v => v != null && v !== '');
    const uniqueCount = new Set(values).size;

    let type = 'text';
    if (values.length > 0) {
        const sample = values.slice(0, 100);
        const numericCount = sample.filter(v => !isNaN(parseFloat(v)) && isFinite(v)).length;

        if (numericCount / sample.length > 0.8) {
            type = 'numeric';
        }
    }

    return { type, uniqueCount };
}

// Populate field dropdowns
function populateFieldDropdowns() {
    rowFieldSelect.innerHTML = '<option value="">-- Auto --</option>';
    colFieldSelect.innerHTML = '<option value="">-- Auto --</option>';
    valueFieldSelect.innerHTML = '<option value="">-- Auto --</option>';

    columnNames.forEach(col => {
        [rowFieldSelect, colFieldSelect, valueFieldSelect].forEach(select => {
            const option = document.createElement('option');
            option.value = col;
            option.textContent = col;
            select.appendChild(option);
        });
    });
}

// Populate filter dropdown
function populateFilterDropdown() {
    filterFieldSelect.innerHTML = '<option value="">-- Select column to filter --</option>';
    columnNames.forEach(col => {
        const option = document.createElement('option');
        option.value = col;
        option.textContent = col;
        filterFieldSelect.appendChild(option);
    });
}

// Populate sheet selector
function populateSheetSelector() {
    if (availableSheets.length <= 1) {
        sheetSelectorCard.classList.add('hidden');
        return;
    }

    sheetSelectorCard.classList.remove('hidden');
    let html = '';
    availableSheets.forEach(sheetInfo => {
        const { file, sheet, key, rowCount } = sheetInfo;
        const isChecked = selectedSheets.has(key);
        const displayName = `${file} - ${sheet}`;

        html += `
            <label class="flex items-center gap-2 text-sm">
                <input type="checkbox" class="sheet-checkbox" value="${escapeHtml(key)}" ${isChecked ? 'checked' : ''}>
                <span class="flex-1">${escapeHtml(displayName)}</span>
                <span class="text-xs text-gray-500">(${rowCount})</span>
            </label>
        `;
    });

    sheetCheckboxes.innerHTML = html;
}

// Handle apply sheets
function handleApplySheets() {
    const checkboxes = sheetCheckboxes.querySelectorAll('.sheet-checkbox');
    selectedSheets.clear();

    checkboxes.forEach(cb => {
        if (cb.checked) selectedSheets.add(cb.value);
    });

    if (selectedSheets.size === 0) {
        showAlert('Please select at least one sheet.', 'warning');
        return;
    }

    filteredRows = allRows.filter(row => selectedSheets.has(row._sheetKey));
    processLoadedData();
    showAlert(`Using ${selectedSheets.size} sheet(s) with ${filteredRows.length} rows.`, 'success');
}

// Handle filter field change
function handleFilterFieldChange() {
    const selectedField = filterFieldSelect.value;
    if (!selectedField) {
        filterValuesContainer.innerHTML = '';
        return;
    }

    const baseRows = allRows.filter(row => selectedSheets.has(row._sheetKey));
    const distinctValues = [...new Set(baseRows.map(row => row[selectedField]))].sort();

    let html = '';
    distinctValues.forEach(value => {
        const displayValue = value != null ? value : '(empty)';
        html += `
            <label class="flex items-center gap-2 text-sm">
                <input type="checkbox" class="filter-checkbox" value="${escapeHtml(String(value))}" checked>
                <span>${escapeHtml(String(displayValue))}</span>
            </label>
        `;
    });

    filterValuesContainer.innerHTML = html;
}

// Handle apply filters
function handleApplyFilters() {
    const selectedField = filterFieldSelect.value;
    const baseRows = allRows.filter(row => selectedSheets.has(row._sheetKey));

    if (!selectedField) {
        filteredRows = [...baseRows];
        processLoadedData();
        showAlert('Filters cleared.', 'info');
        return;
    }

    const checkboxes = filterValuesContainer.querySelectorAll('.filter-checkbox');
    const selectedValues = Array.from(checkboxes)
        .filter(cb => cb.checked)
        .map(cb => cb.value);

    if (selectedValues.length === 0) {
        showAlert('Please select at least one value.', 'warning');
        return;
    }

    filteredRows = baseRows.filter(row => {
        return selectedValues.includes(String(row[selectedField]));
    });

    processLoadedData();
    showAlert(`Filtered to ${filteredRows.length} rows.`, 'success');
}

// MAIN FUNCTION: Handle "Show Me" button
async function handleShowMe() {
    const query = nlQuery.value.trim();

    if (!query) {
        showAlert('Please describe what you want to see.', 'warning');
        return;
    }

    clearAlerts();
    showAlert('🤖 AI is analyzing your question...', 'info');

    let config;

    // Try AI interpretation first if enabled
    if (aiEnabled) {
        try {
            const aiConfig = await interpretQueryWithAI(query);
            config = aiConfig;

            // Debug: Show what AI interpreted
            console.log('AI Interpretation:', config);

            // Build detailed feedback
            let feedbackText = `✅ AI understood: ${config.aggType} of ${config.valueField} by ${config.rowField}`;
            if (config.colField) feedbackText += ` and ${config.colField}`;
            if (config.filters && config.filters.length > 0) {
                const filterDesc = config.filters.map(f => `${f.column}="${f.value}"`).join(', ');
                feedbackText += `<br>📌 Filters: ${filterDesc}`;
            } else {
                feedbackText += `<br>📌 Filters: None (showing all data)`;
            }

            nlFeedback.innerHTML = `<p class="text-green-600">${feedbackText}</p>`;
        } catch (error) {
            console.error('AI interpretation failed, falling back to regex:', error);
            showAlert('AI unavailable, using basic parsing...', 'warning');
            config = parseNaturalLanguage(query);
        }
    } else {
        // Fall back to regex parsing
        config = parseNaturalLanguage(query);
    }

    if (!config.valueField) {
        showAlert('Could not determine what to measure. Try being more specific (e.g., "total sales by region").', 'error');
        nlFeedback.innerHTML = '<p class="text-red-600">💡 Tip: Try phrases like "Show me [MEASURE] by [CATEGORY]" - for example, "Show me quantity by product type"</p>';
        return;
    }

    // Apply filters from query
    let dataToUse = filteredRows;
    if (config.filters && config.filters.length > 0) {
        dataToUse = applyQueryFilters(filteredRows, config.filters);
        showAlert(`Filtered to ${dataToUse.length} rows based on your query.`, 'info');
    }

    // Add computed columns (like Quarter or Month)
    if (config.timeGrouping) {
        const dateCol = columnNames.find(col =>
            /date|month|time/i.test(col) ||
            filteredRows.some(row => !isNaN(Date.parse(row[col])))
        );

        if (dateCol) {
            const computedColName = config.timeGrouping === 'quarter' ? 'Quarter' : 'Month';
            config.computedColumns = { [computedColName]: { source: dateCol, type: config.timeGrouping } };
            config.rowField = computedColName;
        }
    }

    if (config.computedColumns) {
        dataToUse = addComputedColumns(dataToUse, config.computedColumns);
    }

    // Build the pivot
    const pivotResult = pivot(dataToUse, config.rowField, config.colField, config.valueField, config.aggType);
    lastPivotResult = pivotResult;
    lastPivotMeta = { ...config, dataRows: dataToUse.length };

    // Show results section
    resultsSection.classList.remove('hidden');

    // Generate interpretation
    generateInterpretation(config, pivotResult, dataToUse);

    // Render chart
    renderChart(pivotResult, config);

    // Render table
    renderPivotTable(pivotResult, config);

    clearAlerts();
    showAlert('✅ Done! Check out your visualization below.', 'success');

    // Scroll to results
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Interpret query using AI
async function interpretQueryWithAI(query) {
    const sampleData = filteredRows.slice(0, 3).map(row => {
        const sample = {};
        columnNames.forEach(col => sample[col] = row[col]);
        return sample;
    });

    const columnTypes = {};
    columnNames.forEach(col => {
        columnTypes[col] = columnProfiles[col]?.type || 'text';
    });

    const response = await fetch(`${API_BASE_URL}/interpret-query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            query: query,
            columns: columnNames,
            columnTypes: columnTypes,
            sampleData: sampleData,
            context: chatHistory.slice(-4) // Last 2 exchanges for context
        })
    });

    if (!response.ok) {
        throw new Error('Failed to interpret query');
    }

    const data = await response.json();
    return data.interpretation;
}

// Parse natural language query (fallback when AI is unavailable)
function parseNaturalLanguage(text) {
    const lowerText = text.toLowerCase();

    // Initialize config
    const config = {
        filters: [],
        computedColumns: null,
        chartType: 'bar',
        rowField: '',
        colField: '',
        valueField: '',
        aggType: 'sum'
    };

    // 1. Extract filters from query (e.g., "chocolate sales" = filter to chocolate)
    config.filters = extractFiltersFromQuery(text, columnNames, filteredRows);

    // 2. Check for quarter/date/month grouping
    if (/\b(quarter|quarters|q1|q2|q3|q4)\b/i.test(text)) {
        // Find date-like column
        const dateCol = columnNames.find(col =>
            /date|month|time/i.test(col) ||
            filteredRows.some(row => !isNaN(Date.parse(row[col])))
        );

        if (dateCol) {
            config.computedColumns = { Quarter: { source: dateCol, type: 'quarter' } };
            config.rowField = 'Quarter';
        }
    } else if (/\b(month|months|monthly|by month)\b/i.test(text)) {
        // Find date-like column
        const dateCol = columnNames.find(col =>
            /date|month|time/i.test(col) ||
            filteredRows.some(row => !isNaN(Date.parse(row[col])))
        );

        if (dateCol) {
            config.computedColumns = { Month: { source: dateCol, type: 'month' } };
            config.rowField = 'Month';
        }
    }

    // 3. Detect chart type from query
    if (/\b(bar|bars|bar chart)\b/i.test(text)) {
        config.chartType = 'bar';
    } else if (/\b(line|line chart|trend)\b/i.test(text)) {
        config.chartType = 'line';
    } else if (/\b(pie|pie chart)\b/i.test(text)) {
        config.chartType = 'pie';
    }

    // 4. Check for manual selections (advanced mode)
    let rowField = rowFieldSelect.value || '';
    let colField = colFieldSelect.value || '';
    let valueField = valueFieldSelect.value || '';
    let aggType = aggFnSelect.value || 'sum';

    // 5. If fields are set to auto, use NL parsing
    if (!rowField || !colField || !valueField) {
        const nlResult = guessLayoutFromText(text, columnNames, filteredRows[0] || {});

        if (!rowField && !config.rowField) rowField = nlResult.rowField;
        if (!colField) colField = nlResult.colField;
        if (!valueField) valueField = nlResult.valueField;
        if (aggFnSelect.value === 'sum') aggType = nlResult.aggType;
    }

    config.rowField = config.rowField || rowField;
    config.colField = colField;
    config.valueField = valueField;
    config.aggType = aggType;

    return config;
}

// Guess layout from natural language (improved version)
function guessLayoutFromText(text, columnNames, sampleRow) {
    const lowerText = text.toLowerCase();

    // Classify columns
    const numericCols = columnNames.filter(col => {
        // Exclude date-like columns from numeric detection
        if (/date|time|month|day|year/i.test(col)) return false;

        const value = sampleRow[col];
        return !isNaN(parseFloat(value)) && isFinite(value);
    });
    const categoricalCols = columnNames.filter(col => !numericCols.includes(col));

    // Find mentioned columns
    const mentionedCols = columnNames.filter(col =>
        lowerText.includes(col.toLowerCase().replace(/[_-]/g, ' '))
    );
    const mentionedNumeric = mentionedCols.filter(col => numericCols.includes(col));
    const mentionedCategorical = mentionedCols.filter(col => categoricalCols.includes(col));

    // Determine aggregate type
    let aggType = 'sum';
    if (/\b(average|avg|mean)\b/.test(lowerText)) {
        aggType = 'avg';
    } else if (/\b(count|how many|number of)\b/.test(lowerText)) {
        aggType = 'count';
    } else if (/\b(total|sum)\b/.test(lowerText)) {
        aggType = 'sum';
    }

    // Guess value field
    let valueField = mentionedNumeric[0] || numericCols[0] || columnNames[0] || '';

    // Guess row field (primary grouping)
    let rowField = mentionedCategorical[0] || categoricalCols[0] || '';

    // Guess column field (secondary grouping - look for "by X and Y" or "across Y")
    let colField = '';
    if (/\band\b/.test(lowerText) || /\bacross\b/.test(lowerText)) {
        colField = mentionedCategorical[1] || '';
    }

    return { rowField, colField, valueField, aggType };
}

// Extract filters from natural language query
function extractFiltersFromQuery(text, columnNames, data) {
    const filters = [];
    const lowerText = text.toLowerCase();

    // Look for potential filter keywords in each column
    columnNames.forEach(colName => {
        const colValues = [...new Set(data.map(row => String(row[colName]).toLowerCase()))];

        // Check if any value from this column is mentioned in the query
        colValues.forEach(value => {
            if (value && value.length > 2 && lowerText.includes(value)) {
                // Found a match! This is likely a filter
                filters.push({
                    column: colName,
                    value: value,
                    originalValue: data.find(row => String(row[colName]).toLowerCase() === value)[colName]
                });
            }
        });
    });

    return filters;
}

// Apply filters from query (handles both {value} and {values[]} formats)
function applyQueryFilters(data, filters) {
    if (!filters || filters.length === 0) return data;

    // Consolidate same-column filters (OR within column, AND across columns)
    const consolidatedFilters = {};
    filters.forEach(filter => {
        if (!filter.column) return;

        // Handle both formats: {value: "X"} and {values: ["X", "Y"]}
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

// Add computed columns (like Quarter from dates)
function addComputedColumns(data, computedColumns) {
    return data.map(row => {
        const newRow = { ...row };

        Object.keys(computedColumns).forEach(newColName => {
            const config = computedColumns[newColName];

            if (config.type === 'quarter') {
                const sourceValue = row[config.source];

                // Try to parse as date
                const date = new Date(sourceValue);
                if (!isNaN(date)) {
                    const month = date.getMonth(); // 0-11
                    if (month >= 0 && month <= 2) newRow[newColName] = 'Q1 (Jan-Mar)';
                    else if (month >= 3 && month <= 5) newRow[newColName] = 'Q2 (Apr-Jun)';
                    else if (month >= 6 && month <= 8) newRow[newColName] = 'Q3 (Jul-Sep)';
                    else newRow[newColName] = 'Q4 (Oct-Dec)';
                } else {
                    // Try to extract month name and map to quarter
                    const monthMap = {
                        'january': 'Q1 (Jan-Mar)', 'february': 'Q1 (Jan-Mar)', 'march': 'Q1 (Jan-Mar)',
                        'april': 'Q2 (Apr-Jun)', 'may': 'Q2 (Apr-Jun)', 'june': 'Q2 (Apr-Jun)',
                        'july': 'Q3 (Jul-Sep)', 'august': 'Q3 (Jul-Sep)', 'september': 'Q3 (Jul-Sep)',
                        'october': 'Q4 (Oct-Dec)', 'november': 'Q4 (Oct-Dec)', 'december': 'Q4 (Oct-Dec)',
                        'jan': 'Q1 (Jan-Mar)', 'feb': 'Q1 (Jan-Mar)', 'mar': 'Q1 (Jan-Mar)',
                        'apr': 'Q2 (Apr-Jun)', 'jun': 'Q2 (Apr-Jun)',
                        'jul': 'Q3 (Jul-Sep)', 'aug': 'Q3 (Jul-Sep)', 'sep': 'Q3 (Jul-Sep)',
                        'oct': 'Q4 (Oct-Dec)', 'nov': 'Q4 (Oct-Dec)', 'dec': 'Q4 (Oct-Dec)'
                    };

                    const lowerValue = String(sourceValue).toLowerCase();
                    for (const [month, quarter] of Object.entries(monthMap)) {
                        if (lowerValue.includes(month)) {
                            newRow[newColName] = quarter;
                            break;
                        }
                    }
                }
            } else if (config.type === 'month') {
                const sourceValue = row[config.source];

                // Skip if source value is empty or null
                if (sourceValue == null || sourceValue === '') {
                    return null;
                }

                let date;

                // Check if it's an Excel serial number (pure number like 45294)
                if (typeof sourceValue === 'number' || !isNaN(parseFloat(sourceValue))) {
                    const numValue = typeof sourceValue === 'number' ? sourceValue : parseFloat(sourceValue);

                    // Excel serial numbers for dates are typically between 1 (1900) and 50000 (2036)
                    if (numValue > 1 && numValue < 50000) {
                        date = excelSerialToDate(numValue);
                        console.log(`Converted Excel serial ${numValue} to ${date.toLocaleDateString()}`);
                    } else {
                        console.warn(`Skipping invalid Excel serial: ${numValue}`);
                        return null;
                    }
                } else {
                    // Try parsing as string date (MM/DD/YYYY)
                    date = new Date(String(sourceValue).trim());
                }

                // Validate the date
                if (!isNaN(date.getTime()) &&
                    date.getFullYear() >= 2020 &&
                    date.getFullYear() <= 2030) {

                    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                        'July', 'August', 'September', 'October', 'November', 'December'];
                    const monthIndex = date.getMonth();
                    newRow[newColName] = monthNames[monthIndex];

                    console.log(`✅ Extracted ${monthNames[monthIndex]} ${date.getFullYear()}`);
                } else {
                    console.warn(`Skipping invalid date: ${sourceValue}`);
                    return null;
                }
            }
        });

        return newRow;
    }).filter(row => row !== null); // Remove rows with invalid dates
}

// Parse a value that might have currency formatting ($1,234.56)
function parseNumericValue(val) {
    if (val == null) return NaN;
    if (typeof val === 'number') return val;

    // Convert to string and remove currency symbols, commas, spaces
    const cleaned = String(val).replace(/[$€£¥,\s]/g, '').trim();
    return parseFloat(cleaned);
}

// Chronological sort for months, quarters, and dates
function sortChronologically(values, fieldName) {
    const monthOrder = {
        'january': 0, 'jan': 0,
        'february': 1, 'feb': 1,
        'march': 2, 'mar': 2,
        'april': 3, 'apr': 3,
        'may': 4,
        'june': 5, 'jun': 5,
        'july': 6, 'jul': 6,
        'august': 7, 'aug': 7,
        'september': 8, 'sep': 8, 'sept': 8,
        'october': 9, 'oct': 9,
        'november': 10, 'nov': 10,
        'december': 11, 'dec': 11
    };

    const quarterOrder = { 'q1': 0, 'q2': 1, 'q3': 2, 'q4': 3 };

    // Check if values look like months
    const isMonthField = /month/i.test(fieldName) ||
        values.some(v => monthOrder[String(v).toLowerCase()] !== undefined);

    // Check if values look like quarters
    const isQuarterField = /quarter/i.test(fieldName) ||
        values.some(v => quarterOrder[String(v).toLowerCase()] !== undefined);

    // Check if values look like dates (YYYY-MM-DD, MM/DD/YYYY, etc.)
    const isDateField = /date/i.test(fieldName) ||
        values.some(v => !isNaN(Date.parse(v)));

    if (isMonthField) {
        return [...values].sort((a, b) => {
            const aLower = String(a).toLowerCase();
            const bLower = String(b).toLowerCase();
            const aOrder = monthOrder[aLower] ?? 99;
            const bOrder = monthOrder[bLower] ?? 99;
            return aOrder - bOrder;
        });
    }

    if (isQuarterField) {
        return [...values].sort((a, b) => {
            const aLower = String(a).toLowerCase();
            const bLower = String(b).toLowerCase();
            const aOrder = quarterOrder[aLower] ?? 99;
            const bOrder = quarterOrder[bLower] ?? 99;
            return aOrder - bOrder;
        });
    }

    if (isDateField) {
        return [...values].sort((a, b) => {
            const aDate = new Date(a);
            const bDate = new Date(b);
            if (!isNaN(aDate) && !isNaN(bDate)) {
                return aDate - bDate;
            }
            return String(a).localeCompare(String(b));
        });
    }

    // Default alphabetical sort
    return [...values].sort((a, b) => String(a).localeCompare(String(b)));
}

// Pivot function
function pivot(data, rowField, colField, valueField, aggType) {
    const rawRowKeys = [...new Set(data.map(row => row[rowField]))].filter(v => v != null);
    const rawColKeys = colField ? [...new Set(data.map(row => row[colField]))].filter(v => v != null) : [null];

    // Sort with chronological awareness for months/dates
    const rowKeys = sortChronologically(rawRowKeys, rowField);
    const colKeys = colField ? sortChronologically(rawColKeys, colField) : [null];

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

// Generate interpretation
function generateInterpretation(config, pivotResult, dataUsed) {
    const { rowField, colField, valueField, aggType, filters } = config;
    const { rowKeys, colKeys } = pivotResult;

    const aggWord = aggType === 'sum' ? 'total' : aggType === 'avg' ? 'average' : 'count of';

    let text = `I analyzed ${dataUsed.length} rows`;

    // Mention filters if applied
    if (filters && filters.length > 0) {
        const filterDesc = filters.map(f => `"${f.originalValue}"`).join(', ');
        text += ` (filtered to ${filterDesc})`;
    }

    text += ` and found ${rowKeys.length} unique ${rowField} values. `;

    if (colField) {
        text += `The data is grouped by ${rowField} and broken down across ${colKeys.filter(k => k != null).length} ${colField} categories. `;
    } else {
        text += `Here's the ${aggWord} ${valueField} for each ${rowField}. `;
    }

    // Find top value
    let maxValue = -Infinity;
    let maxRow = '';
    rowKeys.forEach(rk => {
        colKeys.forEach(ck => {
            const val = pivotResult.getValue(rk, ck);
            if (val != null && val > maxValue) {
                maxValue = val;
                maxRow = rk;
            }
        });
    });

    if (maxRow) {
        text += `The highest ${aggWord} ${valueField} is for ${maxRow} (${formatNumber(maxValue, aggType)}).`;
    }

    interpretation.textContent = text;
}

// Render chart using Chart.js
function renderChart(pivotResult, config) {
    const { rowKeys, colKeys, getValue } = pivotResult;
    const { rowField, colField, valueField, aggType, chartType } = config;

    // Destroy existing chart
    if (currentChart) {
        currentChart.destroy();
        currentChart = null;
    }

    // Set chart type selector
    chartTypeSelector.value = chartType;

    // Update title
    const aggWord = aggType === 'sum' ? 'Total' : aggType === 'avg' ? 'Average' : 'Count of';
    chartTitle.textContent = colField
        ? `${aggWord} ${valueField} by ${rowField} and ${colField}`
        : `${aggWord} ${valueField} by ${rowField}`;

    // If table-only mode, hide canvas
    if (chartType === 'table') {
        chartContainer.innerHTML = '<p class="text-center text-gray-500 py-8">Table view - see data below</p>';
        return;
    }

    // Reset canvas
    chartContainer.innerHTML = '<canvas id="main-chart"></canvas>';
    const canvas = document.getElementById('main-chart');
    const ctx = canvas.getContext('2d');

    // Prepare chart data
    const chartData = prepareChartData(pivotResult, config);

    // Create chart
    currentChart = new Chart(ctx, chartData);
}

// Prepare chart data for Chart.js with polished styling
function prepareChartData(pivotResult, config) {
    const { rowKeys, colKeys, getValue } = pivotResult;
    const { chartType, colField, showLabels } = config;

    // Guard against empty/invalid data
    if (!rowKeys || rowKeys.length === 0) {
        console.warn('[prepareChartData] No row keys - returning empty chart placeholder');
        return {
            type: chartType === 'pie' || chartType === 'doughnut' ? 'pie' : 'bar',
            data: {
                labels: ['No data'],
                datasets: [{
                    data: chartType === 'pie' || chartType === 'doughnut' ? [1] : [0],
                    backgroundColor: ['#e5e7eb']
                }]
            },
            options: {
                plugins: { legend: { display: false }, tooltip: { enabled: false } },
                scales: chartType === 'pie' || chartType === 'doughnut' ? {} : { y: { display: false }, x: { display: true } }
            }
        };
    }

    // Muted, sophisticated color palette
    const palette = getMutedPalette();

    // Pie or Doughnut chart
    if (chartType === 'pie' || chartType === 'doughnut') {
        // Get data and filter out null/zero values (they cause pie chart rendering issues)
        const rawData = rowKeys.map((rk, idx) => ({ label: rk, value: getValue(rk, colKeys[0]), idx }));
        const validData = rawData.filter(d => d.value != null && d.value > 0);

        // Handle edge case where all values are null/zero
        if (validData.length === 0) {
            return {
                type: 'pie',
                data: { labels: ['No data'], datasets: [{ data: [1], backgroundColor: ['#e5e7eb'] }] },
                options: { plugins: { legend: { display: false }, tooltip: { enabled: false } } }
            };
        }

        const filteredLabels = validData.map(d => d.label);
        const data = validData.map(d => d.value);
        const total = data.reduce((sum, val) => sum + val, 0);

        // For many categories, use bottom legend; for few, use right legend
        const legendPosition = filteredLabels.length > 6 ? 'bottom' : 'right';

        return {
            type: chartType === 'pie' ? 'pie' : 'doughnut',
            data: {
                labels: filteredLabels,
                datasets: [{
                    data: data,
                    backgroundColor: palette.slice(0, filteredLabels.length),
                    borderColor: '#ffffff',
                    borderWidth: 2,
                    hoverBorderWidth: 3,
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: chartType === 'doughnut' ? '60%' : 0,
                layout: {
                    padding: { top: 10, bottom: 10 }
                },
                plugins: {
                    legend: {
                        position: legendPosition,
                        labels: {
                            padding: legendPosition === 'bottom' ? 10 : 15,
                            usePointStyle: true,
                            pointStyle: 'circle',
                            font: { size: 10, family: "'Inter', sans-serif" },
                            boxWidth: 8,
                            generateLabels: function(chart) {
                                const data = chart.data;
                                if (data.labels.length && data.datasets.length) {
                                    return data.labels.map((label, i) => {
                                        const value = data.datasets[0].data[i];
                                        const pct = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                                        return {
                                            text: `${label} (${pct}%)`,
                                            fillStyle: data.datasets[0].backgroundColor[i],
                                            hidden: false,
                                            index: i
                                        };
                                    });
                                }
                                return [];
                            }
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(15, 23, 42, 0.9)',
                        padding: 12,
                        cornerRadius: 8,
                        titleFont: { size: 13, weight: '600' },
                        bodyFont: { size: 12 },
                        callbacks: {
                            label: function(context) {
                                const value = context.raw;
                                const pct = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                                return `${context.label}: ${value.toLocaleString()} (${pct}%)`;
                            }
                        }
                    },
                    datalabels: showLabels ? {
                        color: '#fff',
                        font: { weight: 'bold', size: 10 },
                        formatter: (value) => {
                            const pct = total > 0 ? ((value / total) * 100).toFixed(0) : 0;
                            return `${pct}%`;
                        },
                        display: (context) => {
                            // Only show labels for slices > 5%
                            const value = context.dataset.data[context.dataIndex];
                            return (value / total) > 0.05;
                        }
                    } : { display: false }
                },
                animation: {
                    animateRotate: true,
                    animateScale: true
                }
            },
            plugins: showLabels ? [ChartDataLabels] : []
        };
    }

    // Determine actual chart type for Chart.js
    const isHorizontal = chartType === 'horizontalBar';
    const isArea = chartType === 'area';
    const actualType = isHorizontal ? 'bar' : (isArea ? 'line' : chartType);

    // Guard against empty colKeys
    const safeColKeys = (!colKeys || colKeys.length === 0) ? [null] : colKeys;

    // Bar, Line, or Area chart
    const datasets = safeColKeys.map((ck, idx) => {
        const color = palette[idx % palette.length];
        // Convert null values to 0 to prevent blank charts
        const dataValues = rowKeys.map(rk => {
            const val = getValue(rk, ck);
            return val != null ? val : 0;
        });
        const baseConfig = {
            label: ck != null ? String(ck) : 'Value',
            data: dataValues
        };

        if (chartType === 'line') {
            return {
                ...baseConfig,
                borderColor: color,
                backgroundColor: hexToRgba(color, 0.1),
                borderWidth: 2.5,
                fill: false,
                tension: 0.3,
                pointRadius: 4,
                pointHoverRadius: 6,
                pointBackgroundColor: '#ffffff',
                pointBorderColor: color,
                pointBorderWidth: 2,
                pointHoverBackgroundColor: color,
                pointHoverBorderColor: '#ffffff'
            };
        } else if (isArea) {
            return {
                ...baseConfig,
                borderColor: color,
                backgroundColor: hexToRgba(color, 0.3),
                borderWidth: 2.5,
                fill: true,
                tension: 0.3,
                pointRadius: 3,
                pointHoverRadius: 5,
                pointBackgroundColor: color,
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2
            };
        } else {
            // Bar chart (vertical or horizontal)
            return {
                ...baseConfig,
                backgroundColor: hexToRgba(color, 0.85),
                hoverBackgroundColor: color,
                borderColor: color,
                borderWidth: 0,
                borderRadius: 6,
                borderSkipped: false
            };
        }
    });

    return {
        type: actualType,
        data: {
            labels: rowKeys,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: isHorizontal ? 'y' : 'x',
            interaction: {
                intersect: false,
                mode: 'index'
            },
            scales: {
                x: {
                    grid: {
                        display: isHorizontal
                    },
                    ticks: {
                        font: { size: 11, family: "'Inter', sans-serif" },
                        color: '#64748b'
                    },
                    beginAtZero: isHorizontal
                },
                y: {
                    beginAtZero: !isHorizontal,
                    grid: {
                        color: 'rgba(148, 163, 184, 0.1)',
                        drawBorder: false,
                        display: !isHorizontal
                    },
                    ticks: {
                        font: { size: 11, family: "'Inter', sans-serif" },
                        color: '#64748b',
                        padding: 8
                    }
                }
            },
            plugins: {
                legend: {
                    display: colField ? true : false,
                    position: 'top',
                    align: 'end',
                    labels: {
                        padding: 15,
                        usePointStyle: true,
                        pointStyle: 'circle',
                        font: { size: 11, family: "'Inter', sans-serif" }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    padding: 12,
                    cornerRadius: 8,
                    titleFont: { size: 13, weight: '600' },
                    bodyFont: { size: 12 }
                },
                datalabels: showLabels ? {
                    color: isHorizontal || chartType === 'bar' ? '#fff' : '#333',
                    anchor: isHorizontal || chartType === 'bar' ? 'center' : 'end',
                    align: isHorizontal || chartType === 'bar' ? 'center' : 'top',
                    font: { weight: 'bold', size: 10 },
                    formatter: (value) => value.toLocaleString()
                } : { display: false }
            },
            animation: {
                duration: 500,
                easing: 'easeOutQuart'
            }
        },
        plugins: showLabels ? [ChartDataLabels] : []
    };
}

// Muted, sophisticated color palette
function getMutedPalette() {
    return [
        '#6366f1', // Indigo
        '#8b5cf6', // Purple
        '#06b6d4', // Cyan
        '#10b981', // Emerald
        '#f59e0b', // Amber
        '#ef4444', // Red
        '#ec4899', // Pink
        '#14b8a6', // Teal
        '#f97316', // Orange
        '#64748b'  // Slate
    ];
}

// Convert hex to rgba
function hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Generate colors for charts (legacy, uses muted palette now)
function generateColors(count) {
    const palette = getMutedPalette();
    const result = [];
    for (let i = 0; i < count; i++) {
        result.push(palette[i % palette.length]);
    }
    return result;
}

// Handle chart type change
function handleChartTypeChange() {
    if (lastPivotResult && lastPivotMeta) {
        const newConfig = { ...lastPivotMeta, chartType: chartTypeSelector.value };
        renderChart(lastPivotResult, newConfig);
    }
}

// Render pivot table
function renderPivotTable(pivotResult, config) {
    const { rowKeys, colKeys, getValue } = pivotResult;
    const { rowField, colField, valueField, aggType } = config;

    let html = '<table><thead><tr>';
    html += `<th>${escapeHtml(rowField)}</th>`;

    if (colField) {
        colKeys.forEach(ck => {
            html += `<th>${escapeHtml(String(ck))}</th>`;
        });
    } else {
        const aggLabel = aggType.charAt(0).toUpperCase() + aggType.slice(1);
        html += `<th>${aggLabel} of ${escapeHtml(valueField)}</th>`;
    }

    html += '</tr></thead><tbody>';

    rowKeys.forEach(rk => {
        html += '<tr>';
        html += `<td><strong>${escapeHtml(String(rk))}</strong></td>`;
        colKeys.forEach(ck => {
            const value = getValue(rk, ck);
            const displayValue = value != null ? formatNumber(value, aggType) : '-';
            html += `<td>${displayValue}</td>`;
        });
        html += '</tr>';
    });

    html += '</tbody></table>';
    pivotContainer.innerHTML = html;
}

// Export to Excel
function handleExportExcel() {
    if (!lastPivotResult || !lastPivotMeta) {
        showAlert('No data to export.', 'error');
        return;
    }

    const { rowKeys, colKeys, getValue } = lastPivotResult;
    const { rowField, colField, valueField, aggType } = lastPivotMeta;

    const data = [];
    const aggWord = aggType === 'sum' ? 'Total' : aggType === 'avg' ? 'Average' : 'Count of';
    const description = colField
        ? `${aggWord} ${valueField} by ${rowField} and ${colField}`
        : `${aggWord} ${valueField} by ${rowField}`;

    data.push([description]);
    data.push([]);

    const headers = [rowField];
    if (colField) {
        colKeys.forEach(ck => headers.push(String(ck)));
    } else {
        headers.push(`${aggWord} of ${valueField}`);
    }
    data.push(headers);

    rowKeys.forEach(rk => {
        const row = [String(rk)];
        colKeys.forEach(ck => {
            const value = getValue(rk, ck);
            row.push(value != null ? value : '');
        });
        data.push(row);
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Data Insights');
    XLSX.writeFile(wb, 'data-insights.xlsx');

    showAlert('📥 Excel file downloaded!', 'success');
}

// Alert functions
function showAlert(message, type = 'info') {
    const alert = document.createElement('div');
    alert.className = `alert-message alert-${type}`;
    alert.textContent = message;
    alertsContainer.appendChild(alert);

    setTimeout(() => alert.remove(), 5000);
}

function clearAlerts() {
    alertsContainer.innerHTML = '';
}

// Utility functions
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatNumber(num, aggType) {
    if (aggType === 'count') {
        return Math.round(num).toLocaleString();
    }
    if (Number.isInteger(num)) {
        return num.toLocaleString();
    }
    return num.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

// ========================================
// NL-FIRST PIVOT SYSTEM
// ========================================

// Centralized filter application function
function applyFiltersToRows(rows, filters) {
    if (!filters || filters.length === 0) return rows;

    console.log('[Filter] Starting with', rows.length, 'rows');
    console.log('[Filter] Applying filters:', JSON.stringify(filters));

    // IMPORTANT: Consolidate filters for the same column (OR within column, AND across columns)
    // This handles queries like "compare Product A and Product B" correctly
    const consolidatedFilters = {};
    filters.forEach(filter => {
        if (filter.column && filter.values && filter.values.length > 0) {
            if (!consolidatedFilters[filter.column]) {
                consolidatedFilters[filter.column] = [];
            }
            // Add all values (avoid duplicates)
            filter.values.forEach(v => {
                const normalized = String(v).toLowerCase().trim();
                if (!consolidatedFilters[filter.column].some(existing => existing.toLowerCase().trim() === normalized)) {
                    consolidatedFilters[filter.column].push(v);
                }
            });
        }
    });

    console.log('[Filter] Consolidated filters:', consolidatedFilters);

    let result = rows;
    Object.entries(consolidatedFilters).forEach(([column, values]) => {
        if (values.length > 0) {
            const beforeCount = result.length;

            // Log some sample values from the column being filtered
            const sampleValues = [...new Set(result.slice(0, 20).map(r => r[column]))];
            console.log(`[Filter] Column "${column}" sample values:`, sampleValues);
            console.log(`[Filter] Looking for (OR):`, values);

            result = result.filter(row => {
                const cellValue = String(row[column] || '').toLowerCase().trim();
                // OR logic: match ANY of the values
                const match = values.some(v => cellValue === String(v).toLowerCase().trim());
                return match;
            });

            console.log(`[Filter] "${column}" filter: ${beforeCount} → ${result.length} rows`);
        }
    });

    console.log('[Filter] Final result:', result.length, 'rows');
    return result;
}

// Improved guessLayoutFromText - returns the new structure
function guessLayoutFromTextImproved(text, cols, data) {
    const lowerText = text.toLowerCase();

    // Result structure
    const result = {
        rowField: null,
        colField: null,
        valueField: null,
        aggType: 'sum',
        filters: [],
        chartType: 'bar'
    };

    // Classify columns
    const numericCols = cols.filter(col => {
        if (/date|time|month|day|year/i.test(col)) return false;
        const profile = columnProfiles[col];
        return profile && profile.type === 'numeric';
    });

    const categoricalCols = cols.filter(col => {
        const profile = columnProfiles[col];
        return profile && profile.type === 'text';
    });

    // 1. Detect aggregation type
    // Be more specific: only use COUNT if user is asking to count rows, not quantities
    // "how many X sold" should be SUM of quantity, not COUNT of rows
    if (/\b(average|avg|mean)\b/i.test(lowerText)) {
        result.aggType = 'avg';
    } else if (/\b(count rows|count of rows|number of rows|count distinct|count unique)\b/i.test(lowerText)) {
        result.aggType = 'count';
    } else {
        // Default to SUM for numeric values (most common use case)
        result.aggType = 'sum';
    }

    // 2. Detect chart type
    if (/\b(pie|pie chart|donut)\b/i.test(lowerText)) {
        result.chartType = 'pie';
    } else if (/\b(line|trend|over time)\b/i.test(lowerText)) {
        result.chartType = 'line';
    } else {
        result.chartType = 'bar';
    }

    // 3. Find mentioned columns (normalize by removing underscores/hyphens)
    const mentionedCols = cols.filter(col => {
        const normalizedCol = col.toLowerCase().replace(/[_-]/g, ' ');
        return lowerText.includes(normalizedCol) || lowerText.includes(col.toLowerCase());
    });

    const mentionedNumeric = mentionedCols.filter(col => numericCols.includes(col));
    const mentionedCategorical = mentionedCols.filter(col => categoricalCols.includes(col));

    // 4. Determine value field (what to measure)
    // Look for patterns like "sum of X", "total X", "X sales", etc.
    for (const col of numericCols) {
        const colLower = col.toLowerCase();
        const patterns = [
            new RegExp(`(sum|total|average|avg|count)\\s+(of\\s+)?${colLower}`, 'i'),
            new RegExp(`${colLower}\\s+(sum|total|by|per)`, 'i'),
            new RegExp(`\\b${colLower}\\b`, 'i')
        ];
        if (patterns.some(p => p.test(lowerText))) {
            result.valueField = col;
            break;
        }
    }
    // Fallback to first mentioned numeric or first numeric column
    if (!result.valueField) {
        result.valueField = mentionedNumeric[0] || numericCols[0] || null;
    }

    // 5. Determine row field (primary grouping)
    // Look for "by X", "per X", "for each X", "grouped by X"
    const byMatch = lowerText.match(/\b(by|per|for each|grouped by|group by)\s+(\w+)/i);
    if (byMatch) {
        const afterBy = byMatch[2].toLowerCase();
        const matchedCol = cols.find(col => col.toLowerCase() === afterBy ||
                                            col.toLowerCase().replace(/[_-]/g, ' ') === afterBy);
        if (matchedCol) {
            result.rowField = matchedCol;
        }
    }

    // Fallback: first mentioned categorical or first categorical
    if (!result.rowField) {
        result.rowField = mentionedCategorical[0] || categoricalCols[0] || null;
    }

    // 6. Determine column field (secondary grouping) - look for "and X", "across X"
    const andMatch = lowerText.match(/\b(and|across|split by|broken down by)\s+(\w+)/i);
    if (andMatch) {
        const afterAnd = andMatch[2].toLowerCase();
        const matchedCol = cols.find(col => col.toLowerCase() === afterAnd && col !== result.rowField);
        if (matchedCol && categoricalCols.includes(matchedCol)) {
            result.colField = matchedCol;
        }
    }

    // 7. Extract filters - detect value mentions in the query
    // Check ALL columns (not just categorical) for value matches
    cols.forEach(col => {
        const uniqueValues = [...new Set(data.map(row => row[col]))].filter(v => v != null);
        const matchedValues = [];

        uniqueValues.forEach(val => {
            const valStr = String(val);
            const valLower = valStr.toLowerCase();

            // Skip very short values (likely noise)
            if (valLower.length < 3) return;

            // Skip if value is a column name
            if (cols.some(c => c.toLowerCase() === valLower)) return;

            // Check for exact match (full value in query)
            if (lowerText.includes(valLower)) {
                matchedValues.push(valStr);
                return;
            }

            // Check for partial match - if all words of the value appear in query
            // e.g., "chocolate chip cookies" matches if user says "chocolate chip"
            const valWords = valLower.split(/\s+/).filter(w => w.length > 2);
            if (valWords.length > 1) {
                const matchCount = valWords.filter(word => lowerText.includes(word)).length;
                // If most words match (at least 2 and > 60%), consider it a match
                if (matchCount >= 2 && matchCount / valWords.length > 0.6) {
                    matchedValues.push(valStr);
                    return;
                }
            }
        });

        if (matchedValues.length > 0) {
            result.filters.push({
                column: col,
                values: matchedValues
            });
        }
    });

    // 8. Detect month/date filters
    const months = ['january', 'february', 'march', 'april', 'may', 'june',
                    'july', 'august', 'september', 'october', 'november', 'december'];
    const monthAbbrevs = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

    months.forEach((month, idx) => {
        if (lowerText.includes(month) || lowerText.includes(monthAbbrevs[idx])) {
            // Find a date/month column
            const dateCol = cols.find(c => /date|month|time|period/i.test(c));
            if (dateCol) {
                // Check if this month value exists in the data
                const monthNum = idx + 1;
                const uniqueVals = [...new Set(data.map(row => row[dateCol]))];

                // Match month in various formats
                const matchedVal = uniqueVals.find(v => {
                    if (v == null) return false;
                    const vStr = String(v).toLowerCase();
                    // Match "March", "Mar", "3", "03", "2024-03", etc.
                    return vStr.includes(month) ||
                           vStr.includes(monthAbbrevs[idx]) ||
                           vStr === String(monthNum) ||
                           vStr === String(monthNum).padStart(2, '0');
                });

                if (matchedVal) {
                    result.filters.push({
                        column: dateCol,
                        values: [String(matchedVal)]
                    });
                }
            }
        }
    });

    return result;
}


// Generate human-readable explanation
function updatePivotExplanation(meta, filters) {
    if (!pivotExplanation) return;

    const aggWord = meta.aggType === 'sum' ? 'SUM' :
                    meta.aggType === 'avg' ? 'AVERAGE' : 'COUNT';

    let text = `${aggWord} of ${meta.valueField || '(value)'} grouped by ${meta.rowField || '(row)'}`;

    if (meta.colField) {
        text += ` and ${meta.colField}`;
    }

    if (filters && filters.length > 0) {
        const filterDesc = filters.map(f => `${f.column} = ${f.values.join(', ')}`).join('; ');
        text += `, filtered to ${filterDesc}`;
    }

    text += '.';
    pivotExplanation.textContent = text;
}

// Show feedback in the NL panel
function showNLFeedback(message, type = 'info') {
    console.log('showNLFeedback:', message, type);

    if (!nlFeedbackDisplay) {
        console.error('nlFeedbackDisplay element not found!');
        return;
    }

    nlFeedbackDisplay.classList.remove('hidden', 'text-red-600', 'text-green-600', 'text-gray-600');

    if (type === 'error') {
        nlFeedbackDisplay.classList.add('text-red-600');
    } else if (type === 'success') {
        nlFeedbackDisplay.classList.add('text-green-600');
    } else {
        nlFeedbackDisplay.classList.add('text-gray-600');
    }

    nlFeedbackDisplay.innerHTML = message;
}

// Build and display pivot (shared logic)
function buildAndDisplayPivot(config, dataRows) {
    if (!config.valueField || !config.rowField) {
        showNLFeedback('Could not determine fields. Please specify a value to measure and a category to group by.', 'error');
        return false;
    }

    // Build pivot
    const pivotResult = pivot(dataRows, config.rowField, config.colField || '', config.valueField, config.aggType);

    // Store for later use
    lastPivotResult = pivotResult;
    lastPivotMeta = { ...config, dataRows: dataRows.length };

    // Update title
    const aggWord = config.aggType === 'sum' ? 'Total' : config.aggType === 'avg' ? 'Average' : 'Count of';
    const titleText = config.colField
        ? `${aggWord} ${config.valueField} by ${config.rowField} & ${config.colField}`
        : `${aggWord} ${config.valueField} by ${config.rowField}`;

    if (pivotTitle) {
        pivotTitle.textContent = titleText;
    }

    // Update explanation
    updatePivotExplanation(config, currentFilters);

    // Render chart
    renderPivotResultChart(pivotResult, config);

    // Render table
    renderPivotResultTable(pivotResult, config);

    // Show the result card
    if (pivotResultCard) {
        pivotResultCard.classList.remove('hidden');
    }

    return true;
}

// Render chart in the pivot result card
function renderPivotResultChart(pivotResult, config) {
    if (!pivotChartContainer) return;

    // Destroy existing chart
    if (pivotChart) {
        pivotChart.destroy();
        pivotChart = null;
    }

    // Reset canvas
    pivotChartContainer.innerHTML = '<canvas id="pivot-chart"></canvas>';
    const canvas = document.getElementById('pivot-chart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const chartData = prepareChartData(pivotResult, config);
    pivotChart = new Chart(ctx, chartData);
}

// Render table in the pivot result card
function renderPivotResultTable(pivotResult, config) {
    if (!pivotTableContainer) return;

    const { rowKeys, colKeys, getValue } = pivotResult;
    const { rowField, colField, valueField, aggType } = config;

    let html = '<table class="w-full border-collapse"><thead><tr class="bg-gray-50">';
    html += `<th class="border border-gray-200 px-2 py-1 text-left font-medium">${escapeHtml(rowField)}</th>`;

    if (colField) {
        colKeys.forEach(ck => {
            html += `<th class="border border-gray-200 px-2 py-1 text-right font-medium">${escapeHtml(String(ck))}</th>`;
        });
    } else {
        const aggLabel = aggType.charAt(0).toUpperCase() + aggType.slice(1);
        html += `<th class="border border-gray-200 px-2 py-1 text-right font-medium">${aggLabel} of ${escapeHtml(valueField)}</th>`;
    }

    html += '</tr></thead><tbody>';

    rowKeys.forEach(rk => {
        html += '<tr class="hover:bg-gray-50">';
        html += `<td class="border border-gray-200 px-2 py-1 font-medium">${escapeHtml(String(rk))}</td>`;
        colKeys.forEach(ck => {
            const value = getValue(rk, ck);
            const displayValue = value != null ? formatNumber(value, aggType) : '-';
            html += `<td class="border border-gray-200 px-2 py-1 text-right">${displayValue}</td>`;
        });
        html += '</tr>';
    });

    html += '</tbody></table>';
    pivotTableContainer.innerHTML = html;
}

// ========================================
// TAB SWITCHING
// ========================================

function switchTab(tab) {
    if (tab === 'chat') {
        if (tabChat) tabChat.classList.add('active');
        if (tabDashboard) tabDashboard.classList.remove('active');
        if (chatTabContent) chatTabContent.classList.remove('hidden');
        if (dashboardTabContent) dashboardTabContent.classList.add('hidden');
    } else if (tab === 'dashboard') {
        if (tabChat) tabChat.classList.remove('active');
        if (tabDashboard) tabDashboard.classList.add('active');
        if (chatTabContent) chatTabContent.classList.add('hidden');
        if (dashboardTabContent) dashboardTabContent.classList.remove('hidden');

        // Re-render charts when dashboard becomes visible (Chart.js needs visible canvas)
        requestAnimationFrame(() => {
            rerenderAllDashboardCharts();
        });
    }
}

function updateDashboardBadge() {
    const count = dashboardCharts ? dashboardCharts.length : 0;
    if (dashboardCount) {
        dashboardCount.textContent = count;
        if (count > 0) {
            dashboardCount.classList.remove('hidden');
        } else {
            dashboardCount.classList.add('hidden');
        }
    }

    // Show/hide empty state and clear button
    if (dashboardEmptyState) {
        if (count > 0) {
            dashboardEmptyState.classList.add('hidden');
        } else {
            dashboardEmptyState.classList.remove('hidden');
        }
    }
    if (clearAllPinsBtn) {
        if (count > 0) {
            clearAllPinsBtn.classList.remove('hidden');
        } else {
            clearAllPinsBtn.classList.add('hidden');
        }
    }
}

function updateFilterBadge() {
    const count = Object.keys(globalSlicerFilters).length;
    if (filterBadge) {
        filterBadge.textContent = count;
        if (count > 0) {
            filterBadge.classList.remove('hidden');
        } else {
            filterBadge.classList.add('hidden');
        }
    }
}

// ========================================
// CHAT-FIRST CONVERSATION SYSTEM
// ========================================

// Main entry point: handle user query from chat bar
async function handleUserQuery() {
    const text = chatInput ? chatInput.value.trim() : '';

    console.log('[Chat] handleUserQuery called');
    console.log('[Chat] Query text:', text);

    if (!text) {
        showAlert('Type a question about your data first.', 'warning');
        return;
    }

    if (!allRows || allRows.length === 0) {
        showAlert('Upload a file before asking questions.', 'warning');
        return;
    }

    // Clear the input
    if (chatInput) chatInput.value = '';

    // Hide empty state
    if (conversationEmptyState) {
        conversationEmptyState.classList.add('hidden');
    }

    // Show clear button
    if (clearConversationBtn) {
        clearConversationBtn.classList.remove('hidden');
    }

    // Create a new analysis card
    const cardId = `analysis-${++analysisCounter}`;
    const card = createAnalysisCard(cardId, text);

    if (conversationContainer) {
        conversationContainer.appendChild(card);
        card.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }

    // Parse the natural language query - use AI if available, else fallback to regex
    console.log('[Chat] Parsing query... (AI enabled:', aiEnabled, ')');
    let config;

    if (aiEnabled) {
        try {
            // Use AI to interpret the query
            const aiResult = await interpretQueryWithAI(text);
            console.log('[Chat] AI interpretation:', aiResult);

            // Normalize filters: AI returns {column, value} but we need {column, values[]}
            let normalizedFilters = (aiResult.filters || []).map(f => ({
                column: f.column,
                values: f.values || (f.value ? [f.value] : [])
            }));

            // Handle timeGrouping - use derived Month/Quarter columns
            let rowField = aiResult.rowField || null;

            // Find date-related columns
            const monthCol = columnNames.find(c => c.endsWith('_Month'));
            const quarterCol = columnNames.find(c => c.endsWith('_Quarter'));

            // Quarter value mapping - matches preprocessDates() format (just "Q1", "Q2", etc.)
            const quarterMap = {
                'Q1': 'Q1',
                'Q2': 'Q2',
                'Q3': 'Q3',
                'Q4': 'Q4'
            };

            // STEP 1: Detect month filter (AI or fallback) BEFORE handling timeGrouping
            let hasMonthFilter = !!aiResult.monthFilter;
            if (aiResult.monthFilter && monthCol) {
                normalizedFilters.push({
                    column: monthCol,
                    values: [aiResult.monthFilter]
                });
                console.log('[Chat] Added AI month filter:', aiResult.monthFilter);
            } else if (monthCol) {
                // Fallback: check query text for month mentions
                const monthMatch = text.toLowerCase().match(/\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/i);
                if (monthMatch) {
                    const monthName = monthMatch[1].charAt(0).toUpperCase() + monthMatch[1].slice(1).toLowerCase();
                    normalizedFilters.push({
                        column: monthCol,
                        values: [monthName]
                    });
                    hasMonthFilter = true;
                    console.log('[Chat] Added fallback month filter:', monthName);
                }
            }

            // STEP 2: Detect quarter filter (AI or fallback) BEFORE handling timeGrouping
            let hasQuarterFilter = !!aiResult.quarterFilter;
            if (aiResult.quarterFilter && quarterCol) {
                const quarterValue = quarterMap[aiResult.quarterFilter] || aiResult.quarterFilter;
                normalizedFilters.push({
                    column: quarterCol,
                    values: [quarterValue]
                });
                console.log('[Chat] Added AI quarter filter:', quarterValue);
            } else if (quarterCol) {
                // Fallback: check query text for quarter mentions
                const lowerText = text.toLowerCase();
                let detectedQuarter = null;

                if (/\b(q1|first quarter|1st quarter)\b/.test(lowerText)) {
                    detectedQuarter = 'Q1';
                } else if (/\b(q2|second quarter|2nd quarter)\b/.test(lowerText)) {
                    detectedQuarter = 'Q2';
                } else if (/\b(q3|third quarter|3rd quarter)\b/.test(lowerText)) {
                    detectedQuarter = 'Q3';
                } else if (/\b(q4|fourth quarter|4th quarter)\b/.test(lowerText)) {
                    detectedQuarter = 'Q4';
                }

                if (detectedQuarter) {
                    normalizedFilters.push({
                        column: quarterCol,
                        values: [detectedQuarter]
                    });
                    hasQuarterFilter = true;
                    console.log('[Chat] Added fallback quarter filter:', detectedQuarter);
                }
            }

            // STEP 3: Handle timeGrouping for row grouping
            // Only change rowField if user wants to GROUP BY time, not FILTER BY time
            if (aiResult.timeGrouping) {
                if (aiResult.timeGrouping === 'month' && monthCol && !hasMonthFilter) {
                    rowField = monthCol;
                    console.log('[Chat] Grouping by month column:', monthCol);
                } else if (aiResult.timeGrouping === 'quarter' && quarterCol && !hasQuarterFilter) {
                    rowField = quarterCol;
                    console.log('[Chat] Grouping by quarter column:', quarterCol);
                }
            }

            // STEP 4: If we detected a time filter but AI set rowField to a date column, fix it
            // User asking "which salesperson in Q1" should group by Salesperson, not Date
            if (hasQuarterFilter || hasMonthFilter) {
                const lowerText = text.toLowerCase();
                // Check if user is asking about a categorical dimension
                const askingAbout = lowerText.match(/which\s+(\w+)|by\s+(\w+)|per\s+(\w+)/i);
                if (askingAbout) {
                    const targetField = askingAbout[1] || askingAbout[2] || askingAbout[3];
                    // Find matching column
                    const matchedCol = columnNames.find(c =>
                        c.toLowerCase().includes(targetField.toLowerCase())
                    );
                    if (matchedCol && matchedCol !== quarterCol && matchedCol !== monthCol) {
                        rowField = matchedCol;
                        console.log('[Chat] Detected user wants to group by:', matchedCol);
                    }
                }
            }

            // Map AI result to config structure
            config = {
                rowField: rowField,
                colField: aiResult.colField || null,
                valueField: aiResult.valueField || null,
                aggType: aiResult.aggType || 'sum',
                filters: normalizedFilters,
                chartType: aiResult.chartType || 'bar',
                computedColumns: aiResult.computedColumns || null
            };
        } catch (err) {
            console.warn('[Chat] AI interpretation failed, using fallback:', err);
            config = guessLayoutFromTextImproved(text, columnNames, filteredRows);
        }
    } else {
        // Fallback to regex-based parsing
        config = guessLayoutFromTextImproved(text, columnNames, filteredRows);
    }

    console.log('[Chat] Parsed config:', config);

    // Apply computed columns if any
    let dataToUse = filteredRows;
    if (config.computedColumns) {
        dataToUse = addComputedColumns(filteredRows, config.computedColumns);
    }

    // Apply filters
    const dataRows = applyFiltersToRows(dataToUse, config.filters || []);
    console.log('[Chat] Data rows after filter:', dataRows.length);

    // Build and display in the card
    buildAndDisplayPivotInCard(config, dataRows, cardId);

    // Store for potential dashboard pinning
    lastPivotMeta = { ...config, cardId };
    currentFilters = config.filters || [];
}

// Create an analysis card element with conversational styling
function createAnalysisCard(cardId, userText) {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const wrapper = document.createElement('div');
    wrapper.className = 'space-y-3';
    wrapper.id = cardId;

    wrapper.innerHTML = `
        <!-- User Query Bubble -->
        <div class="flex justify-end">
            <div class="user-query-bubble">${escapeHtml(userText)}</div>
        </div>

        <!-- AI Response Card -->
        <div class="analysis-card">
            <!-- AI Header -->
            <div class="ai-response-header">
                <div class="ai-avatar">AI</div>
                <span class="ai-label">Analysis</span>
                <span class="analysis-timestamp">${timestamp}</span>
                <button type="button" class="btn-close-card ml-2" onclick="removeAnalysisCard('${cardId}')">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                </button>
            </div>

            <!-- Explanation -->
            <div class="analysis-card-content">
                <div id="${cardId}-explanation" class="analysis-explanation"></div>

                <!-- Chart -->
                <div id="${cardId}-chart-container" class="analysis-chart-container">
                    <canvas id="${cardId}-chart"></canvas>
                </div>
            </div>

            <!-- Footer with actions -->
            <div class="analysis-card-footer">
                <span id="${cardId}-meta" class="analysis-meta"></span>
                <div class="analysis-actions flex items-center gap-2">
                    <select id="${cardId}-chart-type" class="text-sm border rounded px-2 py-1">
                        <option value="bar">Bar</option>
                        <option value="horizontalBar">H-Bar</option>
                        <option value="line">Line</option>
                        <option value="area">Area</option>
                        <option value="pie">Pie</option>
                        <option value="doughnut">Doughnut</option>
                        <option value="table">Table</option>
                    </select>
                    <label class="flex items-center gap-1 text-xs text-gray-600 cursor-pointer">
                        <input type="checkbox" id="${cardId}-show-labels" class="w-3 h-3">
                        <span>Labels</span>
                    </label>
                    <button type="button" id="${cardId}-add-btn" class="btn-pin">
                        + Dashboard
                    </button>
                </div>
            </div>

            <!-- Table toggle (before table so it's always visible) -->
            <button type="button" id="${cardId}-table-toggle" class="analysis-table-toggle" onclick="toggleAnalysisTable('${cardId}')">
                Show data table ▼
            </button>

            <!-- Expandable Table -->
            <div id="${cardId}-table-wrapper" class="hidden">
                <div id="${cardId}-table" class="analysis-table-container"></div>
            </div>
        </div>
    `;

    return wrapper;
}

// Toggle table visibility
function toggleAnalysisTable(cardId) {
    const wrapper = document.getElementById(`${cardId}-table-wrapper`);
    const toggle = document.getElementById(`${cardId}-table-toggle`);

    if (wrapper) {
        const isHidden = wrapper.classList.contains('hidden');
        wrapper.classList.toggle('hidden');

        if (toggle) {
            toggle.textContent = isHidden ? 'Hide data table ▲' : 'Show data table ▼';
        }
    }
}

// Build and display pivot in a specific card
function buildAndDisplayPivotInCard(config, dataRows, cardId) {
    const explanationEl = document.getElementById(`${cardId}-explanation`);
    const metaEl = document.getElementById(`${cardId}-meta`);
    const chartContainer = document.getElementById(`${cardId}-chart-container`);
    const tableEl = document.getElementById(`${cardId}-table`);
    const chartTypeEl = document.getElementById(`${cardId}-chart-type`);
    const addBtn = document.getElementById(`${cardId}-add-btn`);

    // Validation - allow null rowField if singleValue mode
    if (!config.valueField) {
        if (explanationEl) {
            explanationEl.innerHTML = `<span class="text-amber-600">I couldn't map that to your columns. Try mentioning specific column names like: ${columnNames.slice(0, 3).join(', ')}</span>`;
        }
        if (chartContainer) chartContainer.innerHTML = '';
        return;
    }

    if (!dataRows || dataRows.length === 0) {
        if (explanationEl) {
            explanationEl.innerHTML = '<span class="text-amber-600">No rows matched your filters.</span>';
        }
        if (chartContainer) chartContainer.innerHTML = '';
        return;
    }

    // Handle single value mode (no grouping - just show one total)
    if (config.singleValue || config.chartType === 'number' || !config.rowField) {
        const total = dataRows.reduce((sum, row) => {
            const val = parseFloat(row[config.valueField]) || 0;
            return sum + val;
        }, 0);

        // Format the total
        const formattedTotal = config.valueField.toLowerCase().includes('amount') ||
                               config.valueField.toLowerCase().includes('sales') ||
                               config.valueField.toLowerCase().includes('price')
            ? '$' + total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
            : total.toLocaleString();

        // Update explanation
        if (explanationEl) {
            const aggWord = config.aggType === 'sum' ? 'Total' : config.aggType === 'avg' ? 'Average' : 'Count';
            let text = `${aggWord} ${config.valueField}`;
            if (config.filters && config.filters.length > 0) {
                const filterDesc = config.filters.map(f => `${f.column} = ${f.values.join(', ')}`).join('; ');
                text += ` (${filterDesc})`;
            }
            explanationEl.textContent = text;
        }

        // Display as a big number card
        if (chartContainer) {
            chartContainer.innerHTML = `
                <div class="flex flex-col items-center justify-center py-8">
                    <div class="text-5xl font-bold text-indigo-600 mb-2">${formattedTotal}</div>
                    <div class="text-sm text-gray-500">${config.valueField}</div>
                </div>
            `;
        }

        // Meta
        if (metaEl) {
            metaEl.textContent = `${dataRows.length} rows`;
        }

        // Hide chart type selector for single values
        if (chartTypeEl) {
            chartTypeEl.closest('.flex')?.classList.add('hidden');
        }

        // Store for potential dashboard use
        if (!window.cardData) window.cardData = {};
        window.cardData[cardId] = { config, dataRows, total };

        return;
    }

    // Validation for chart mode - need rowField
    if (!config.rowField) {
        if (explanationEl) {
            explanationEl.innerHTML = `<span class="text-amber-600">I couldn't determine how to group your data. Try "by product" or "by salesperson".</span>`;
        }
        if (chartContainer) chartContainer.innerHTML = '';
        return;
    }

    // Build pivot
    const pivotResult = pivot(dataRows, config.rowField, config.colField || '', config.valueField, config.aggType);

    // Store for this card
    if (!window.cardData) window.cardData = {};
    window.cardData[cardId] = { config, pivotResult, dataRows };

    // Explanation
    if (explanationEl) {
        const aggWord = config.aggType === 'sum' ? 'SUM' : config.aggType === 'avg' ? 'AVERAGE' : 'COUNT';
        let text = `${aggWord} of ${config.valueField} grouped by ${config.rowField}`;
        if (config.colField) text += ` and ${config.colField}`;

        // Show NL-inferred filters
        if (config.filters && config.filters.length > 0) {
            const filterDesc = config.filters.map(f => `${f.column} = ${f.values.join(', ')}`).join('; ');
            text += ` (query filter: ${filterDesc})`;
        }

        // Show global slicer filters if any are active
        const globalFilterEntries = Object.entries(globalSlicerFilters);
        if (globalFilterEntries.length > 0) {
            const globalDesc = globalFilterEntries.map(([col, val]) => `${col} = ${val}`).join('; ');
            text += ` [Global: ${globalDesc}]`;
        }

        explanationEl.textContent = text;
    }

    // Meta
    if (metaEl) {
        metaEl.textContent = `${dataRows.length} rows`;
    }

    // Set chart type selector
    if (chartTypeEl) {
        chartTypeEl.value = config.chartType || 'bar';
        chartTypeEl.addEventListener('change', () => {
            const newType = chartTypeEl.value;
            const data = window.cardData[cardId];
            const showLabelsEl = document.getElementById(`${cardId}-show-labels`);
            const showLabels = showLabelsEl ? showLabelsEl.checked : false;
            if (data) {
                renderChartInCard(cardId, data.pivotResult, { ...data.config, chartType: newType, showLabels });
                window.cardData[cardId].config.chartType = newType;
            }
        });
    }

    // Set up labels toggle
    const showLabelsEl = document.getElementById(`${cardId}-show-labels`);
    if (showLabelsEl) {
        showLabelsEl.addEventListener('change', () => {
            const data = window.cardData[cardId];
            if (data) {
                const showLabels = showLabelsEl.checked;
                renderChartInCard(cardId, data.pivotResult, { ...data.config, showLabels });
                window.cardData[cardId].config.showLabels = showLabels;
            }
        });
    }

    // Render chart
    renderChartInCard(cardId, pivotResult, config);

    // Render table
    if (tableEl) {
        tableEl.innerHTML = renderPivotTableHTML(pivotResult, config);
    }

    // Wire up add to dashboard button
    if (addBtn) {
        addBtn.addEventListener('click', () => {
            const data = window.cardData[cardId];
            if (data) {
                addToDashboardFromCard(data.config, data.pivotResult);
            }
        });
    }
}

// Render chart in a specific card
function renderChartInCard(cardId, pivotResult, config) {
    const container = document.getElementById(`${cardId}-chart-container`);
    if (!container) return;

    // Destroy existing chart
    if (analysisCharts[cardId]) {
        analysisCharts[cardId].destroy();
        delete analysisCharts[cardId];
    }

    // Handle "table" type - render as HTML table instead of chart
    if (config.chartType === 'table') {
        container.innerHTML = renderPivotTableHTML(pivotResult, config);
        return;
    }

    // Reset canvas
    container.innerHTML = `<canvas id="${cardId}-chart"></canvas>`;
    const canvas = document.getElementById(`${cardId}-chart`);
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const chartData = prepareChartData(pivotResult, config);
    analysisCharts[cardId] = new Chart(ctx, chartData);
}

// Render pivot table as HTML string
function renderPivotTableHTML(pivotResult, config) {
    const { rowKeys, colKeys, getValue } = pivotResult;
    const { rowField, colField, valueField, aggType } = config;

    let html = '<table class="w-full border-collapse text-xs"><thead><tr class="bg-gray-50">';
    html += `<th class="border border-gray-200 px-2 py-1 text-left font-medium">${escapeHtml(rowField)}</th>`;

    if (colField) {
        colKeys.forEach(ck => {
            html += `<th class="border border-gray-200 px-2 py-1 text-right font-medium">${escapeHtml(String(ck))}</th>`;
        });
    } else {
        const aggLabel = aggType.charAt(0).toUpperCase() + aggType.slice(1);
        html += `<th class="border border-gray-200 px-2 py-1 text-right font-medium">${aggLabel} of ${escapeHtml(valueField)}</th>`;
    }

    html += '</tr></thead><tbody>';

    rowKeys.forEach(rk => {
        html += '<tr class="hover:bg-gray-50">';
        html += `<td class="border border-gray-200 px-2 py-1 font-medium">${escapeHtml(String(rk))}</td>`;
        colKeys.forEach(ck => {
            const value = getValue(rk, ck);
            const displayValue = value != null ? formatNumber(value, aggType) : '-';
            html += `<td class="border border-gray-200 px-2 py-1 text-right">${displayValue}</td>`;
        });
        html += '</tr>';
    });

    html += '</tbody></table>';
    return html;
}

// Remove an analysis card
function removeAnalysisCard(cardId) {
    // Destroy chart
    if (analysisCharts[cardId]) {
        analysisCharts[cardId].destroy();
        delete analysisCharts[cardId];
    }

    // Remove card data
    if (window.cardData && window.cardData[cardId]) {
        delete window.cardData[cardId];
    }

    // Remove DOM element
    const card = document.getElementById(cardId);
    if (card) {
        card.remove();
    }

    // Check if conversation is empty
    checkConversationEmpty();
}

// Check if conversation is empty and show/hide empty state
function checkConversationEmpty() {
    if (!conversationContainer) return;

    const cards = conversationContainer.querySelectorAll('[id^="analysis-"]');
    if (cards.length === 0) {
        if (conversationEmptyState) conversationEmptyState.classList.remove('hidden');
        if (clearConversationBtn) clearConversationBtn.classList.add('hidden');
    }
}

// Clear all conversation
function handleClearConversation() {
    // Destroy all charts
    Object.keys(analysisCharts).forEach(cardId => {
        if (analysisCharts[cardId]) {
            analysisCharts[cardId].destroy();
        }
    });
    analysisCharts = {};

    // Clear card data
    window.cardData = {};

    // Remove all analysis cards
    if (conversationContainer) {
        const cards = conversationContainer.querySelectorAll('[id^="analysis-"]');
        cards.forEach(card => card.remove());
    }

    // Reset counter
    analysisCounter = 0;

    // Show empty state
    if (conversationEmptyState) conversationEmptyState.classList.remove('hidden');
    if (clearConversationBtn) clearConversationBtn.classList.add('hidden');

    showAlert('Conversation cleared.', 'info');
}

// Add to dashboard from a card
function addToDashboardFromCard(config, pivotResult) {
    // Show dashboard section
    if (dashboardSection) {
        dashboardSection.classList.remove('hidden');
    }

    // Create dashboard chart
    createDashboardChart({
        ...config,
        title: `${config.aggType === 'sum' ? 'Total' : config.aggType === 'avg' ? 'Average' : 'Count of'} ${config.valueField} by ${config.rowField}`,
        filters: currentFilters.map(f => ({ ...f }))
    });

    showAlert('Added to dashboard!', 'success');
}

// Re-render all conversation cards with current filteredRows
function rerenderAllConversationCards() {
    if (!window.cardData) return;

    Object.keys(window.cardData).forEach(cardId => {
        const data = window.cardData[cardId];
        if (!data || !data.config) return;

        const config = data.config;

        // Apply global filters first, then any NL-inferred filters
        const dataRows = applyFiltersToRows(filteredRows, config.filters || []);

        // Update stored data
        window.cardData[cardId].dataRows = dataRows;

        // Update explanation with current global filters
        const explanationEl = document.getElementById(`${cardId}-explanation`);
        if (explanationEl) {
            const aggWord = config.aggType === 'sum' ? 'SUM' : config.aggType === 'avg' ? 'AVERAGE' : 'COUNT';
            let text = `${aggWord} of ${config.valueField} grouped by ${config.rowField}`;
            if (config.colField) text += ` and ${config.colField}`;

            if (config.filters && config.filters.length > 0) {
                const filterDesc = config.filters.map(f => `${f.column} = ${f.values.join(', ')}`).join('; ');
                text += ` (query filter: ${filterDesc})`;
            }

            const globalFilterEntries = Object.entries(globalSlicerFilters);
            if (globalFilterEntries.length > 0) {
                const globalDesc = globalFilterEntries.map(([col, val]) => `${col} = ${val}`).join('; ');
                text += ` [Global: ${globalDesc}]`;
            }

            explanationEl.textContent = text;
        }

        // Re-build pivot with new data
        if (config.rowField && config.valueField && dataRows.length > 0) {
            const pivotResult = pivot(dataRows, config.rowField, config.colField || '', config.valueField, config.aggType);
            window.cardData[cardId].pivotResult = pivotResult;

            // Re-render chart
            renderChartInCard(cardId, pivotResult, config);

            // Update table
            const tableEl = document.getElementById(`${cardId}-table`);
            if (tableEl) {
                tableEl.innerHTML = renderPivotTableHTML(pivotResult, config);
            }

            // Update meta
            const metaEl = document.getElementById(`${cardId}-meta`);
            if (metaEl) {
                metaEl.textContent = `${dataRows.length} rows`;
            }
        } else {
            // No data matches filters
            const metaEl = document.getElementById(`${cardId}-meta`);
            if (metaEl) {
                metaEl.textContent = `0 rows (filters exclude all data)`;
            }

            // Clear chart
            const chartContainer = document.getElementById(`${cardId}-chart-container`);
            if (chartContainer) {
                if (analysisCharts[cardId]) {
                    analysisCharts[cardId].destroy();
                    delete analysisCharts[cardId];
                }
                chartContainer.innerHTML = '<div class="flex items-center justify-center h-full text-gray-400 text-sm">No data with current filters</div>';
            }
        }
    });
}

// PIN CHART FUNCTIONALITY

// Handle pin chart
function handlePinChart() {
    if (!lastPivotResult || !lastPivotMeta) {
        showAlert('No chart to pin. Create a visualization first.', 'warning');
        return;
    }

    // Create a unique ID for this pinned chart
    const chartId = `pinned-${Date.now()}`;

    // Store the chart configuration
    const pinnedChart = {
        id: chartId,
        config: { ...lastPivotMeta },
        pivotResult: { ...lastPivotResult },
        timestamp: new Date().toLocaleTimeString()
    };

    pinnedCharts.push(pinnedChart);

    // Render the pinned charts gallery
    renderPinnedCharts();

    // Show the pinned charts section
    pinnedChartsSection.classList.remove('hidden');

    showAlert('📌 Chart pinned! Create another query to compare.', 'success');
}

// Handle clear all pins
function handleClearAllPins() {
    if (pinnedCharts.length === 0) return;

    // Destroy all pinned chart instances
    Object.values(pinnedChartInstances).forEach(chart => {
        if (chart) chart.destroy();
    });

    pinnedCharts = [];
    pinnedChartInstances = {};
    pinnedChartsSection.classList.add('hidden');
    showAlert('All pinned charts cleared.', 'info');
}

// Render pinned charts gallery
function renderPinnedCharts() {
    pinnedChartsGrid.innerHTML = '';

    pinnedCharts.forEach((pinnedChart, index) => {
        const { id, config, pivotResult, timestamp } = pinnedChart;
        const { rowField, colField, valueField, aggType, chartType } = config;

        // Create card
        const card = document.createElement('div');
        card.className = 'bg-white rounded-lg shadow-md p-4 border border-gray-200';

        const aggWord = aggType === 'sum' ? 'Total' : aggType === 'avg' ? 'Average' : 'Count of';
        const title = colField
            ? `${aggWord} ${valueField} by ${rowField} & ${colField}`
            : `${aggWord} ${valueField} by ${rowField}`;

        card.innerHTML = `
            <div class="flex items-start justify-between mb-3">
                <div class="flex-1">
                    <h4 class="font-bold text-sm text-gray-800 mb-1">${escapeHtml(title)}</h4>
                    <p class="text-xs text-gray-500">Created at ${timestamp}</p>
                </div>
                <button class="unpin-btn text-red-500 hover:text-red-700 font-bold text-lg leading-none" data-id="${id}">&times;</button>
            </div>
            <div class="chart-wrapper" style="height: 250px; position: relative;">
                <canvas id="canvas-${id}"></canvas>
            </div>
        `;

        pinnedChartsGrid.appendChild(card);

        // Add unpin listener
        card.querySelector('.unpin-btn').addEventListener('click', () => unpinChart(id));

        // Render the chart after DOM is updated
        setTimeout(() => renderPinnedChart(id, pivotResult, config), 10);
    });
}

// Render a single pinned chart
function renderPinnedChart(chartId, pivotResult, config) {
    const canvas = document.getElementById(`canvas-${chartId}`);
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    // Destroy existing chart if it exists
    if (pinnedChartInstances[chartId]) {
        pinnedChartInstances[chartId].destroy();
    }

    // Prepare chart data (reuse existing function)
    const chartData = prepareChartData(pivotResult, config);

    // Create chart
    pinnedChartInstances[chartId] = new Chart(ctx, chartData);
}

// Unpin a chart
function unpinChart(chartId) {
    // Destroy the chart instance
    if (pinnedChartInstances[chartId]) {
        pinnedChartInstances[chartId].destroy();
        delete pinnedChartInstances[chartId];
    }

    // Remove from array
    pinnedCharts = pinnedCharts.filter(chart => chart.id !== chartId);

    // Re-render
    if (pinnedCharts.length === 0) {
        pinnedChartsSection.classList.add('hidden');
    } else {
        renderPinnedCharts();
    }

    showAlert('Chart unpinned.', 'info');
}

// ========================================
// BACKEND API INTEGRATION
// ========================================

// Initialize AI status on load
async function initializeAI() {
    try {
        const response = await fetch(`${API_BASE_URL}/health`);
        const data = await response.json();

        if (data.aiConfigured) {
            aiEnabled = true;
            aiStatusText.textContent = 'AI: Enabled ✓';
            aiStatusText.classList.add('text-green-600');
        } else {
            aiEnabled = false;
            aiStatusText.textContent = 'AI: Not configured on server';
            aiStatusText.classList.remove('text-green-600');
        }
    } catch (error) {
        console.error('Failed to check AI status:', error);
        aiStatusText.textContent = 'AI: Server not running';
        aiStatusText.classList.remove('text-green-600');
    }
}

// Handle save API key (now just shows instructions)
function handleSaveApiKey() {
    showAlert('Please add your OpenAI API key to the .env file on the server and restart.', 'info');
    settingsModal.classList.add('hidden');
}

// Handle clear API key
function handleClearApiKey() {
    showAlert('To disable AI, remove the OPENAI_API_KEY from .env and restart the server.', 'info');
}

// Generate AI suggestions after file upload
async function generateAISuggestions() {
    if (!aiEnabled) {
        aiSuggestionsSection.classList.add('hidden');
        return;
    }

    aiSuggestionsSection.classList.remove('hidden');
    aiSuggestionsLoading.classList.remove('hidden');
    aiSuggestionsGrid.innerHTML = '';

    try {
        // Build data summary for AI
        const sampleData = filteredRows.slice(0, 3).map(row => {
            const sample = {};
            columnNames.forEach(col => sample[col] = row[col]);
            return sample;
        });

        const columnTypes = {};
        columnNames.forEach(col => {
            columnTypes[col] = columnProfiles[col]?.type || 'text';
        });

        const response = await fetch(`${API_BASE_URL}/suggestions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                columns: columnNames,
                columnTypes: columnTypes,
                rowCount: filteredRows.length,
                sampleData: sampleData
            })
        });

        if (!response.ok) {
            throw new Error('Failed to generate suggestions');
        }

        const data = await response.json();
        aiSuggestions = data.suggestions;

        // Render suggestions
        renderAISuggestions(data.suggestions);

        aiSuggestionsLoading.classList.add('hidden');

    } catch (error) {
        console.error('AI suggestion error:', error);
        aiSuggestionsLoading.classList.add('hidden');
        aiSuggestionsGrid.innerHTML = '<p class="text-red-600 text-sm">Could not generate suggestions. Check server connection.</p>';
    }
}

// Render AI suggestions
function renderAISuggestions(suggestions) {
    aiSuggestionsGrid.innerHTML = '';

    suggestions.forEach((suggestion, index) => {
        const chip = document.createElement('button');
        chip.className = 'suggestion-chip px-4 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-sm hover:bg-blue-600 hover:text-white transition font-medium';
        chip.textContent = suggestion;
        chip.dataset.index = index;

        // Single click = execute immediately and pin
        chip.addEventListener('click', async () => {
            // Show loading state
            chip.classList.add('bg-blue-600', 'text-white');
            chip.textContent = '⏳ Creating...';

            try {
                // Set the query and execute
                nlQuery.value = suggestion;
                await handleShowMe();

                // Auto-pin the result
                if (lastPivotResult && lastPivotMeta) {
                    handlePinChart();
                }

                // Reset button
                chip.textContent = suggestion;
                chip.classList.remove('bg-blue-600', 'text-white');
                chip.classList.add('bg-green-100', 'text-green-700', 'border-green-300');

                // Scroll to results
                resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            } catch (error) {
                console.error('Error executing suggestion:', error);
                chip.textContent = suggestion;
                chip.classList.remove('bg-blue-600', 'text-white');
                showAlert('Failed to create chart. See console for details.', 'error');
            }
        });

        aiSuggestionsGrid.appendChild(chip);
    });
}

// Toggle suggestion selection
function toggleSuggestion(index, chipElement) {
    if (selectedSuggestions.has(index)) {
        selectedSuggestions.delete(index);
        chipElement.classList.remove('bg-purple-100', 'border-purple-400', 'text-purple-800');
        chipElement.classList.add('bg-blue-50', 'border-blue-200', 'text-blue-700');
    } else {
        selectedSuggestions.add(index);
        chipElement.classList.remove('bg-blue-50', 'border-blue-200', 'text-blue-700');
        chipElement.classList.add('bg-purple-100', 'border-purple-400', 'text-purple-800');
    }

    // Update button
    if (selectedSuggestions.size > 0) {
        runSelectedSuggestionsBtn.classList.remove('hidden');
        selectedCountSpan.textContent = selectedSuggestions.size;
    } else {
        runSelectedSuggestionsBtn.classList.add('hidden');
    }
}

// Handle run selected suggestions
async function handleRunSelectedSuggestions() {
    if (selectedSuggestions.size === 0) return;

    clearAlerts();
    showAlert(`Creating ${selectedSuggestions.size} visualization(s)...`, 'info');

    // Convert selected indexes to queries
    const selectedQueries = Array.from(selectedSuggestions).map(idx => aiSuggestions[idx]);

    // Process each query
    for (const query of selectedQueries) {
        try {
            // Use AI to interpret query
            nlQuery.value = query;
            await handleShowMe();

            // Auto-pin the result
            if (lastPivotResult && lastPivotMeta) {
                handlePinChart();
            }

            // Small delay between charts
            await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
            console.error('Error processing query:', query, error);
        }
    }

    clearAlerts();
    showAlert(`✅ Created ${selectedSuggestions.size} chart(s)! Check your pinned charts above.`, 'success');

    // Reset selections
    selectedSuggestions.clear();
    renderAISuggestions(aiSuggestions);
    runSelectedSuggestionsBtn.classList.add('hidden');
}

// Initialize on page load
initializeAI();

// ========================================
// CHAT-BASED DASHBOARD SYSTEM
// ========================================

// Show welcome message with suggestions
async function showWelcomeMessage() {
    // Add initial assistant message
    const fileCount = new Set(allRows.map(r => r._file)).size;
    const sheetCount = new Set(allRows.map(r => r._sheetKey)).size;

    let welcomeHtml = `<p>I've loaded your data: <strong>${allRows.length} rows</strong> from ${fileCount} file(s).</p>`;
    welcomeHtml += `<p class="mt-2">Your columns are:</p><ul class="text-xs mt-1 space-y-0.5">`;

    columnNames.slice(0, 8).forEach(col => {
        const type = columnProfiles[col]?.type || 'text';
        const icon = type === 'numeric' ? '📊' : '📝';
        welcomeHtml += `<li>${icon} ${escapeHtml(col)} <span class="text-gray-400">(${type})</span></li>`;
    });

    if (columnNames.length > 8) {
        welcomeHtml += `<li class="text-gray-400">...and ${columnNames.length - 8} more</li>`;
    }
    welcomeHtml += `</ul>`;

    // Try to get AI suggestions
    if (aiEnabled) {
        welcomeHtml += `<p class="mt-3">Here are some things you might want to explore:</p>`;
        addChatMessage('assistant', welcomeHtml, true);

        // Fetch suggestions
        try {
            const sampleData = filteredRows.slice(0, 3).map(row => {
                const sample = {};
                columnNames.forEach(col => sample[col] = row[col]);
                return sample;
            });

            const columnTypes = {};
            columnNames.forEach(col => {
                columnTypes[col] = columnProfiles[col]?.type || 'text';
            });

            const response = await fetch(`${API_BASE_URL}/suggestions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    columns: columnNames,
                    columnTypes: columnTypes,
                    rowCount: filteredRows.length,
                    sampleData: sampleData
                })
            });

            if (response.ok) {
                const data = await response.json();
                addSuggestionChips(data.suggestions);
            }
        } catch (error) {
            console.error('Failed to get suggestions:', error);
        }
    } else {
        welcomeHtml += `<p class="mt-3">Ask me anything about your data! For example:</p>`;
        welcomeHtml += `<p class="text-xs text-gray-500 mt-1">"Show me a bar chart of sales by region"</p>`;
        addChatMessage('assistant', welcomeHtml, true);
    }
}

// Add a message to the chat
function addChatMessage(role, content, isHtml = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${role}`;

    if (isHtml) {
        messageDiv.innerHTML = content;
    } else {
        messageDiv.textContent = content;
    }

    chatMessagesContainer.appendChild(messageDiv);
    chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
}

// Add suggestion chips to chat
function addSuggestionChips(suggestions) {
    const chipsContainer = document.createElement('div');
    chipsContainer.className = 'mt-2 flex flex-wrap';

    suggestions.forEach((suggestion, idx) => {
        const chip = document.createElement('button');
        chip.className = 'chat-suggestion-chip';
        chip.textContent = suggestion;
        chip.dataset.nlQuery = suggestion;
        chip.addEventListener('click', () => {
            console.log('[Chat] Suggestion chip clicked:', suggestion);
            // Set chat input and trigger query
            if (chatInput) {
                chatInput.value = suggestion;
            }
            handleUserQuery();
        });
        chipsContainer.appendChild(chip);
    });

    chatMessagesContainer.appendChild(chipsContainer);
    chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
}

// Show typing indicator
function showTypingIndicator() {
    const indicator = document.createElement('div');
    indicator.id = 'typing-indicator';
    indicator.className = 'chat-message assistant';
    indicator.innerHTML = '<div class="typing-indicator"><span></span><span></span><span></span></div>';
    chatMessagesContainer.appendChild(indicator);
    chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
}

// Remove typing indicator
function removeTypingIndicator() {
    const indicator = document.getElementById('typing-indicator');
    if (indicator) indicator.remove();
}

// Handle chat send
async function handleChatSend() {
    const message = chatInput.value.trim();
    if (!message) return;

    // Add user message to chat
    addChatMessage('user', message);
    chatInput.value = '';

    // Add to conversation history
    conversationHistory.push({ role: 'user', content: message });

    // Show typing indicator
    showTypingIndicator();

    try {
        // Build request payload
        const sampleData = filteredRows.slice(0, 3).map(row => {
            const sample = {};
            columnNames.forEach(col => sample[col] = row[col]);
            return sample;
        });

        const columnTypes = {};
        columnNames.forEach(col => {
            columnTypes[col] = columnProfiles[col]?.type || 'text';
        });

        // Get existing chart info for context
        const existingCharts = dashboardCharts.map(chart => ({
            id: chart.id,
            title: chart.config.title || `${chart.config.aggType} of ${chart.config.valueField} by ${chart.config.rowField}`,
            config: chart.config
        }));

        const response = await fetch(`${API_BASE_URL}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: message,
                conversationHistory: conversationHistory.slice(-10), // Last 10 messages for context
                columns: columnNames,
                columnTypes: columnTypes,
                sampleData: sampleData,
                existingCharts: existingCharts
            })
        });

        removeTypingIndicator();

        if (!response.ok) {
            throw new Error('Failed to get response');
        }

        const data = await response.json();

        // Add assistant reply to chat
        addChatMessage('assistant', data.reply);

        // Add to conversation history
        conversationHistory.push({ role: 'assistant', content: data.reply });

        // Process actions
        if (data.actions && data.actions.length > 0) {
            for (const action of data.actions) {
                await processAction(action);
            }
        }

    } catch (error) {
        removeTypingIndicator();
        console.error('Chat error:', error);
        addChatMessage('assistant', 'Sorry, I encountered an error. Please try again.');
    }
}

// Process an action from the AI
async function processAction(action) {
    console.log('Processing action:', action);

    switch (action.type) {
        case 'create_chart':
            createDashboardChart(action.config);
            break;

        case 'update_chart':
            updateDashboardChart(action.chartId, action.updates);
            break;

        case 'remove_chart':
            removeDashboardChart(action.chartId);
            break;

        case 'set_filters':
            setGlobalFiltersFromAction(action.filters);
            break;

        case 'clear_filters':
            clearAllSlicerFilters();
            break;

        default:
            console.warn('Unknown action type:', action.type);
    }
}

// Create a new chart on the dashboard
function createDashboardChart(config) {
    const chartId = `chart_${chartIdCounter++}`;

    // Generate title if not provided
    if (!config.title) {
        const aggWord = config.aggType === 'sum' ? 'Total' : config.aggType === 'avg' ? 'Average' : 'Count of';
        config.title = config.colField
            ? `${aggWord} ${config.valueField} by ${config.rowField} & ${config.colField}`
            : `${aggWord} ${config.valueField} by ${config.rowField}`;
    }

    // Add chart to state
    dashboardCharts.push({
        id: chartId,
        config: { ...config },
        chartInstance: null
    });

    // Update display
    updateChartsDisplay();

    // Render the chart after DOM update - use requestAnimationFrame for reliability
    requestAnimationFrame(() => {
        setTimeout(() => renderDashboardChart(chartId), 100);
    });
}

// Update an existing chart
function updateDashboardChart(chartId, updates) {
    const chart = dashboardCharts.find(c => c.id === chartId);
    if (!chart) {
        console.warn('Chart not found:', chartId);
        return;
    }

    // Apply updates to config
    Object.assign(chart.config, updates);

    // Re-generate title if needed
    if (!updates.title) {
        const config = chart.config;
        const aggWord = config.aggType === 'sum' ? 'Total' : config.aggType === 'avg' ? 'Average' : 'Count of';
        chart.config.title = config.colField
            ? `${aggWord} ${config.valueField} by ${config.rowField} & ${config.colField}`
            : `${aggWord} ${config.valueField} by ${config.rowField}`;
    }

    // Re-render
    updateChartsDisplay();
    requestAnimationFrame(() => {
        setTimeout(() => renderDashboardChart(chartId), 100);
    });
}

// Remove a chart from the dashboard
function removeDashboardChart(chartId) {
    const idx = dashboardCharts.findIndex(c => c.id === chartId);
    if (idx === -1) return;

    // Destroy Chart.js instance
    if (dashboardCharts[idx].chartInstance) {
        dashboardCharts[idx].chartInstance.destroy();
    }

    // Remove from array
    dashboardCharts.splice(idx, 1);

    // Update display
    updateChartsDisplay();
}

// Set global filters from chat action
function setGlobalFiltersFromAction(filters) {
    // Update global filters
    Object.entries(filters).forEach(([column, value]) => {
        globalSlicerFilters[column] = value;
    });

    // Update slicer UI
    document.querySelectorAll('.slicer-select').forEach(select => {
        const col = select.dataset.column;
        if (globalSlicerFilters[col]) {
            select.value = globalSlicerFilters[col];
        }
    });

    // Re-render all charts with new filters
    applyGlobalSlicerFilters();
    updateActiveFiltersDisplay();
}

// Update the charts display (grid vs empty state)
function updateChartsDisplay() {
    // Update dashboard badge count
    updateDashboardBadge();

    if (dashboardCharts.length === 0) {
        // Hide dashboard section when no pinned charts
        if (dashboardSection) dashboardSection.classList.add('hidden');
        if (clearAllPinsBtn) clearAllPinsBtn.classList.add('hidden');
    } else {
        // Show dashboard section with pinned charts
        if (dashboardSection) dashboardSection.classList.remove('hidden');
        if (chartsGrid) chartsGrid.classList.remove('hidden');
        if (clearAllPinsBtn) clearAllPinsBtn.classList.remove('hidden');

        // Render chart cards
        renderChartsGrid();
    }
}

// Render the charts grid
function renderChartsGrid() {
    if (!chartsGrid) return;
    chartsGrid.innerHTML = '';

    dashboardCharts.forEach(chart => {
        const card = document.createElement('div');
        card.className = 'chart-card';
        card.id = `card-${chart.id}`;

        // Generate subtitle from config
        const aggLabel = chart.config.aggType === 'sum' ? 'Sum' : chart.config.aggType === 'avg' ? 'Average' : 'Count';
        const groupBy = chart.config.rowField || 'All';
        const filterParts = (chart.config.filters || []).map(f => `${f.column}=${f.values?.join(',')}`);
        const filterText = filterParts.length > 0 ? ` | Filtered: ${filterParts.join(', ')}` : '';
        const subtitle = `${aggLabel} of ${chart.config.valueField || 'values'} by ${groupBy}${filterText}`;

        card.innerHTML = `
            <div class="chart-card-header">
                <div>
                    <span class="chart-card-title">${escapeHtml(chart.config.title || 'Chart')}</span>
                    <p class="chart-card-subtitle text-xs text-gray-500 mt-0.5">${escapeHtml(subtitle)}</p>
                </div>
                <div class="chart-card-actions flex items-center gap-2">
                    <select id="dash-type-${chart.id}" class="text-xs border rounded px-1.5 py-0.5">
                        <option value="bar" ${chart.config.chartType === 'bar' || !chart.config.chartType ? 'selected' : ''}>Bar</option>
                        <option value="horizontalBar" ${chart.config.chartType === 'horizontalBar' ? 'selected' : ''}>H-Bar</option>
                        <option value="line" ${chart.config.chartType === 'line' ? 'selected' : ''}>Line</option>
                        <option value="area" ${chart.config.chartType === 'area' ? 'selected' : ''}>Area</option>
                        <option value="pie" ${chart.config.chartType === 'pie' ? 'selected' : ''}>Pie</option>
                        <option value="doughnut" ${chart.config.chartType === 'doughnut' ? 'selected' : ''}>Doughnut</option>
                    </select>
                    <label class="flex items-center gap-1 text-xs text-gray-600 cursor-pointer">
                        <input type="checkbox" id="dash-labels-${chart.id}" class="w-3 h-3" ${chart.config.showLabels ? 'checked' : ''}>
                        <span>Labels</span>
                    </label>
                    <button class="chart-delete-btn text-red-500 hover:text-red-700" data-id="${chart.id}">✕</button>
                </div>
            </div>
            <div class="chart-card-body">
                <canvas id="canvas-${chart.id}"></canvas>
            </div>
        `;

        chartsGrid.appendChild(card);

        // Add delete handler
        card.querySelector('.chart-delete-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            removeDashboardChart(chart.id);
        });

        // Add chart type change handler
        const typeSelect = card.querySelector(`#dash-type-${chart.id}`);
        if (typeSelect) {
            typeSelect.addEventListener('change', (e) => {
                chart.config.chartType = e.target.value;
                renderDashboardChart(chart.id);
            });
        }

        // Add labels toggle handler
        const labelsCheckbox = card.querySelector(`#dash-labels-${chart.id}`);
        if (labelsCheckbox) {
            labelsCheckbox.addEventListener('change', (e) => {
                chart.config.showLabels = e.target.checked;
                renderDashboardChart(chart.id);
            });
        }
    });
}

// Render a single dashboard chart
function renderDashboardChart(chartId) {
    const chart = dashboardCharts.find(c => c.id === chartId);
    if (!chart) {
        console.warn(`[Dashboard] Chart not found: ${chartId}`);
        return;
    }

    const canvas = document.getElementById(`canvas-${chartId}`);
    if (!canvas) {
        console.warn(`[Dashboard] Canvas not found: canvas-${chartId}`);
        return;
    }

    const ctx = canvas.getContext('2d');

    // Destroy existing instance
    if (chart.chartInstance) {
        chart.chartInstance.destroy();
    }

    // Get filtered data (respects dashboard filters)
    let dataToUse = getDashboardFilteredData();
    console.log(`[Dashboard] Chart ${chartId}: data rows = ${dataToUse.length}, config =`, chart.config);

    // Apply chart-specific filters, but skip time-based filters if global time filter is active
    if (chart.config.filters && chart.config.filters.length > 0) {
        let filtersToApply = chart.config.filters;

        // If global quarter/month filter is set, skip chart's conflicting time filters
        const hasGlobalQuarter = dashboardFilters['Date_Quarter'] || dashboardFilters['Quarter'];
        const hasGlobalMonth = dashboardFilters['Date_Month'] || dashboardFilters['Month'];

        if (hasGlobalQuarter || hasGlobalMonth) {
            filtersToApply = filtersToApply.filter(f => {
                const colLower = (f.column || '').toLowerCase();
                // Skip month filters if global quarter or month is set
                if (hasGlobalQuarter && colLower.includes('month')) return false;
                if (hasGlobalMonth && colLower.includes('month')) return false;
                // Skip quarter filters if global quarter is set
                if (hasGlobalQuarter && colLower.includes('quarter')) return false;
                return true;
            });
        }

        dataToUse = applyQueryFilters(dataToUse, filtersToApply);
    }

    // Apply computed columns (month, quarter)
    if (chart.config.timeGrouping) {
        const dateCol = columnNames.find(col =>
            /date|month|time/i.test(col) ||
            dataToUse.some(row => !isNaN(Date.parse(row[col])))
        );

        if (dateCol) {
            const computedColName = chart.config.timeGrouping === 'quarter' ? 'Quarter' : 'Month';
            const computedColumns = { [computedColName]: { source: dateCol, type: chart.config.timeGrouping } };
            dataToUse = addComputedColumns(dataToUse, computedColumns);

            // Override rowField if it matches the time grouping
            if (!chart.config.rowField || chart.config.rowField === dateCol) {
                chart.config.rowField = computedColName;
            }
        }
    }

    // Build pivot
    console.log(`[Dashboard] Building pivot: rowField=${chart.config.rowField}, valueField=${chart.config.valueField}, aggType=${chart.config.aggType}`);

    let pivotResult = pivot(
        dataToUse,
        chart.config.rowField,
        chart.config.colField || '',
        chart.config.valueField,
        chart.config.aggType
    );

    console.log(`[Dashboard] Pivot result: rowKeys=${pivotResult.rowKeys?.length}, colKeys=${pivotResult.colKeys?.length}`);

    // Apply sortBy if specified
    if (chart.config.sortBy && pivotResult.rowKeys && pivotResult.rowKeys.length > 0) {
        const sortDir = chart.config.sortBy.direction === 'asc' ? 1 : -1;

        // Create array of {key, value} for sorting using getValue function
        const sortable = pivotResult.rowKeys.map((key, idx) => {
            // Sum up values across all colKeys for this row
            let totalValue = 0;
            pivotResult.colKeys.forEach(ck => {
                const val = pivotResult.getValue(key, ck);
                if (val != null) totalValue += val;
            });
            return { key, value: totalValue, idx };
        });

        sortable.sort((a, b) => sortDir * (a.value - b.value));

        // Rebuild rowKeys in sorted order
        pivotResult.rowKeys = sortable.map(s => s.key);
    }

    // Apply topN if specified
    if (chart.config.topN && pivotResult.rowKeys && pivotResult.rowKeys.length > chart.config.topN) {
        pivotResult.rowKeys = pivotResult.rowKeys.slice(0, chart.config.topN);
    }

    // Prepare chart data
    const chartData = prepareChartData(pivotResult, chart.config);
    console.log(`[Dashboard] Chart data prepared:`, chartData);

    // Create chart
    try {
        chart.chartInstance = new Chart(ctx, chartData);
        console.log(`[Dashboard] Chart ${chartId} created successfully`);
    } catch (err) {
        console.error(`[Dashboard] Error creating chart ${chartId}:`, err);
    }
}

// Get data with global slicer filters applied
function getFilteredData() {
    console.log(`[getFilteredData] allRows: ${allRows.length}, selectedSheets:`, [...selectedSheets]);

    let data = allRows.filter(row => selectedSheets.has(row._sheetKey));
    console.log(`[getFilteredData] After sheet filter: ${data.length} rows`);

    // Apply global slicer filters
    Object.entries(globalSlicerFilters).forEach(([column, value]) => {
        if (value) {
            data = data.filter(row => String(row[column]) === value);
        }
    });

    console.log(`[getFilteredData] After slicer filters: ${data.length} rows`);
    return data;
}

// ========================================
// DASHBOARD KPIs & FILTERS
// ========================================

// DOM elements for dashboard header
const dashboardHeader = document.getElementById('dashboard-header');
const dashboardTitle = document.getElementById('dashboard-title');
const dashboardSubtitle = document.getElementById('dashboard-subtitle');
const kpiTotalQty = document.getElementById('kpi-total-qty');
const kpiTotalSales = document.getElementById('kpi-total-sales');
const kpiTopPerformer = document.getElementById('kpi-top-performer');
const kpiTopProduct = document.getElementById('kpi-top-product');
const dashboardFilterSummary = document.getElementById('dashboard-filter-summary');

// Dashboard filter elements
const filterQuarter = document.getElementById('filter-quarter');
const filterMonth = document.getElementById('filter-month');
const filterProduct = document.getElementById('filter-product');
const filterSalesperson = document.getElementById('filter-salesperson');
const filterRegion = document.getElementById('filter-region');
const clearDashboardFiltersBtn = document.getElementById('clear-dashboard-filters');

// Dashboard filter state (separate from globalSlicerFilters)
let dashboardFilters = {};

// Compute summary statistics from filtered data
function computeSummaryStats(data) {
    if (!data || data.length === 0) {
        return { totalQty: 0, totalSales: 0, topPerformer: '-', topProduct: '-' };
    }

    // Find quantity and sales columns
    const qtyCol = columnNames.find(c => /quantity|qty/i.test(c));
    const salesCol = columnNames.find(c => /sales|amount|revenue/i.test(c));
    const salespersonCol = columnNames.find(c => /salesperson|sales.?person|rep/i.test(c));
    const productCol = columnNames.find(c => /product|item/i.test(c));

    // Calculate totals
    let totalQty = 0;
    let totalSales = 0;
    const performerTotals = {};
    const productTotals = {};

    data.forEach(row => {
        if (qtyCol && row[qtyCol]) {
            totalQty += parseFloat(row[qtyCol]) || 0;
        }
        if (salesCol && row[salesCol]) {
            totalSales += parseFloat(row[salesCol]) || 0;
        }
        if (salespersonCol && row[salespersonCol]) {
            const person = row[salespersonCol];
            performerTotals[person] = (performerTotals[person] || 0) + (parseFloat(row[qtyCol] || row[salesCol]) || 0);
        }
        if (productCol && row[productCol]) {
            const product = row[productCol];
            productTotals[product] = (productTotals[product] || 0) + (parseFloat(row[qtyCol] || row[salesCol]) || 0);
        }
    });

    // Find top performer and product
    let topPerformer = '-';
    let topPerformerVal = 0;
    Object.entries(performerTotals).forEach(([name, val]) => {
        if (val > topPerformerVal) {
            topPerformer = name;
            topPerformerVal = val;
        }
    });

    let topProduct = '-';
    let topProductVal = 0;
    Object.entries(productTotals).forEach(([name, val]) => {
        if (val > topProductVal) {
            topProduct = name;
            topProductVal = val;
        }
    });

    return { totalQty, totalSales, topPerformer, topProduct };
}

// Render dashboard summary (KPIs + subtitle)
function renderDashboardSummary(data) {
    const stats = computeSummaryStats(data);

    // Update KPIs
    if (kpiTotalQty) kpiTotalQty.textContent = stats.totalQty.toLocaleString();
    if (kpiTotalSales) kpiTotalSales.textContent = '$' + stats.totalSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (kpiTopPerformer) kpiTopPerformer.textContent = stats.topPerformer;
    if (kpiTopProduct) kpiTopProduct.textContent = stats.topProduct;

    // Update subtitle with active filters
    const filterParts = [];
    Object.entries(dashboardFilters).forEach(([col, val]) => {
        if (val) filterParts.push(`${col.replace(/_/g, ' ')} = ${val}`);
    });

    const filterText = filterParts.length > 0 ? filterParts.join(' · ') : 'No filters applied';
    if (dashboardSubtitle) dashboardSubtitle.textContent = `Showing ${data.length} rows · ${filterText}`;
    if (dashboardFilterSummary) {
        dashboardFilterSummary.textContent = filterParts.length > 0 ? `Active: ${filterParts.join(', ')}` : '';
    }
}

// Populate dashboard filter dropdowns
function populateDashboardFilters() {
    const data = allRows;
    if (!data || data.length === 0) return;

    // Find relevant columns
    const quarterCol = columnNames.find(c => c.endsWith('_Quarter'));
    const monthCol = columnNames.find(c => c.endsWith('_Month'));
    const productCol = columnNames.find(c => /product|item/i.test(c));
    const salespersonCol = columnNames.find(c => /salesperson|sales.?person|rep/i.test(c));
    const regionCol = columnNames.find(c => /region|location|area/i.test(c));

    // Helper to populate a select
    function populateSelect(selectEl, colName, placeholder) {
        if (!selectEl || !colName) return;

        const uniqueValues = [...new Set(data.map(r => r[colName]).filter(v => v))].sort();
        selectEl.innerHTML = `<option value="">${placeholder}</option>`;
        uniqueValues.forEach(val => {
            const option = document.createElement('option');
            option.value = val;
            option.textContent = val;
            selectEl.appendChild(option);
        });

        // Store the column name as data attribute for filtering
        selectEl.dataset.column = colName;
    }

    populateSelect(filterQuarter, quarterCol, 'All Quarters');
    populateSelect(filterMonth, monthCol, 'All Months');
    populateSelect(filterProduct, productCol, 'All Products');
    populateSelect(filterSalesperson, salespersonCol, 'All Salespersons');
    populateSelect(filterRegion, regionCol, 'All Regions');
}

// Handle dashboard filter change
function onDashboardFilterChange(e) {
    const select = e.target;
    const colName = select.dataset.column;
    const value = select.value;

    if (colName) {
        if (value) {
            dashboardFilters[colName] = value;
        } else {
            delete dashboardFilters[colName];
        }
    }

    rerenderAllDashboardCharts();
}

// Clear all dashboard filters
function clearDashboardFilters() {
    dashboardFilters = {};
    [filterQuarter, filterMonth, filterProduct, filterSalesperson, filterRegion].forEach(sel => {
        if (sel) sel.value = '';
    });
    rerenderAllDashboardCharts();
}

// Get data with dashboard filters applied
function getDashboardFilteredData() {
    let data = getFilteredData(); // Start with slicer-filtered data

    // Apply dashboard-specific filters
    Object.entries(dashboardFilters).forEach(([col, val]) => {
        if (val) {
            data = data.filter(row => String(row[col]) === val);
        }
    });

    return data;
}

// Setup dashboard filter event listeners
function setupDashboardFilterListeners() {
    [filterQuarter, filterMonth, filterProduct, filterSalesperson, filterRegion].forEach(sel => {
        if (sel) sel.addEventListener('change', onDashboardFilterChange);
    });

    if (clearDashboardFiltersBtn) {
        clearDashboardFiltersBtn.addEventListener('click', clearDashboardFilters);
    }
}

// Initialize dashboard filters on load
setupDashboardFilterListeners();

// Re-render all dashboard charts (called when global filters change)
function rerenderAllDashboardCharts() {
    // Get filtered data for KPIs
    const filteredData = getDashboardFilteredData();

    // Update KPIs and summary
    renderDashboardSummary(filteredData);

    // Show/hide dashboard header based on chart count
    if (dashboardHeader) {
        if (dashboardCharts.length > 0) {
            dashboardHeader.classList.remove('hidden');
        } else {
            dashboardHeader.classList.add('hidden');
        }
    }

    // Re-render each chart
    dashboardCharts.forEach(chart => {
        renderDashboardChart(chart.id);
    });
}

// ========================================
// PRESENTATION MODE
// ========================================

// DOM elements for presentation mode
const presentationModeBtn = document.getElementById('presentation-mode-btn');
// slicerPanel already declared at top of file
const slicerControls = document.getElementById('slicer-controls');
const clearSlicerFiltersBtn = document.getElementById('clear-slicer-filters');
const activeFiltersSummary = document.getElementById('active-filters-summary');
const activeFiltersText = document.getElementById('active-filters-text');

// Detect presentation mode from URL on page load
function detectPresentationMode() {
    const urlParams = new URLSearchParams(window.location.search);
    const mode = urlParams.get('mode');
    if (mode === 'presentation') {
        // Only enter presentation mode if we have data
        if (allRows.length > 0) {
            isPresentationMode = true;
            applyModeLayout();
        } else {
            // No data, remove presentation mode from URL and stay in normal mode
            console.log('[Presentation] No data loaded, exiting presentation mode');
            const url = new URL(window.location);
            url.searchParams.delete('mode');
            window.history.replaceState({}, '', url);
            isPresentationMode = false;
        }
    }
}

// Apply layout based on current mode
function applyModeLayout() {
    const body = document.body;

    if (isPresentationMode) {
        body.classList.add('presentation-mode');
        presentationModeBtn.textContent = 'Exit';
        presentationModeBtn.title = 'Exit Presentation Mode';

        // In presentation mode, show main app if we have data
        if (allRows.length > 0) {
            if (uploadScreen) uploadScreen.classList.add('hidden');
            if (mainApp) mainApp.classList.remove('hidden');
            populateSlicerControls();
            populateDashboardFilters();
        }

        // Re-render dashboard charts with larger size
        rerenderAllDashboardCharts();

        // Legacy: Re-render pinned charts if any
        if (pinnedCharts.length > 0) {
            pinnedChartsSection.classList.remove('hidden');
            renderPinnedCharts();
        }
    } else {
        body.classList.remove('presentation-mode');
        presentationModeBtn.textContent = 'Present';
        presentationModeBtn.title = 'Enter Presentation Mode';

        // Re-render dashboard charts with normal size
        rerenderAllDashboardCharts();

        // Legacy: Re-render pinned charts if any
        if (pinnedCharts.length > 0) {
            renderPinnedCharts();
        }
    }
}

// Toggle presentation mode
function togglePresentationMode() {
    isPresentationMode = !isPresentationMode;

    // Update URL without page reload
    const url = new URL(window.location);
    if (isPresentationMode) {
        url.searchParams.set('mode', 'presentation');
    } else {
        url.searchParams.delete('mode');
    }
    history.pushState({}, '', url);

    applyModeLayout();
}

// Populate slicer controls with categorical columns
function populateSlicerControls() {
    slicerControls.innerHTML = '';

    // Find categorical columns (non-numeric with reasonable unique values)
    const categoricalColumns = columnNames.filter(col => {
        const profile = columnProfiles[col];
        return profile && profile.type === 'text' && profile.uniqueCount <= 50 && profile.uniqueCount > 1;
    }).slice(0, 4); // Max 4 slicers

    if (categoricalColumns.length === 0) {
        slicerControls.innerHTML = '<p class="text-gray-500 text-sm col-span-3">No categorical columns available for filtering.</p>';
        return;
    }

    categoricalColumns.forEach(col => {
        const div = document.createElement('div');

        // Get unique values for this column
        const uniqueValues = [...new Set(filteredRows.map(row => row[col]))].filter(v => v != null).sort();

        div.innerHTML = `
            <label>${escapeHtml(col)}</label>
            <select data-column="${escapeHtml(col)}" class="slicer-select">
                <option value="">All</option>
                ${uniqueValues.map(v => `<option value="${escapeHtml(String(v))}">${escapeHtml(String(v))}</option>`).join('')}
            </select>
        `;

        slicerControls.appendChild(div);
    });

    // Add event listeners to slicer selects
    document.querySelectorAll('.slicer-select').forEach(select => {
        select.addEventListener('change', handleSlicerChange);

        // Restore previous selection if any
        const col = select.dataset.column;
        if (globalSlicerFilters[col]) {
            select.value = globalSlicerFilters[col];
        }
    });
}

// Handle slicer change
function handleSlicerChange(event) {
    const select = event.target;
    const column = select.dataset.column;
    const value = select.value;

    if (value) {
        globalSlicerFilters[column] = value;
    } else {
        delete globalSlicerFilters[column];
    }

    // Apply filters and update charts
    applyGlobalSlicerFilters();
    updateActiveFiltersDisplay();
}

// Apply global slicer filters to all pinned charts
function applyGlobalSlicerFilters() {
    // Filter the base data
    let slicedData = allRows.filter(row => selectedSheets.has(row._sheetKey));

    // Apply each slicer filter
    Object.entries(globalSlicerFilters).forEach(([column, value]) => {
        slicedData = slicedData.filter(row => String(row[column]) === value);
    });

    // Update filtered rows
    filteredRows = slicedData;

    // Re-render all pinned charts with the new filtered data
    pinnedCharts.forEach(pinnedChart => {
        const { id, config } = pinnedChart;

        // Recalculate pivot with filtered data
        let dataToUse = slicedData;

        // Apply computed columns if needed
        if (config.computedColumns) {
            dataToUse = addComputedColumns(dataToUse, config.computedColumns);
        }

        // Rebuild pivot
        const newPivotResult = pivot(dataToUse, config.rowField, config.colField, config.valueField, config.aggType);

        // Update the stored pivot result
        pinnedChart.pivotResult = newPivotResult;

        // Re-render this pinned chart
        renderPinnedChart(id, newPivotResult, config);
    });

    // Also re-render new dashboard charts
    rerenderAllDashboardCharts();

    // Re-render conversation cards with new filtered data
    rerenderAllConversationCards();

    // Update filter badge
    updateFilterBadge();
}

// Update active filters display
function updateActiveFiltersDisplay() {
    const filterEntries = Object.entries(globalSlicerFilters);

    if (filterEntries.length === 0) {
        activeFiltersSummary.classList.add('hidden');
        return;
    }

    activeFiltersSummary.classList.remove('hidden');

    const filterText = filterEntries
        .map(([col, val]) => `${col} = ${val}`)
        .join(' | ');

    activeFiltersText.textContent = filterText;
}

// Clear all slicer filters
function clearAllSlicerFilters() {
    globalSlicerFilters = {};

    // Reset all slicer selects
    document.querySelectorAll('.slicer-select').forEach(select => {
        select.value = '';
    });

    // Reset to base filtered data
    filteredRows = allRows.filter(row => selectedSheets.has(row._sheetKey));

    // Re-render charts
    applyGlobalSlicerFilters();
    updateActiveFiltersDisplay();
}

// Event listeners for presentation mode
presentationModeBtn.addEventListener('click', togglePresentationMode);
clearSlicerFiltersBtn.addEventListener('click', clearAllSlicerFilters);

// Handle browser back/forward buttons
window.addEventListener('popstate', () => {
    const urlParams = new URLSearchParams(window.location.search);
    isPresentationMode = urlParams.get('mode') === 'presentation';
    applyModeLayout();
});

// Initialize presentation mode detection on load
detectPresentationMode();

// Analytics Handlers - Add to end of script.js

// Stub functions for analytics buttons (not yet implemented)
function handleForecast() {
    showAlert('Forecast feature coming soon!', 'info');
    console.warn('handleForecast is not implemented yet.');
}

function handleAnomalies() {
    showAlert('Anomaly detection feature coming soon!', 'info');
    console.warn('handleAnomalies is not implemented yet.');
}

function handleCluster() {
    showAlert('Clustering feature coming soon!', 'info');
    console.warn('handleCluster is not implemented yet.');
}

function handleInsights() {
    showAlert('AI Insights feature coming soon!', 'info');
    console.warn('handleInsights is not implemented yet.');
}
