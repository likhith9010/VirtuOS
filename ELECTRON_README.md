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

4. **Configure Backend API Key:**
   - Create `.env` file in `BACKEND` folder
   - Add your Google Gemini API key:
     ```
     GEMINI_API_KEY=your-api-key-here
     ```

5. **Run in development mode:**
   ```bash
   npm run dev
   ```
   This will start:
   - Backend server on http://localhost:3000
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
- **Frontend:** React + Vite (runs in Electron renderer)
- **Backend:** Node.js Express server (embedded in Electron)
- **Communication:** Socket.IO for real-time messaging

## Features

✅ Cross-platform desktop application
✅ Embedded backend server
✅ Real-time AI chat interface
✅ Auto-updates support (can be configured)
✅ Native OS integration
