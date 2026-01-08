# VirtuOS - AI-Powered Computer Use Agent

> *A voice command today, a revolution tomorrow.*

## 👨‍💻 About the Creator

Hi, I'm **Likhith** — an Electronics Engineer with a passion for backend and full-stack development. I'm fascinated by the intersection of AI and wearable technology, particularly devices like **Google XR Glasses** and **Meta Ray-Ban Smart Glasses** with integrated vision capabilities.

### Why I Built VirtuOS

VirtuOS isn't just a project — it's a **demonstration of what's possible** when AI meets computer vision and autonomous control. 

Imagine this: You're wearing smart glasses, and with a simple voice command like *"Book me a flight to Tokyo"* or *"Find the best deal on a laptop"*, an AI agent takes over — seeing your screen, clicking buttons, filling forms, and completing the task autonomously. **No hands. No keyboard. Just intent.**

This is the future I'm building towards. VirtuOS serves as:
- 🎯 A **proof of concept** for AI-driven computer automation
- 🔬 A **demonstration of my capabilities** in full-stack development, real-time systems, and AI integration
- 🚀 A **foundation** for the next generation of hands-free computing interfaces

### My Vision

Smart glasses with vision AI will transform how we interact with computers. Instead of being tied to screens, we'll simply describe what we want — and AI agents will execute. VirtuOS is my contribution to making that future a reality.

---

## 🌟 Features

- **Live VM Display**: Real-time 30+ FPS streaming via noVNC
- **Computer Use Agent**: AI sees, thinks, and acts autonomously
- **Multi-Provider AI**: Support for Google Gemini, OpenAI GPT-4V, Anthropic Claude, xAI Grok
- **Natural Language Tasks**: Just describe what you want done
- **File Attachments**: Share images and PDFs for context
- **Real-time Feedback**: Watch the AI's reasoning and actions live

---

## 🛠️ Setup Guide

### Backend Setup

1. **Navigate to BACKEND folder:**
   ```bash
   cd BACKEND
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure API Keys (Optional):**
   - API keys can be set in the app's **Settings** page
   - Or create `.env` file:
     ```
     GEMINI_API_KEY=your-gemini-key
     OPENAI_API_KEY=your-openai-key
     ANTHROPIC_API_KEY=your-anthropic-key
     XAI_API_KEY=your-xai-key
     ```

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

### Frontend Setup

1. **Navigate to FRONTEND folder:**
   ```bash
   cd FRONTEND
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```

Frontend will run on: http://localhost:5173

---

### Full App (Recommended)

From the root directory:
```bash
npm install
npm run dev
```

This starts backend, frontend, and Electron app together.

---

## 🏗️ Architecture

- **Frontend:** React 19 + Vite + Tailwind CSS
- **Backend:** Node.js + Express + Socket.IO
- **VM Display:** noVNC + WebSocket Bridge
- **AI Integration:** Multi-provider vision models
- **VM Control:** VirtualBox + SSH + xdotool

---

## 🤝 Contributing & Future Improvements

This project is **open for contributions**! If you're excited about AI agents, computer vision, or autonomous systems, here's how you can help:

### Areas for Improvement

| Area | Current State | Improvement Needed |
|------|---------------|-------------------|
| **Click Accuracy** | ~70-80% | Better coordinate prediction, element detection |
| **Task Completion** | Simple tasks work well | Complex multi-step workflows need refinement |
| **Speed** | 12s between AI calls (rate limiting) | Optimize for faster providers or local models |
| **Error Recovery** | Basic retry logic | Smarter fallback strategies |
| **Voice Input** | Not implemented | Add speech-to-text for true hands-free control |
| **Local AI Models** | Cloud-only | Support for Ollama, LLaMA for offline use |

### Ideas for Extension

- 🎤 **Voice Commands**: Integrate Whisper API for speech-to-text
- 🧠 **Local LLMs**: Add Ollama/LLaMA support for privacy-focused users
- 📱 **Mobile Companion**: Control your VM from your phone
- 🕶️ **XR Integration**: Build for smart glasses platforms
- 🔄 **Task Templates**: Pre-built workflows for common tasks
- 📊 **Analytics Dashboard**: Track agent performance and success rates

### How to Contribute

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 🐛 Troubleshooting

**Backend not connecting:**
- Ensure port 3000 is not in use
- Check if API key is correctly set
- Verify all dependencies are installed

**Frontend not connecting:**
- Check console for connection errors
- Ensure backend is running on port 3000

**Live View not working:**
- Verify VM is running (Controls tab shows "running")
- Check if VNC bridge started (port 6080)
- Ensure VRDE is enabled on VM (port 5000)

**AI not responding:**
- Check backend console for errors
- Verify API key is valid and has credits
- Check API rate limits

---

## 📜 License

This project is open source in MIT License. Feel free to use, modify, and distribute.

---

## 📬 Contact

If you're working on AI glasses, autonomous agents, or just want to chat about the future of human-computer interaction — I'd love to connect!

**Built with ❤️ by Likhith**

*"The best way to predict the future is to build it."*

