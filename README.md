# 📊 AI-Powered Data Insights Dashboard

An intelligent analytics dashboard that uses OpenAI to analyze your Excel data and create visualizations through natural language.

## 🚀 Features

- **AI-Generated Suggestions**: Upload data and get 6 smart, relevant questions
- **Multi-Chart Dashboards**: Select multiple suggestions to create comparison dashboards
- **Natural Language Queries**: Ask questions in plain English
- **Smart Visualizations**: Auto-selects bar/line/pie charts based on your data
- **Conversational Refinement**: Chat to modify your visualizations
- **Secure API Key Storage**: OpenAI key stored safely in backend `.env` file

---

## 📋 Prerequisites

- **Node.js** (v16 or higher) - [Download here](https://nodejs.org/)
- **OpenAI API Key** - [Get one here](https://platform.openai.com/api-keys)

---

## ⚙️ Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Your API Key

1. Open the `.env` file in the root directory
2. Add your OpenAI API key:

```env
OPENAI_API_KEY=sk-your-actual-api-key-here
PORT=3000
```

**IMPORTANT**: Never commit your `.env` file to version control! It's already in `.gitignore`.

### 3. Start the Server

```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

You should see:
```
🚀 Server running on http://localhost:3000
📊 Open http://localhost:3000/index.html to use the dashboard
✅ OpenAI API key configured
```

### 4. Open the Dashboard

Open your browser and navigate to:
```
http://localhost:3000/index.html
```

---

## 🎯 How to Use

### **Step 1: Upload Your Data**
1. Click "Choose Files"
2. Select one or more Excel files (.xlsx, .xls, .csv)
3. Data loads and AI analyzes it automatically

### **Step 2: AI Suggestions**
After upload, you'll see suggested questions like:
- "Show me chocolate chip sales by month"
- "Compare all products by region"
- "Which salesperson had the highest sales?"

### **Step 3: Create Visualizations**

**Option A: Use Suggestions**
1. Click one or more suggestion chips (they turn purple)
2. Click "Create X Chart(s)"
3. Charts are created and auto-pinned!

**Option B: Ask Your Own Question**
1. Type a natural language question
2. Click "Ask AI"
3. AI interprets and creates the visualization

### **Step 4: Refine** (Coming Soon)
- Chat to modify: "make it bigger", "show only January"
- Export dashboards to Excel
- Share visualizations

---

## 🏗️ Project Structure

```
PivotTables/
├── index.html          # Frontend UI
├── style.css           # Styling
├── script.js           # Frontend logic
├── server.js           # Express backend with AI endpoints
├── package.json        # Dependencies
├── .env                # API key (DO NOT COMMIT!)
├── .env.example        # Template for .env
├── .gitignore          # Protects sensitive files
└── README.md           # This file
```

---

## 🔐 Security

- ✅ API key stored in `.env` on server (never exposed to browser)
- ✅ `.gitignore` prevents accidental commits
- ✅ CORS enabled for localhost only
- ✅ All AI processing happens server-side

---

## 💰 Cost Estimate

OpenAI API costs (using gpt-4o-mini):
- Generate 6 suggestions: ~$0.001
- Interpret a query: ~$0.001
- Create 4 charts from suggestions: ~$0.004

**Total: ~$0.01 per session** (very affordable!)

---

## 🛠️ API Endpoints

The backend provides these endpoints:

- `GET /api/health` - Check AI configuration status
- `POST /api/suggestions` - Generate smart questions for uploaded data
- `POST /api/interpret-query` - Convert natural language to chart config
- `POST /api/chat` - Conversational refinement (coming soon)

---

## 🐛 Troubleshooting

### "AI: Server not running"
- Make sure you ran `npm start`
- Check the server is running on `http://localhost:3000`

### "AI: Not configured on server"
- Add your OpenAI API key to `.env`
- Restart the server after editing `.env`

### "Could not generate suggestions"
- Check your API key is valid
- Ensure you have credits in your OpenAI account
- Check the server console for error messages

### Port 3000 already in use
- Change PORT in `.env` to another number (e.g., 3001)
- Update `API_BASE_URL` in `script.js` to match

---

## 📝 Example Queries

Based on the cookie sales data:

```
Show me chocolate chip sales by month
Compare all cookie types by region
Which salesperson sold the most in January?
Total revenue by product and salesperson
Show quantity sold trends over time
Average sales amount by region
```

---

## 🎨 Customization

### Change AI Model
In `server.js`, modify:
```javascript
model: 'gpt-4o-mini'  // Change to 'gpt-4o' for better quality (higher cost)
```

### Adjust Suggestion Count
In `server.js`, change the prompt to generate more/fewer suggestions

### Add More Chart Types
Edit `script.js` `prepareChartData()` to add new Chart.js configurations

---

## 📄 License

MIT

---

## 🤝 Contributing

Feel free to submit issues and enhancement requests!

---

**Built with ❤️ using OpenAI, Chart.js, SheetJS, and Tailwind CSS**
