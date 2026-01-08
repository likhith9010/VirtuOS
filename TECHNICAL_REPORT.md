# VirtuOS Project - Technical Report & Problem Analysis

## Project Overview

**VirtuOS** is a Computer Use Agent system inspired by Anthropic's Computer Use demo. The goal is to create an Electron desktop application that provides real-time interactive control of a VirtualBox VM (Arch Linux), enabling AI agents to control the VM through visual feedback and input simulation (mouse/keyboard).

### Tech Stack
- **Frontend**: React 19 + Vite + Tailwind CSS (port 5173)
- **Backend**: Node.js + Express + Socket.IO (port 3000)  
- **Desktop**: Electron 28 wrapper
- **VM**: VirtualBox "Arch Linux" VM running headless

### Core Requirements
1. **Live visual display** of the VM screen embedded in the Electron app
2. **Real-time mouse control** - click, move, drag operations
3. **Real-time keyboard control** - typing, shortcuts, special keys
4. **Low latency** - suitable for AI agent interaction (<200ms response)
5. **No external RDP/VNC clients** - everything embedded in the app

---

## Application Features

### Sidebar (Left Panel)
The sidebar serves as the primary navigation and chat management interface:

- **New Chat Button**: Creates a fresh conversation session with a unique ID and timestamp
- **Chat History List**: Displays all previous conversations with truncated titles (first 40 characters of the initial message)
- **Active Chat Indicator**: Highlights the currently selected conversation with visual styling
- **Chat Selection**: Click any chat to switch context and load its message history
- **Delete Chat**: Remove conversations from history (with confirmation)
- **Persistent Storage**: Chat history is preserved in localStorage for session persistence

### Navbar (Top Bar)
The top navigation bar provides global controls and status information:

- **App Branding**: VirtuOS logo and title
- **Connection Status**: Real-time indicator showing backend connectivity (green = connected, red = disconnected)
- **Settings Access**: Opens the settings modal for AI provider configuration
- **VM Controls**: Quick access buttons for VM power operations (start/stop)
- **Agent Status**: Shows current Computer Use agent state (idle, thinking, executing)

### Chat Area (Center Panel)
The chat area is the main conversation display between the user and AI:

- **Welcome Screen**: Displayed when no messages exist, featuring:
  - Animated icon with pulsing effect
  - Helpful prompt suggestions (e.g., "Open YouTube and play a song")
  - Quick-start task buttons for common operations

- **Message Display**: 
  - **User Messages**: Right-aligned orange gradient bubbles with white text
  - **Assistant Messages**: Left-aligned gray bubbles with VirtuOS avatar
  - **Agent Thinking**: Blue bubbles showing AI reasoning process
  - **Agent Actions**: Green (success) or red (failure) action confirmations

- **Attachments Support**:
  - Images display as 48x48 thumbnails with filename
  - PDFs show red document icon with filename
  - Hover tooltips for truncated filenames

- **Screenshot Previews**: Task responses include clickable VM screenshots
- **Auto-scroll**: Automatically scrolls to latest messages
- **Iteration Counter**: Shows number of steps taken for complex tasks

### ChatBox (Input Area)
The message input component at the bottom of the chat area:

- **Text Input**: Multi-purpose textarea for messages and task commands
- **File Attachment Button (+)**: Opens file picker for images and PDFs
  - Accepts: `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`, `.pdf`
  - Multiple file selection supported
  - Files uploaded to server (`/api/upload`) and stored in `images/` or `pdfs/` folders

- **Attachment Preview**: Shows attached files as removable chips
  - Blue chips for images
  - Red chips for PDFs
  - Click X to remove before sending

- **Send Button**: Submits message with any attachments
- **Keyboard Shortcut**: Enter to send (Shift+Enter for new line)
- **Stop Button**: Appears during agent execution to cancel ongoing tasks

### VM Viewer Area (Right Panel)
Displays the live virtual machine screen for visual feedback and interaction. This area embeds the VM display using VNC streaming, enabling real-time viewing and control of the Arch Linux VM. *Detailed implementation covered in Computer Use & VNC + Websockify Integration section.*

---
## VNC + Websockify Integration

### The Challenge
Embedding a live, interactive VM display inside an Electron app is non-trivial. Traditional approaches like capturing screenshots in a loop create laggy, non-interactive experiences. We needed:
- Real-time screen updates (30+ FPS)
- Full mouse and keyboard interaction
- No external windows or RDP clients
- Low latency suitable for AI agent control

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     VirtuOS Electron App                        │
│  ┌─────────────┐    ┌──────────────┐    ┌───────────────────┐  │
│  │   React     │    │   noVNC      │    │    VNC Bridge     │  │
│  │  Frontend   │───▶│   Client     │───▶│   (vncBridge.js)  │  │
│  │  (iframe)   │    │   (vnc.html) │    │   Port 6080       │  │
│  └─────────────┘    └──────────────┘    └─────────┬─────────┘  │
└─────────────────────────────────────────────────────│───────────┘
                                                      │ WebSocket
                                                      │ to TCP
                                                      ▼
                                          ┌───────────────────┐
                                          │  VirtualBox VRDE  │
                                          │   (VNC Server)    │
                                          │    Port 5000      │
                                          └─────────┬─────────┘
                                                    │
                                                    ▼
                                          ┌───────────────────┐
                                          │   Arch Linux VM   │
                                          │   (KDE Plasma)    │
                                          │   1280x800        │
                                          └───────────────────┘
```

### Components Explained

#### 1. VirtualBox VRDE (Port 5000)
VirtualBox has a built-in remote display server called VRDE (VirtualBox Remote Desktop Extension). When the VM starts, we enable VRDE which exposes the VM screen via VNC protocol on port 5000. The `vmController.js` handles enabling VRDE and setting the port before starting the VM in GUI mode.

#### 2. VNC WebSocket Bridge (Port 6080)
Browsers can't connect directly to VNC (TCP) servers. The `vncBridge.js` acts as a WebSocket-to-TCP proxy that:
- Listens for WebSocket connections on port 6080
- Opens a TCP connection to VirtualBox VRDE on port 5000
- Forwards all data bidirectionally between WebSocket and TCP

#### 3. noVNC Client (vnc.html)
noVNC is a JavaScript VNC client that runs entirely in the browser. We load it via CDN in an iframe (`/vnc.html`). It connects to the WebSocket bridge and renders the VM screen with configurable quality and compression settings. On successful connection, it notifies the parent React app via `postMessage`.

#### 4. React Integration (ScreenshotsPanel.jsx)
The ScreenshotsPanel component embeds vnc.html in an iframe and manages connection state. It listens for messages from the iframe to update the VNC connection status indicator (connected/disconnected).

### Files Structure

| File | Purpose |
|------|---------|
| `BACKEND/vncBridge.js` | WebSocket-to-VNC bridge server |
| `BACKEND/server.js` | Starts VNC bridge on port 6080 |
| `BACKEND/vmController.js` | Enables VRDE on port 5000 |
| `FRONTEND/public/vnc.html` | noVNC client page |
| `FRONTEND/src/components/ScreenshotsPanel.jsx` | Live View tab with VNC viewer |

### VM Panel Tabs

The ScreenshotsPanel provides three tabs:

1. **Controls Tab**: Start/Stop VM buttons with status indicator
2. **Screenshots Tab**: Manual screenshot capture for documentation and debugging
3. **Live View Tab**: Real-time interactive VM display (30+ FPS)

### Full Interaction Capabilities

Once connected, users can:
- **Mouse**: Click anywhere in the display to interact with the VM
- **Keyboard**: Type directly - input goes to the VM
- **Cursor**: Mouse movement works inside the VM
- **Real-time**: 30+ FPS screen updates for smooth experience

### Automated Startup Flow

When the app launches, the following happens automatically:

1. **Backend Server Starts** (`npm run dev:backend`)
   - Express server on port 3000
   - VNC Bridge starts on port 6080
   
2. **Frontend Dev Server Starts** (`npm run dev:frontend`)
   - Vite serves React app on port 5173
   - vnc.html available at `/vnc.html`

3. **User Clicks "Start VM"**
   - API call to `/api/vm/:name/start`
   - VBoxManage enables VRDE on port 5000
   - the commands:xhost +local:  | x0vncserver -display :0 -SecurityTypes None &  |websockify 0.0.0.0:6080 localhost:5900 | to integrate VM to app is automated using a startup script.
   - VBoxManage starts VM in GUI mode
   - VM boots into KDE Plasma desktop

4. **User Switches to "Live View" Tab**
   - iframe loads `/vnc.html`
   - noVNC connects to `ws://127.0.0.1:6080`
   - VNC Bridge connects to VirtualBox VRDE on port 5000
   - Live display appears with full interaction

### Port Summary

| Port | Service | Protocol | Purpose |
|------|---------|----------|---------|
| 3000 | Backend API | HTTP | REST endpoints, Socket.IO |
| 5000 | VirtualBox VRDE | VNC/TCP | VM screen output |
| 5173 | Frontend Dev | HTTP | React app, vnc.html |
| 6080 | VNC Bridge | WebSocket | Browser-to-VNC proxy |

### Troubleshooting

**If Live View doesn't connect:**
1. Verify VM is running (Controls tab should show "running")
2. Check browser console for connection errors
3. Ensure VNC bridge started (backend logs should show "VNC WebSocket bridge listening on port 6080")
4. Try restarting the VM

**Performance Notes:**
- Live View: 30+ FPS, full interaction
- Screenshots: On-demand captures, useful for AI agent logging

### Why This Approach Works

1. **No External Dependencies**: Everything runs locally, no cloud services
2. **Full Interaction**: Mouse clicks, keyboard input all work natively
3. **Low Latency**: Direct WebSocket connection, no polling
4. **Browser Compatible**: Works in Electron's Chromium without plugins
5. **Scalable**: Could connect to remote VMs by changing VRDE host

---

## Computer Use Agent

### Overview
The Computer Use Agent is the brain of VirtuOS - an AI-powered autonomous system that can see, think, and act on the VM just like a human would. Inspired by Anthropic's Computer Use demo, it implements a continuous **See → Think → Act → Loop** cycle to complete user tasks.

### The See-Think-Act Loop

```
┌──────────────────────────────────────────────────────────────────┐
│                    COMPUTER USE AGENT LOOP                       │
│                                                                  │
│   ┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐   │
│   │   SEE   │────▶│  THINK  │────▶│   ACT   │────▶│  LOOP   │   │
│   │         │     │         │     │         │     │         │   │
│   │Capture  │     │AI Vision│     │Execute  │     │Check if │   │
│   │Screen   │     │Analysis │     │Action   │     │Complete │   │
│   └─────────┘     └─────────┘     └─────────┘     └────┬────┘   │
│        ▲                                               │        │
│        └───────────────────────────────────────────────┘        │
│                         (if not done)                           │
└──────────────────────────────────────────────────────────────────┘
```

1. **SEE**: Capture a screenshot of the current VM screen
2. **THINK**: Send screenshot to AI vision model for analysis
3. **ACT**: Execute the AI's recommended action (click, type, etc.)
4. **LOOP**: Check if task is complete, if not, repeat

### Architecture Components

#### 1. computerUseAgent.js (Orchestrator)
The main controller that manages the agent loop:

- **Task Reception**: Receives user task from frontend via Socket.IO
- **Screenshot Capture**: Uses `vmController.getVMScreenshot()` to capture VM state
- **AI Coordination**: Sends screenshots to `chatBot.getComputerUseAction()`
- **Action Execution**: Forwards AI decisions to `actionExecutor.executeAction()`
- **Progress Emission**: Real-time updates via Socket.IO events
- **Loop Management**: Handles iteration limits, completion detection, and stop signals

#### 2. chatBot.js (AI Brain)
Handles communication with vision-capable AI models:

- **Multi-Provider Support**: Google Gemini, OpenAI GPT-4V, Anthropic Claude, xAI Grok
- **Vision Analysis**: Sends screenshot + task context to AI
- **Action Generation**: AI returns structured JSON with next action
- **Screen Layout Hints**: Provides coordinate guides for 1280x800 resolution
- **Action History**: Includes previous actions to prevent loops

#### 3. actionExecutor.js (Hands)
Translates AI decisions into VM input events:

- **Click Actions**: `click`, `double_click`, `right_click` at (x, y)
- **Keyboard Actions**: `type` text, `key_press` (enter, escape, ctrl+c, etc.)
- **Mouse Actions**: `scroll`, `drag`, `move`
- **Control Actions**: `wait`, `screenshot`, `done`, `error`

#### 4. vmController.js (VM Interface)
Low-level VM control via SSH:

- **Screenshot Capture**: `scrot` command captures PNG to file
- **Mouse Control**: `xdotool mousemove` and `xdotool click`
- **Keyboard Control**: `xdotool type` and `xdotool key`
- **Window Management**: Focus, resize, close windows

### Execution Paths

The agent has three execution paths based on task complexity:

#### Quick Path (Simple Known Tasks)
For simple tasks like "open browser", the agent skips AI entirely:
- Matches task against `KNOWN_LOCATIONS` dictionary
- Directly clicks pre-mapped coordinates
- Completes in 1 iteration (~2 seconds)

#### Hybrid Path (Complex Tasks with Known Start)
For tasks like "open browser and search for cats":
- First action uses known location (fast)
- Remaining steps use AI analysis (accurate)
- Combines speed with flexibility

#### AI Path (Unknown Tasks)
For complex or novel tasks:
- Full AI analysis at every step
- Maximum flexibility but slower
- Up to 10 iterations with rate limiting

### AI Prompt Engineering

The AI receives a detailed system prompt including:

**Screen Layout Map**:
- Desktop area coordinates (0,0 to 1280,700)
- Icon positions and spacing
- Taskbar element locations
- Common UI element coordinates

**Action Types**:
- All supported action formats with examples
- JSON schema for responses

**Intelligence Rules**:
- One action per response
- Click center of elements
- Never repeat failed actions
- Detect completion states

**Context Information**:
- Previous actions with success/failure status
- Screen change detection warnings
- Current iteration count

### Real-Time Feedback

The agent emits Socket.IO events throughout execution:

| Event | Data | Purpose |
|-------|------|---------|
| `agent_start` | task, maxIterations | Task begins |
| `agent_iteration` | iteration, maxIterations | Loop progress |
| `agent_status` | phase, message | Current phase |
| `agent_screenshot` | base64, path | Screen capture |
| `agent_thinking` | thinking, action | AI reasoning |
| `agent_action_result` | success, message | Action outcome |
| `agent_complete` | message, iterations | Task done |
| `agent_stopped` | message | User cancelled |
| `agent_error` | message | Error occurred |

### Screen Change Detection

The agent tracks if actions are effective:

- **Hash Comparison**: Compares screenshot hashes between iterations
- **Same Screen Counter**: Tracks consecutive unchanged screens
- **Warning System**: After 3 unchanged screens, alerts AI to try different approach
- **Prevents Loops**: AI instructed never to repeat exact same failed action

### Known Locations Dictionary

Pre-mapped coordinates for common elements (1280x800 resolution):

**Desktop Icons** (x ≈ 46):
- VLC: (46, 55)
- Zen Browser: (46, 165)

**Taskbar** (y = 752):
- App Menu: (26, 752)
- Show Desktop: (68, 752)
- VLC: (112, 752)
- Settings: (156, 752)
- File Manager: (200, 752)
- Terminal: (244, 752)

### Safety Features

- **Max Iterations**: Hard limit of 10 iterations per task
- **Stop Button**: User can cancel at any time via `stop-agent` event
- **Rate Limiting**: 12-second delay between API calls (5 RPM limit)
- **Error Recovery**: Graceful handling of screenshot/action failures
- **Timeout Protection**: Prevents infinite loops

---
