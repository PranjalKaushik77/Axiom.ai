# Corpus AI - Legal AI Assistant 🏛️⚖️

**A sophisticated legal AI assistant designed for Indian legal professionals. Upload PDF contracts and get intelligent, context-aware answers powered by Google Gemini AI.**

![Corpus AI](https://img.shields.io/badge/Status-Production%20Ready-brightgreen)
![Tech Stack](https://img.shields.io/badge/Tech-FastAPI%20%2B%20React%20%2B%20Gemini%20AI-blue)
![License](https://img.shields.io/badge/License-MIT-yellow)

---

## 🎯 **Features**

- ✅ **PDF Contract Upload & Processing** - Intelligent text extraction and chunking
- ✅ **AI-Powered Legal Analysis** - Context-aware answers using Gemini 1.5 Flash
- ✅ **Dark Minimalist UI** - Professional interface designed for legal professionals
- ✅ **Pricing Page** - Complete pricing tiers for different user needs
- ✅ **Comprehensive Error Handling** - Robust validation and user feedback
- ✅ **Mobile Responsive** - Works perfectly on desktop and mobile devices

---

## 🏗️ **Architecture**

```
Corpus AI/
├── backend/          # FastAPI backend server
│   ├── server.py     # Main application
│   ├── requirements.txt
│   └── .env          # API keys and configuration
├── frontend/         # React frontend application
│   ├── src/
│   │   ├── App.js    # Main React component
│   │   ├── App.css   # Dark theme styles
│   │   └── index.js  # Entry point
│   ├── package.json
│   └── .env          # Frontend configuration
└── scripts/
    └── supervisord.conf  # Service management
```

---

## 🚀 **Quick Start Guide**

### **Prerequisites**

- Python 3.11+ installed
- Node.js 18+ and Yarn installed
- Google Gemini API key ([Get one here](https://makersuite.google.com/app/apikey))

### **Step 1: Clone & Setup**

```bash
# Navigate to the application directory
cd /app

# The application is already set up with all dependencies installed
```

### **Step 2: Configure API Key**

```bash
# Open the backend .env file
nano /app/backend/.env

# Add your Gemini API key:
GEMINI_API_KEY=your_actual_api_key_here
```

### **Step 3: Start the Application**

#### **Option A: Using Supervisor (Recommended)**

```bash
# Start all services
sudo supervisord -c scripts/supervisord.conf

# Check status
sudo supervisorctl status

# You should see:
# backend    RUNNING
# frontend   RUNNING
# mongodb    RUNNING
```

#### **Option B: Manual Start**

```bash
# Terminal 1: Start Backend
cd /app/backend
python server.py

# Terminal 2: Start Frontend
cd /app/frontend
yarn start
```

### **Step 4: Access the Application**

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8001
- **API Documentation**: http://localhost:8001/docs

---

## 📱 **How to Use**

### **1. Upload a Legal Contract**

1. Open http://localhost:3000 in your browser
2. Click the "Choose PDF file" area
3. Select a legal contract PDF (max 10MB)
4. Click "Upload & Process"
5. Wait for the processing confirmation

### **2. Ask Legal Questions**

1. Once your contract is processed, use the question interface
2. Type questions like:
   - _"What are the termination clauses?"_
   - _"Who is liable in case of breach?"_
   - _"What are the payment terms?"_
   - _"What is the governing law?"_
3. Click "Get Answer"
4. Receive detailed AI-powered legal analysis

### **3. View Pricing**

- Navigate to the "Pricing" page to see subscription tiers
- Three options: Starter (₹999), Professional (₹2,999), Enterprise (Custom)

---

## 🔧 **Service Management**

### **Check Service Status**

```bash
sudo supervisorctl status
```

### **Restart Services**

```bash
# Restart all services
sudo supervisorctl restart all

# Restart specific service
sudo supervisorctl restart backend
sudo supervisorctl restart frontend
```

### **View Logs**

```bash
# Backend logs
tail -f /var/log/supervisor/backend.out.log
tail -f /var/log/supervisor/backend.err.log

# Frontend logs
tail -f /var/log/supervisor/frontend.out.log
tail -f /var/log/supervisor/frontend.err.log
```

### **Stop Services**

```bash
sudo supervisorctl stop all
```

---

## 🛠️ **Troubleshooting**

### **Problem: Frontend not accessible**

```bash
# Check if something is running on port 3000
sudo lsof -i :3000

# Kill conflicting processes
sudo lsof -t -i tcp:3000 | xargs -r sudo kill -9

# Restart frontend
sudo supervisorctl restart frontend
```

### **Problem: Backend API errors**

```bash
# Check backend logs
tail -n 50 /var/log/supervisor/backend.err.log

# Verify API key is set
grep GEMINI_API_KEY /app/backend/.env

# Test backend directly
curl http://localhost:8001/
```

### **Problem: "Gemini API key not configured"**

1. Open `/app/backend/.env`
2. Replace `YOUR_GEMINI_API_KEY_HERE` with your actual API key
3. Restart backend: `sudo supervisorctl restart backend`

### **Problem: PDF upload fails**

- Ensure file is a valid PDF
- File size must be under 10MB
- Check browser console for detailed errors

---

## 🔑 **Environment Variables**

### **Backend (.env)**

```bash
GEMINI_API_KEY=your_gemini_api_key_here
MONGO_URL=mongodb://localhost:27017/Corpusai
```

### **Frontend (.env)**

```bash
REACT_APP_BACKEND_URL=http://localhost:8001
```

---

## 📚 **API Endpoints**

### **Backend API (http://localhost:8001)**

| Method | Endpoint              | Description                 |
| ------ | --------------------- | --------------------------- |
| GET    | `/`                   | Health check                |
| POST   | `/api/upload`         | Upload PDF contract         |
| POST   | `/api/ask`            | Ask question about contract |
| GET    | `/api/contracts/{id}` | Get contract information    |

### **Example API Usage**

```bash
# Health check
curl http://localhost:8001/

# Upload contract
curl -X POST \
  -F "file=@contract.pdf" \
  http://localhost:8001/api/upload

# Ask question
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"question":"What are the payment terms?","contract_id":"your-contract-id"}' \
  http://localhost:8001/api/ask
```

---

## 🧪 **Testing**

### **Run Backend Tests**

```bash
cd /app
python backend_test.py
```

### **Manual Testing Checklist**

- [ ] Frontend loads at http://localhost:3000
- [ ] Backend API responds at http://localhost:8001
- [ ] PDF upload works with valid files
- [ ] Questions return AI-generated answers
- [ ] Error handling works for invalid inputs
- [ ] Pricing page displays correctly
- [ ] Mobile responsiveness works

---

## 🔍 **Development**

### **Backend Development**

```bash
cd /app/backend

# Install dependencies
pip install -r requirements.txt

# Run with auto-reload
uvicorn server:app --reload --host 0.0.0.0 --port 8001
```

### **Frontend Development**

```bash
cd /app/frontend

# Install dependencies
yarn install

# Start development server
yarn start
```

---

## 🎨 **UI Features**

### **Dark Theme Design**

- Professional dark interface suitable for legal work
- High contrast for excellent readability
- Responsive design for all screen sizes
- Smooth animations and transitions

### **User Experience**

- Drag-and-drop file upload
- Real-time loading states
- Clear error messaging
- Progress indicators
- Mobile-friendly navigation

---

## 📈 **Performance**

- **PDF Processing**: Intelligent chunking preserves legal clause boundaries
- **AI Integration**: Uses Gemini 1.5 Flash for fast responses
- **Frontend**: Optimized React components with lazy loading
- **Backend**: FastAPI with async support for high performance

---

## 🔐 **Security**

- File type validation (PDF only)
- File size limits (10MB maximum)
- Input sanitization and validation
- CORS properly configured
- Environment variables for sensitive data

---

## 📝 **License**

MIT License - see LICENSE file for details

---

## 🤝 **Support**

If you encounter any issues:

1. Check the troubleshooting section above
2. Review the service logs for errors
3. Ensure all environment variables are properly set
4. Verify the Gemini API key is valid and active

---

## 🎉 **Success Checklist**

When everything is working correctly, you should see:

✅ **Services Status**

```bash
$ sudo supervisorctl status
backend    RUNNING   pid 12345, uptime 0:05:00
frontend   RUNNING   pid 12346, uptime 0:05:00
mongodb    RUNNING   pid 12347, uptime 0:05:00
```

✅ **Frontend Access**: http://localhost:3000 shows the dark Corpus AI interface

✅ **Backend API**: http://localhost:8001 returns `{"status":"active","service":"Corpus AI Legal Assistant API"}`

✅ **Full Workflow**: Upload PDF → Ask Question → Receive AI Answer

---

**🚀 Your Corpus AI Legal Assistant is ready to revolutionize legal document analysis!**
