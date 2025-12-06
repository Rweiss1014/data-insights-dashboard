require('dotenv').config();
const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');
const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// Initialize Supabase (only if configured)
let supabase = null;
if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    console.log('✅ Supabase configured');
} else {
    console.log('⚠️  Supabase not configured - dashboard persistence disabled');
}

// Auth middleware - verifies Supabase JWT token
async function requireAuth(req, res, next) {
    if (!supabase) {
        return res.status(503).json({ error: 'Database not configured' });
    }

    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace('Bearer ', '').trim();

    if (!token) {
        return res.status(401).json({ error: 'No auth token provided' });
    }

    try {
        // Decode the JWT to get user ID
        // In production, you should verify with SUPABASE_JWT_SECRET
        const decoded = jwt.decode(token);

        if (!decoded || !decoded.sub) {
            return res.status(401).json({ error: 'Invalid token' });
        }

        req.user = { id: decoded.sub, email: decoded.email };
        next();
    } catch (err) {
        console.error('Auth error:', err);
        res.status(401).json({ error: 'Unauthorized' });
    }
}

// Optional auth - allows both authenticated and unauthenticated requests
function optionalAuth(req, res, next) {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace('Bearer ', '').trim();

    if (token) {
        try {
            const decoded = jwt.decode(token);
            if (decoded && decoded.sub) {
                req.user = { id: decoded.sub, email: decoded.email };
            }
        } catch (err) {
            // Ignore auth errors for optional auth
        }
    }
    next();
}

// Middleware - CORS configuration for local and deployed environments
const allowedOrigins = [
    'http://localhost:3001',
    'http://127.0.0.1:3001',
    process.env.RENDER_EXTERNAL_URL, // Render.com URL
    process.env.ALLOWED_ORIGIN       // Custom allowed origin
].filter(Boolean);

app.use(cors({
    origin: function(origin, callback) {
        // Allow requests with no origin (mobile apps, curl, etc.)
        if (!origin) return callback(null, true);
        if (allowedOrigins.some(allowed => origin.startsWith(allowed.replace(/\/$/, '')))) {
            return callback(null, true);
        }
        // In production, be more permissive for same-origin requests
        if (process.env.NODE_ENV === 'production') {
            return callback(null, true);
        }
        callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// Serve only specific static files (not the entire directory)
app.use(express.static('.', {
    index: 'index.html',
    dotfiles: 'deny'  // Prevent access to .env and other dotfiles
}));

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        aiConfigured: !!process.env.OPENAI_API_KEY
    });
});

// Provide Supabase config to frontend (only URL and anon key - NOT service role key)
app.get('/api/config', (req, res) => {
    res.json({
        supabaseUrl: process.env.SUPABASE_URL || '',
        supabaseAnonKey: process.env.SUPABASE_ANON_KEY || '',
        authEnabled: !!(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY)
    });
});

// Generate AI suggestions
app.post('/api/suggestions', async (req, res) => {
    try {
        const { columns, columnTypes, rowCount, sampleData } = req.body;

        if (!process.env.OPENAI_API_KEY) {
            return res.status(500).json({ error: 'OpenAI API key not configured on server' });
        }

        const prompt = `You are a data analytics assistant. A user has uploaded data with these characteristics:

Columns: ${JSON.stringify(columns)}
Column Types: ${JSON.stringify(columnTypes)}
Row Count: ${rowCount}
Sample Data (first 3 rows): ${JSON.stringify(sampleData)}

Generate 6 interesting, specific questions this user might want to ask about their data. Each question should:
- Be specific to the actual columns in the data
- Be phrased as a natural question (like "Show me...", "Compare...", "Which...")
- Focus on different aspects (totals, comparisons, trends, rankings)
- Be actionable and create useful visualizations

Return ONLY a JSON array of strings, no other text:
["question 1", "question 2", "question 3", "question 4", "question 5", "question 6"]`;

        const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: 'You are a helpful data analytics assistant.' },
                { role: 'user', content: prompt }
            ],
            temperature: 0.7,
            max_tokens: 1000
        });

        const suggestions = JSON.parse(completion.choices[0].message.content);
        res.json({ suggestions });

    } catch (error) {
        console.error('AI suggestion error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Interpret natural language query
app.post('/api/interpret-query', async (req, res) => {
    try {
        const { query, columns, columnTypes, sampleData, context } = req.body;

        if (!process.env.OPENAI_API_KEY) {
            return res.status(500).json({ error: 'OpenAI API key not configured on server' });
        }

        const systemPrompt = `You are a data analytics assistant that interprets natural language queries about data.

CRITICAL RULES:
1. FILTERS: If the user mentions specific items (products, regions, people), include them in filters
2. "ALL" MEANS NO FILTER: If user says "all products", "all cookies", "every region", "each salesperson" - do NOT add a filter for that column. Just group by it.
   - "all cookies by salesperson" → filters: [], rowField: "Salesperson" (no Product filter!)
   - "compare all products" → filters: [], rowField: "Product"
3. SINGLE TOTAL (NO GROUPING):
   - "total for November", "what's the total", "sum of all sales" → set rowField: null and singleValue: true
   - When user wants ONE number (not broken down by anything), use singleValue: true
   - DO NOT group by date/day when user just wants a total
   - "total for November" = filter to November, show ONE total (singleValue: true)
   - "total BY DAY in November" = filter to November, group by day (singleValue: false)
4. MONTH/TIME REFERENCES:
   - "in March", "during January", "for November" → add monthFilter, do NOT change rowField
   - "by month", "monthly" → Use timeGrouping: "month" to group by month
   - "by quarter", "quarterly" → Use timeGrouping: "quarter" to group by quarter
5. QUARTER REFERENCES:
   - "in Q1", "first quarter", "in the first quarter" → add quarterFilter: "Q1", do NOT change rowField
   - "second quarter", "Q2" → quarterFilter: "Q2"
   - "third quarter", "Q3" → quarterFilter: "Q3"
   - "fourth quarter", "Q4" → quarterFilter: "Q4"
6. AGGREGATION: Default to "sum" for quantities/amounts. Use "count" only for counting rows.
7. IMPORTANT: When user asks "which X has highest Y in [time period]", the rowField should be X (not the time period). The time period is a FILTER.

Given a user's question and their data structure, extract:
1. filters: Array of {column, value} - items to filter the data BY
2. rowField: Column name to group by (x-axis). Set to null if user wants a single total.
3. colField: Optional secondary grouping
4. valueField: Numeric column to measure/aggregate
5. aggType: "sum" (default for quantities), "avg" (for averages), "count" (for counting rows)
6. chartType: "bar" (default), "line" (for trends over time), "pie" (for proportions/percentages/share/breakdown), "number" (for single value display)
   - Use "pie" when user asks about: percent, percentage, proportion, share, breakdown by category, distribution
7. timeGrouping: "month" or "quarter" - ONLY if user wants to GROUP by time periods (e.g., "by month", "by quarter")
8. monthFilter: The specific month name if user asks about a specific month (e.g., "March")
9. quarterFilter: The specific quarter if user asks about a specific quarter (e.g., "Q1", "Q2", "Q3", "Q4")
10. singleValue: true if user wants ONE total number (no breakdown/grouping)

Available columns: ${JSON.stringify(columns)}
Column types: ${JSON.stringify(columnTypes)}
Sample row: ${JSON.stringify(sampleData[0] || {})}

EXAMPLES:

Query: "show me how many chocolate chip cookies were sold in march"
→ {
  "filters": [{"column": "Product", "value": "Chocolate Chip Cookies"}],
  "rowField": "Product",
  "colField": "",
  "valueField": "Quantity Sold",
  "aggType": "sum",
  "chartType": "bar",
  "timeGrouping": "month",
  "monthFilter": "March"
}
(This shows SUM of Quantity Sold, filtered to Chocolate Chip Cookies AND March)

Query: "chocolate chip sales by month"
→ {
  "filters": [{"column": "Product", "value": "Chocolate Chip Cookies"}],
  "rowField": "Date",
  "colField": "",
  "valueField": "Sales Amount",
  "aggType": "sum",
  "chartType": "bar",
  "timeGrouping": "month"
}
(This shows sales grouped BY month, NOT filtered to a specific month)

Query: "total sales by product"
→ {
  "filters": [],
  "rowField": "Product",
  "colField": "",
  "valueField": "Sales Amount",
  "aggType": "sum",
  "chartType": "bar"
}

Query: "compare quantity sold of all cookies across salespersons"
→ {
  "filters": [],
  "rowField": "Salesperson",
  "colField": "Product",
  "valueField": "Quantity Sold",
  "aggType": "sum",
  "chartType": "bar"
}
(Note: "all cookies" means NO filter - show all products grouped by Salesperson)

Query: "which salesperson has the highest quantity sold in the first quarter"
→ {
  "filters": [],
  "rowField": "Salesperson",
  "colField": "",
  "valueField": "Quantity Sold",
  "aggType": "sum",
  "chartType": "bar",
  "quarterFilter": "Q1"
}
(Note: "first quarter" means FILTER to Q1, but group by Salesperson - NOT group by quarter!)

Query: "show sales by quarter"
→ {
  "filters": [],
  "rowField": "Date",
  "colField": "",
  "valueField": "Sales Amount",
  "aggType": "sum",
  "chartType": "bar",
  "timeGrouping": "quarter"
}
(Note: "by quarter" means GROUP by quarter, so use timeGrouping)

Query: "what is the total for November" or "give me the total for November"
→ {
  "filters": [],
  "rowField": null,
  "colField": "",
  "valueField": "Amount",
  "aggType": "sum",
  "chartType": "number",
  "monthFilter": "November",
  "singleValue": true
}
(Note: User wants ONE total number, not a chart. Use singleValue: true and rowField: null)

Query: "total sales by day in November"
→ {
  "filters": [],
  "rowField": "Date",
  "colField": "",
  "valueField": "Amount",
  "aggType": "sum",
  "chartType": "bar",
  "monthFilter": "November",
  "singleValue": false
}
(Note: "by day" means GROUP by day - show each day as a bar)

Query: "what percent of total expenses is attributed to each category" or "breakdown by category"
→ {
  "filters": [],
  "rowField": "Category",
  "colField": "",
  "valueField": "Amount",
  "aggType": "sum",
  "chartType": "pie",
  "singleValue": false
}
(Note: percentage/proportion questions should use pie chart)

Return ONLY valid JSON (no markdown, no explanation):
{
  "filters": [],
  "rowField": "Product",
  "colField": "",
  "valueField": "Quantity Sold",
  "aggType": "sum",
  "chartType": "bar",
  "timeGrouping": null,
  "monthFilter": null,
  "singleValue": false,
  "quarterFilter": null
}`;

        const messages = [
            { role: 'system', content: systemPrompt }
        ];

        // Add conversation context if provided
        if (context && context.length > 0) {
            context.forEach(msg => messages.push(msg));
        }

        messages.push({ role: 'user', content: query });

        const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: messages,
            temperature: 0.3,
            max_tokens: 500
        });

        const interpretation = JSON.parse(completion.choices[0].message.content);
        res.json({ interpretation });

    } catch (error) {
        console.error('Query interpretation error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Chat endpoint for conversational data analysis
app.post('/api/chat', async (req, res) => {
    try {
        const { message, conversationHistory, columns, columnTypes, sampleData, existingCharts } = req.body;

        if (!process.env.OPENAI_API_KEY) {
            return res.status(500).json({ error: 'OpenAI API key not configured on server' });
        }

        const systemPrompt = `You are a helpful data visualization assistant. The user has uploaded data and wants to explore it through chat.

DATA SCHEMA:
- Columns: ${JSON.stringify(columns)}
- Column Types: ${JSON.stringify(columnTypes)}
- Sample Row: ${JSON.stringify(sampleData?.[0] || {})}

EXISTING CHARTS ON DASHBOARD:
${JSON.stringify(existingCharts || [], null, 2)}

YOUR TASK:
Respond to user requests about their data. You can:
1. Answer questions about the data structure
2. Create new charts
3. Modify existing charts
4. Set global filters (slicers)
5. Remove charts

RESPONSE FORMAT:
You MUST respond with valid JSON in this exact format:
{
  "reply": "Your conversational response to the user",
  "actions": [
    // Array of actions to perform on the dashboard
  ]
}

ACTION TYPES:

1. CREATE A CHART:
{
  "type": "create_chart",
  "config": {
    "rowField": "column_name",     // Required: column to group by (x-axis)
    "colField": "",                // Optional: secondary grouping
    "valueField": "column_name",   // Required: column to measure
    "aggType": "sum|avg|count",    // Required: aggregation type
    "chartType": "bar|line|pie",   // Required: visualization type
    "filters": [],                 // Optional: [{column: "X", value: "Y"}]
    "timeGrouping": null,          // Optional: "month" or "quarter"
    "title": "Chart Title"         // Optional: custom title
  }
}

2. UPDATE AN EXISTING CHART:
{
  "type": "update_chart",
  "chartId": "chart_id_here",
  "updates": {
    // Any config fields to update
    "chartType": "pie",
    "filters": [{"column": "Region", "value": "North"}]
  }
}

3. SET GLOBAL FILTERS (affects all charts):
{
  "type": "set_filters",
  "filters": {
    "ColumnName": "value",
    "AnotherColumn": "another_value"
  }
}

4. REMOVE A CHART:
{
  "type": "remove_chart",
  "chartId": "chart_id_here"
}

5. CLEAR ALL FILTERS:
{
  "type": "clear_filters"
}

EXAMPLES:

User: "Show me sales by region"
Response: {
  "reply": "I've created a bar chart showing total sales broken down by region.",
  "actions": [{
    "type": "create_chart",
    "config": {
      "rowField": "Region",
      "valueField": "Sales",
      "aggType": "sum",
      "chartType": "bar",
      "title": "Sales by Region"
    }
  }]
}

User: "Make that a pie chart"
Response: {
  "reply": "Done! I've converted the chart to a pie chart.",
  "actions": [{
    "type": "update_chart",
    "chartId": "chart_0",
    "updates": {"chartType": "pie"}
  }]
}

User: "Filter everything to show only Q1"
Response: {
  "reply": "I've applied a global filter for Q1. All charts now show Q1 data only.",
  "actions": [{
    "type": "set_filters",
    "filters": {"Quarter": "Q1"}
  }]
}

User: "What columns do I have?"
Response: {
  "reply": "Your dataset has the following columns:\\n- Region (text)\\n- Product (text)\\n- Sales (numeric)\\n- Date (date)\\n\\nWould you like me to create a visualization?",
  "actions": []
}

IMPORTANT RULES:
- Always respond with valid JSON
- The "reply" field should be conversational and helpful
- Use actual column names from the schema
- For numeric aggregations, use numeric columns
- For grouping, prefer categorical columns
- If the user's request is unclear, ask for clarification in the reply
- If no dashboard action is needed, return an empty actions array`;

        const messages = [
            { role: 'system', content: systemPrompt },
            ...(conversationHistory || []),
            { role: 'user', content: message }
        ];

        const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: messages,
            temperature: 0.5,
            max_tokens: 1000
        });

        let responseText = completion.choices[0].message.content;

        // Try to parse as JSON
        let parsedResponse;
        try {
            // Remove markdown code blocks if present
            responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            parsedResponse = JSON.parse(responseText);
        } catch (parseError) {
            // If not valid JSON, wrap in a simple response
            parsedResponse = {
                reply: responseText,
                actions: []
            };
        }

        // Ensure response has required fields
        if (!parsedResponse.reply) {
            parsedResponse.reply = "I processed your request.";
        }
        if (!parsedResponse.actions) {
            parsedResponse.actions = [];
        }

        res.json(parsedResponse);

    } catch (error) {
        console.error('Chat error:', error);
        res.status(500).json({
            reply: "Sorry, I encountered an error processing your request. Please try again.",
            actions: [],
            error: error.message
        });
    }
});

// Python Analytics Service Proxy Endpoints
const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://localhost:5000';

// Forecast endpoint
app.post('/api/analytics/forecast', async (req, res) => {
    try {
        const response = await fetch(`${PYTHON_SERVICE_URL}/forecast`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req.body)
        });

        const data = await response.json();

        if (!response.ok) {
            return res.status(response.status).json(data);
        }

        res.json(data);
    } catch (error) {
        console.error('Python service error:', error);
        res.status(503).json({ error: 'Analytics service unavailable. Make sure Python service is running on port 5000.' });
    }
});

// Anomaly detection endpoint
app.post('/api/analytics/anomalies', async (req, res) => {
    try {
        const response = await fetch(`${PYTHON_SERVICE_URL}/anomalies`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req.body)
        });

        const data = await response.json();
        if (!response.ok) {
            return res.status(response.status).json(data);
        }

        res.json(data);
    } catch (error) {
        res.status(503).json({ error: 'Analytics service unavailable' });
    }
});

// Clustering endpoint
app.post('/api/analytics/cluster', async (req, res) => {
    try {
        const response = await fetch(`${PYTHON_SERVICE_URL}/cluster`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req.body)
        });

        const data = await response.json();
        if (!response.ok) {
            return res.status(response.status).json(data);
        }

        res.json(data);
    } catch (error) {
        res.status(503).json({ error: 'Analytics service unavailable' });
    }
});

// Statistical insights endpoint
app.post('/api/analytics/insights', async (req, res) => {
    try {
        const response = await fetch(`${PYTHON_SERVICE_URL}/insights`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req.body)
        });

        const data = await response.json();
        if (!response.ok) {
            return res.status(response.status).json(data);
        }

        res.json(data);
    } catch (error) {
        res.status(503).json({ error: 'Analytics service unavailable' });
    }
});

// =============================================
// Dashboard Persistence Endpoints
// =============================================

// Check if user is authenticated (for frontend to know)
app.get('/api/auth/status', optionalAuth, (req, res) => {
    res.json({
        authenticated: !!req.user,
        user: req.user || null,
        supabaseConfigured: !!supabase
    });
});

// Create a new dashboard
app.post('/api/dashboards', requireAuth, async (req, res) => {
    const { name, description, datasetId, globalFilters = {}, cards = [] } = req.body;
    const userId = req.user.id;

    if (!name) {
        return res.status(400).json({ error: 'Dashboard name is required' });
    }

    try {
        // Insert dashboard
        const { data: dashboard, error: dashError } = await supabase
            .from('dashboards')
            .insert({
                user_id: userId,
                name,
                description: description || '',
                dataset_id: datasetId || 'unknown',
                global_filters: globalFilters
            })
            .select()
            .single();

        if (dashError) throw dashError;

        // Insert cards if any
        if (cards.length > 0) {
            const cardRows = cards.map((card, idx) => ({
                dashboard_id: dashboard.id,
                position: card.position ?? idx,
                title: card.title || '',
                chart_type: card.chartType,
                config_json: card.config
            }));

            const { error: cardsError } = await supabase
                .from('dashboard_cards')
                .insert(cardRows);

            if (cardsError) throw cardsError;
        }

        res.status(201).json({
            dashboardId: dashboard.id,
            message: 'Dashboard saved successfully'
        });

    } catch (err) {
        console.error('Error creating dashboard:', err);
        res.status(500).json({ error: 'Failed to create dashboard' });
    }
});

// List all dashboards for the user
app.get('/api/dashboards', requireAuth, async (req, res) => {
    const userId = req.user.id;

    try {
        const { data, error } = await supabase
            .from('dashboards')
            .select('id, name, description, dataset_id, created_at, updated_at')
            .eq('user_id', userId)
            .order('updated_at', { ascending: false });

        if (error) throw error;

        res.json(data || []);

    } catch (err) {
        console.error('Error fetching dashboards:', err);
        res.status(500).json({ error: 'Failed to fetch dashboards' });
    }
});

// Get a single dashboard with its cards
app.get('/api/dashboards/:id', requireAuth, async (req, res) => {
    const userId = req.user.id;
    const dashboardId = req.params.id;

    try {
        // Get dashboard
        const { data: dashboards, error: dashError } = await supabase
            .from('dashboards')
            .select('*')
            .eq('id', dashboardId)
            .eq('user_id', userId)
            .limit(1);

        if (dashError) throw dashError;

        if (!dashboards || dashboards.length === 0) {
            return res.status(404).json({ error: 'Dashboard not found' });
        }

        const dashboard = dashboards[0];

        // Get cards
        const { data: cards, error: cardsError } = await supabase
            .from('dashboard_cards')
            .select('*')
            .eq('dashboard_id', dashboardId)
            .order('position', { ascending: true });

        if (cardsError) throw cardsError;

        res.json({
            id: dashboard.id,
            name: dashboard.name,
            description: dashboard.description,
            datasetId: dashboard.dataset_id,
            globalFilters: dashboard.global_filters,
            createdAt: dashboard.created_at,
            updatedAt: dashboard.updated_at,
            cards: (cards || []).map(c => ({
                id: c.id,
                position: c.position,
                title: c.title,
                chartType: c.chart_type,
                config: c.config_json
            }))
        });

    } catch (err) {
        console.error('Error fetching dashboard:', err);
        res.status(500).json({ error: 'Failed to fetch dashboard' });
    }
});

// Update a dashboard
app.put('/api/dashboards/:id', requireAuth, async (req, res) => {
    const userId = req.user.id;
    const dashboardId = req.params.id;
    const { name, description, globalFilters, cards } = req.body;

    try {
        // Update dashboard metadata
        const updates = { updated_at: new Date().toISOString() };
        if (name !== undefined) updates.name = name;
        if (description !== undefined) updates.description = description;
        if (globalFilters !== undefined) updates.global_filters = globalFilters;

        const { error: dashError } = await supabase
            .from('dashboards')
            .update(updates)
            .eq('id', dashboardId)
            .eq('user_id', userId);

        if (dashError) throw dashError;

        // Update cards if provided
        if (cards !== undefined) {
            // Delete existing cards
            await supabase
                .from('dashboard_cards')
                .delete()
                .eq('dashboard_id', dashboardId);

            // Insert new cards
            if (cards.length > 0) {
                const cardRows = cards.map((card, idx) => ({
                    dashboard_id: dashboardId,
                    position: card.position ?? idx,
                    title: card.title || '',
                    chart_type: card.chartType,
                    config_json: card.config
                }));

                const { error: cardsError } = await supabase
                    .from('dashboard_cards')
                    .insert(cardRows);

                if (cardsError) throw cardsError;
            }
        }

        res.json({ message: 'Dashboard updated successfully' });

    } catch (err) {
        console.error('Error updating dashboard:', err);
        res.status(500).json({ error: 'Failed to update dashboard' });
    }
});

// Delete a dashboard
app.delete('/api/dashboards/:id', requireAuth, async (req, res) => {
    const userId = req.user.id;
    const dashboardId = req.params.id;

    try {
        const { error } = await supabase
            .from('dashboards')
            .delete()
            .eq('id', dashboardId)
            .eq('user_id', userId);

        if (error) throw error;

        res.status(204).end();

    } catch (err) {
        console.error('Error deleting dashboard:', err);
        res.status(500).json({ error: 'Failed to delete dashboard' });
    }
});

// =============================================
// Session Persistence Endpoints
// =============================================

// Save a session (chat history + cards)
app.post('/api/sessions', requireAuth, async (req, res) => {
    const { name, datasetId, chatHistory, cards } = req.body;
    const userId = req.user.id;

    try {
        const { data: session, error } = await supabase
            .from('sessions')
            .insert({
                user_id: userId,
                name: name || `Session ${new Date().toLocaleString()}`,
                dataset_id: datasetId || 'unknown',
                chat_history: chatHistory || [],
                cards_json: cards || []
            })
            .select()
            .single();

        if (error) throw error;

        res.status(201).json({
            sessionId: session.id,
            message: 'Session saved successfully'
        });

    } catch (err) {
        console.error('Error saving session:', err);
        res.status(500).json({ error: 'Failed to save session' });
    }
});

// List sessions
app.get('/api/sessions', requireAuth, async (req, res) => {
    const userId = req.user.id;

    try {
        const { data, error } = await supabase
            .from('sessions')
            .select('id, name, dataset_id, created_at, updated_at')
            .eq('user_id', userId)
            .order('updated_at', { ascending: false });

        if (error) throw error;

        res.json(data || []);

    } catch (err) {
        console.error('Error fetching sessions:', err);
        res.status(500).json({ error: 'Failed to fetch sessions' });
    }
});

// Get a session
app.get('/api/sessions/:id', requireAuth, async (req, res) => {
    const userId = req.user.id;
    const sessionId = req.params.id;

    try {
        const { data: sessions, error } = await supabase
            .from('sessions')
            .select('*')
            .eq('id', sessionId)
            .eq('user_id', userId)
            .limit(1);

        if (error) throw error;

        if (!sessions || sessions.length === 0) {
            return res.status(404).json({ error: 'Session not found' });
        }

        const session = sessions[0];
        res.json({
            id: session.id,
            name: session.name,
            datasetId: session.dataset_id,
            chatHistory: session.chat_history,
            cards: session.cards_json,
            createdAt: session.created_at,
            updatedAt: session.updated_at
        });

    } catch (err) {
        console.error('Error fetching session:', err);
        res.status(500).json({ error: 'Failed to fetch session' });
    }
});

// Delete a session
app.delete('/api/sessions/:id', requireAuth, async (req, res) => {
    const userId = req.user.id;
    const sessionId = req.params.id;

    try {
        const { error } = await supabase
            .from('sessions')
            .delete()
            .eq('id', sessionId)
            .eq('user_id', userId);

        if (error) throw error;

        res.status(204).end();

    } catch (err) {
        console.error('Error deleting session:', err);
        res.status(500).json({ error: 'Failed to delete session' });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Node.js server running on http://localhost:${PORT}`);
    console.log(`📊 Open http://localhost:${PORT}/index.html to use the dashboard`);
    console.log('');

    if (!process.env.OPENAI_API_KEY) {
        console.warn('⚠️  WARNING: OPENAI_API_KEY not set in .env file');
        console.warn('   AI features will not work until you add your API key');
    } else {
        console.log('✅ OpenAI API key configured');
    }

    if (!supabase) {
        console.warn('⚠️  WARNING: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set');
        console.warn('   Dashboard persistence will not work until you configure Supabase');
    }

    console.log('');
    console.log('🐍 Make sure to start the Python analytics service:');
    console.log('   python analytics_service.py');
    console.log('');
});
