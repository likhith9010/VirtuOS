# VirtuOS Electron Desktop App

## Quick Start

### Development Mode

1. **Install root dependencies:**
   ```bash
   npm install
   ```

2. **Install frontend dependencies:**
   ```bash
   cd FRONTEND
   npm install
   cd ..
   ```

3. **Install backend dependencies:**
   ```bash
   cd BACKEND
   npm install
   cd ..
   ```

4. **Configure AI Provider (Optional):**
   - API keys can be configured in the app's Settings page
   - Supports: Google Gemini (default), OpenAI, Anthropic, xAI
   - Or create `.env` file in `BACKEND` folder:
     ```
     GEMINI_API_KEY=your-gemini-key
     OPENAI_API_KEY=your-openai-key
     ANTHROPIC_API_KEY=your-anthropic-key
     XAI_API_KEY=your-xai-key
     ```

5. **Run in development mode:**
   ```bash
   npm run dev
   ```
   This will start:
   - Backend server on http://localhost:3000
   - VNC Bridge on port 6080
   - Frontend dev server on http://localhost:5173
   - Electron app

### Production Build

```bash
npm run build
```

This will create distributable packages in the `dist` folder.

### Manual Build Steps

If you want to run components separately:

```bash
# Terminal 1 - Backend
cd BACKEND
npm run dev

# Terminal 2 - Frontend  
cd FRONTEND
npm run dev

# Terminal 3 - Electron
npm start
```

## Available Scripts

- `npm run dev` - Run full app in development mode
- `npm start` - Start Electron app (requires backend and frontend running)
- `npm run build` - Build for production
- `npm run pack` - Package without creating installer
- `npm run dist` - Create distributable installers

## Build Outputs

- **Windows:** `.exe` installer and portable version
- **macOS:** `.dmg` and `.zip`
- **Linux:** `.AppImage` and `.deb`

## Architecture

- **Electron Main Process:** Manages app window and backend server
- **Frontend:** React 19 + Vite + Tailwind CSS (runs in Electron renderer)
- **Backend:** Node.js Express + Socket.IO server (embedded in Electron)
- **VNC Bridge:** WebSocket-to-TCP proxy for VM display (port 6080)
- **VM:** VirtualBox Arch Linux with KDE (VRDE on port 5000)
- **Communication:** Socket.IO for real-time messaging

## Ports Used

| Port | Service | Purpose |
|------|---------|---------|
| 3000 | Backend API | REST endpoints, Socket.IO |
| 5000 | VirtualBox VRDE | VM screen output (VNC) |
| 5173 | Frontend Dev | React app, noVNC client |
| 6080 | VNC Bridge | WebSocket proxy for browser |

## Features

✅ Cross-platform desktop application
✅ Embedded backend server
✅ Real-time AI chat interface
✅ Live VM display via noVNC (30+ FPS)
✅ Computer Use Agent (AI-controlled VM)
✅ Multi-provider AI support (Gemini, OpenAI, Claude, Grok)
✅ File attachments (images + PDFs)
✅ Screenshot capture and auto-cleanup
✅ Native OS integration

