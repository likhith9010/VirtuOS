# VirtuOS Project - Technical Report & Problem Analysis

## Project Overview

**VirtuOS** is a Computer Use Agent system inspired by Anthropic's Computer Use demo. The goal is to create an Electron desktop application that provides real-time interactive control of a VirtualBox VM (Arch Linux), enabling AI agents to control the VM through visual feedback and input simulation (mouse/keyboard).

### Architecture
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

## Attempted Solutions & Failures

### Attempt 1: noVNC (VNC over WebSocket)
**Implementation**:
- Tried using `@novnc/novnc` library for browser-based VNC client
- Plan was to run VNC server in VM, connect via noVNC in React

**Problem**: 
- noVNC uses ES modules with top-level `await`
- Incompatible with Vite bundler - cannot be imported
- Vite build fails with module resolution errors

**Status**: ❌ Abandoned

---

### Attempt 2: Custom VNC WebSocket Bridge
**Implementation**:
- Created `vncBridge.js` - Node.js WebSocket server
- VNC client (`rfb2`) connecting to VM
- Browser connects to bridge via WebSocket
- Forward VNC protocol through WebSocket

**Problem**:
- WebSocket connection established successfully
- VNC protocol handshake fails - no frames received
- Connection drops immediately after connecting
- `rfb2` library appears to have compatibility issues with VirtualBox VNC

**Status**: ❌ Abandoned

---

### Attempt 3: RDP with VRDE (Current Approach)
**Implementation**:
- VirtualBox VRDE (VirtualBox Remote Desktop Extension) on port 5000
- `node-rdpjs-2` library for RDP protocol handling
- `rdpBridge.js` - WebSocket-to-RDP bridge on port 6080
- `RDPViewer.jsx` - React component with canvas rendering

**Configuration**:
```bash
VBoxManage modifyvm "Arch Linux" --vrde on --vrdeport 5000
VBoxManage startvm "Arch Linux" --type headless
```

**Current Status**:
```
VRDE: enabled (Address 0.0.0.0, Ports 5000, MultiConn: off)
VRDE Connection: not active
Extension Packs: 0
```

**Problem - ROOT CAUSE IDENTIFIED**:
```
Error: connect ECONNREFUSED ::1:5000
Error: connect ECONNREFUSED 127.0.0.1:5000
```

**VirtualBox VRDE requires the proprietary "Oracle VM VirtualBox Extension Pack"** to function. Without it:
- VRDE server shows as "enabled" but won't accept connections
- All RDP connection attempts are refused
- No way to connect via RDP protocol

**Extension Pack Status**: Not installed (due to Oracle licensing restrictions)

**Status**: ❌ Blocked by Extension Pack requirement

---

## Technical Constraints

### VirtualBox Limitations
1. **VRDE/RDP**: Requires Extension Pack (proprietary license)
2. **VNC**: Not natively supported by VirtualBox
3. **Framebuffer API**: Requires VirtualBox SDK, complex C++ bindings
4. **Guest Additions**: Would require installing inside VM, doesn't provide remote display

### Protocol Challenges
- **VNC**: Requires VNC server installed in guest OS, complex setup
- **RDP**: Extension Pack required
- **SPICE**: Not supported by VirtualBox (KVM/QEMU only)
- **WebRTC**: No existing VirtualBox integration

### JavaScript/Node.js Ecosystem
- **noVNC**: Module compatibility issues with modern bundlers
- **rfb2**: VNC library seems unmaintained, connection issues
- **node-rdpjs-2**: Works but can't connect due to Extension Pack

---

## Current Codebase State

### Backend Components

**rdpBridge.js** (Port 6080):
```javascript
- WebSocket server listening
- node-rdpjs-2 client attempting to connect to localhost:5000
- Bitmap event handlers for screen updates
- Mouse/keyboard event forwarding
- Error handling implemented
```

**vmController.js**:
```javascript
- VBoxManage CLI wrapper
- VM start/stop/status functions
- VRDE configuration (--vrde on --vrdeport 5000)
- Screenshot capture (working, but not real-time)
```

**server.js**:
```javascript
- Express API on port 3000
- Socket.IO for client communication
- RDP bridge initialization
- VM control endpoints (/api/vm/*)
```

### Frontend Components

**RDPViewer.jsx**:
```javascript
- Canvas-based display (1280x720)
- WebSocket connection to ws://localhost:6080
- Mouse event handlers (move, click, drag)
- Keyboard event handlers
- Base64 image rendering
```

**ScreenshotsPanel.jsx**:
```javascript
- Three tabs: Controls, Screenshots, Live View
- VM start/stop controls
- Manual screenshot capture
- RDPViewer integration in Live View tab
```

---

## What We Need

### Essential Requirements
1. **Working remote display protocol** that:
   - Works with VirtualBox without Extension Pack
   - Can be accessed from Node.js
   - Supports real-time screen updates (<100ms)
   - Works on Windows host

2. **Bidirectional input control**:
   - Send mouse coordinates and clicks to VM
   - Send keyboard events to VM
   - Accurate coordinate mapping

3. **Browser-compatible streaming**:
   - Can be displayed in Electron/Chromium
   - Preferably canvas-based rendering
   - Low overhead encoding (PNG, JPEG, or raw pixels)

### Possible Solutions We Haven't Tried

1. **VirtualBox Web Service API (vboxwebsrv)**:
   - SOAP/REST API for VM control
   - Might have framebuffer access
   - Need to investigate capabilities

2. **Direct Framebuffer Access**:
   - VirtualBox SDK native bindings
   - Read framebuffer directly from VM memory
   - Would require native Node.js addon

3. **Alternative Hypervisors**:
   - QEMU/KVM with SPICE protocol
   - VMware with VNC
   - Hyper-V with Enhanced Session Mode

4. **X11 Forwarding** (Linux guest specific):
   - Forward X11 display over network
   - Render in Electron via Xpra or similar
   - Would only work for X11 applications

5. **Install Extension Pack**:
   - Download from Oracle website
   - Install: `VBoxManage extpack install <file>`
   - Accept Oracle license terms
   - Would make VRDE/RDP work immediately

---

## Questions for Community/Experts

1. **Is there a way to access VirtualBox VM display without Extension Pack?**
   - Any alternative protocols?
   - Direct framebuffer reading?
   - VirtualBox API capabilities?

2. **Has anyone successfully embedded VirtualBox display in Electron app?**
   - What protocol/library did you use?
   - How did you handle input forwarding?

3. **Are there Node.js bindings for VirtualBox SDK?**
   - Can we access IFramebuffer interface?
   - Sample code or examples?

4. **Alternative approaches to screenshot polling?**
   - Can we get diff-based updates?
   - Faster capture methods?
   - Event-driven screen change notifications?

5. **Should we switch hypervisors?**
   - Would QEMU/KVM be easier for this use case?
   - Docker with X11 passthrough?
   - Windows Subsystem for Linux GUI?

---

## Performance Considerations

### Current Screenshot Approach Issues
- Manual capture only (not real-time)
- VBoxManage CLI overhead (~200-500ms per screenshot)
- File I/O bottleneck (write PNG → read → send → delete)
- Not suitable for interactive control

### Target Metrics
- **Frame rate**: 10-30 FPS minimum
- **Input latency**: <100ms click-to-response
- **Network overhead**: <1MB/s for 720p stream
- **CPU usage**: <20% on host

---

## Development Environment

### System Info
- **Host OS**: Windows 11
- **VirtualBox**: Latest version (no Extension Pack)
- **Node.js**: v20+
- **VM**: Arch Linux (headless mode)
- **Dev Tools**: VS Code, PowerShell

### Package Versions
```json
{
  "electron": "^28.0.0",
  "react": "^19.0.0",
  "vite": "^7.2.7",
  "socket.io": "^4.8.1",
  "node-rdpjs-2": "^0.4.0"
}
```

---

## Conclusion

We're stuck at the remote display layer. Every browser-compatible protocol we've tried either:
1. Has library/compatibility issues (noVNC, rfb2)
2. Requires proprietary software we don't have (Extension Pack)
3. Isn't supported by VirtualBox natively (SPICE, WebRTC)

**We need a working solution for real-time VM display and input control that works with VirtualBox on Windows without the Extension Pack, or guidance on whether we should pivot to a different virtualization technology entirely.**

Any suggestions, alternative approaches, or technical guidance would be greatly appreciated.
