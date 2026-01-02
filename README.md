# VirtuOS Setup Guide

## Backend Setup

1. **Navigate to BACKEND folder:**
   ```bash
   cd BACKEND
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure API Key:**
   - Copy `.env.example` to `.env`:
     ```bash
     cp .env.example .env
     ```
   - Edit `.env` file and add your OpenAI API key:
     ```
     OPENAI_API_KEY=sk-your-actual-api-key-here
     ```
   - Get your API key from: https://platform.openai.com/api-keys

4. **Start the backend server:**
   ```bash
   npm start
   ```
   Or for development with auto-reload:
   ```bash
   npm run dev
   ```

Backend will run on: http://localhost:3000

---

## Frontend Setup

1. **Navigate to FRONTEND folder:**
   ```bash
   cd FRONTEND
   ```

2. **Install socket.io-client:**
   ```bash
   npm install socket.io-client
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```

Frontend will run on: http://localhost:5173

---

## Usage

1. Make sure both backend (port 3000) and frontend (port 5173) are running
2. Open http://localhost:5173 in your browser
3. Type a message in the chatbox and press Enter or click the send button
4. The AI will respond and conversation will appear in the chat area

---

## Architecture

- **Frontend:** Vite + React 19 + Tailwind CSS + Socket.IO Client
- **Backend:** Node.js + Express + Socket.IO + OpenAI API
- **Real-time Communication:** Socket.IO for bidirectional messaging
- **AI Integration:** OpenAI GPT-3.5-turbo (configurable to GPT-4)

---

## Alternative: Using Google Gemini

If you prefer to use Google Gemini instead of OpenAI:

1. Uncomment the `getChatResponseGemini` function in `chatBot.js`
2. Update `server.js` to use `getChatResponseGemini` instead
3. Add `GEMINI_API_KEY` to your `.env` file
4. Get API key from: https://makersuite.google.com/app/apikey

---

## Troubleshooting

**Backend not connecting:**
- Ensure port 3000 is not in use
- Check if API key is correctly set in `.env`
- Verify all dependencies are installed

**Frontend not connecting:**
- Check console for connection errors
- Ensure backend is running on port 3000
- Verify Socket.IO client is installed

**AI not responding:**
- Check backend console for errors
- Verify API key is valid and has credits
- Check API rate limits
