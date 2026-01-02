const { exec, spawn } = require('child_process');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

const VBOX_MANAGE = 'C:\\Program Files\\Oracle\\VirtualBox\\VBoxManage.exe';

class LiveStreamBridge {
  constructor(port = 6080) {
    this.wsPort = port;
    this.wss = null;
    this.streamingClients = new Map();
  }

  start() {
    this.wss = new WebSocket.Server({ port: this.wsPort });
    console.log(`Live Stream bridge listening on port ${this.wsPort}`);

    this.wss.on('connection', (ws, req) => {
      console.log('New WebSocket connection for Live Stream');

      const url = new URL(req.url, `http://${req.headers.host}`);
      const vmName = url.searchParams.get('vm') || 'Arch Linux';
      
      const clientId = Date.now().toString();
      
      // Start streaming frames
      this.startStreaming(ws, vmName, clientId);

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data);
          this.handleInput(vmName, message);
        } catch (error) {
          console.error('Error processing message:', error);
        }
      });

      ws.on('close', () => {
        console.log('WebSocket closed');
        this.stopStreaming(clientId);
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.stopStreaming(clientId);
      });
    });
  }

  startStreaming(ws, vmName, clientId) {
    const screenshotDir = path.join(__dirname, 'screenshots');
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir);
    }

    const captureFrame = async () => {
      if (ws.readyState !== WebSocket.OPEN) {
        this.stopStreaming(clientId);
        return;
      }

      const screenshotPath = path.join(screenshotDir, `frame_${clientId}.png`);
      
      try {
        await new Promise((resolve, reject) => {
          exec(`"${VBOX_MANAGE}" controlvm "${vmName}" screenshotpng "${screenshotPath}"`, (error) => {
            if (error) reject(error);
            else resolve();
          });
        });

        if (fs.existsSync(screenshotPath)) {
          const imageData = fs.readFileSync(screenshotPath);
          const base64Image = imageData.toString('base64');
          
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              type: 'frame',
              data: `data:image/png;base64,${base64Image}`,
              timestamp: Date.now()
            }));
          }

          // Clean up
          fs.unlinkSync(screenshotPath);
        }
      } catch (error) {
        // VM might not be running
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'error',
            message: 'Failed to capture frame'
          }));
        }
      }
    };

    // Send initial connection success
    ws.send(JSON.stringify({ type: 'connected', vmName }));

    // Capture at ~10 FPS
    const intervalId = setInterval(captureFrame, 100);
    this.streamingClients.set(clientId, intervalId);
    
    // Capture first frame immediately
    captureFrame();
  }

  stopStreaming(clientId) {
    const intervalId = this.streamingClients.get(clientId);
    if (intervalId) {
      clearInterval(intervalId);
      this.streamingClients.delete(clientId);
    }
  }

  async handleInput(vmName, message) {
    try {
      if (message.type === 'keyboard') {
        // Convert keyCode to scancode and send to VM
        const scancode = this.keyCodeToScancode(message.keyCode);
        if (scancode) {
          const cmd = message.isPressed 
            ? `"${VBOX_MANAGE}" controlvm "${vmName}" keyboardputscancode ${scancode}`
            : `"${VBOX_MANAGE}" controlvm "${vmName}" keyboardputscancode ${this.getKeyReleaseScancode(scancode)}`;
          exec(cmd);
        }
      } else if (message.type === 'keystring') {
        // Send string directly
        exec(`"${VBOX_MANAGE}" controlvm "${vmName}" keyboardputstring "${message.text}"`);
      } else if (message.type === 'mouse') {
        // VBoxManage doesn't have direct mouse control via CLI
        // This would require Guest Additions or different approach
        console.log('Mouse event received (not supported via CLI):', message);
      }
    } catch (error) {
      console.error('Error handling input:', error);
    }
  }

  // Basic keyboard scancode mapping
  keyCodeToScancode(keyCode) {
    const scancodeMap = {
      8: '0e',    // Backspace
      9: '0f',    // Tab
      13: '1c',   // Enter
      16: '2a',   // Shift
      17: '1d',   // Ctrl
      18: '38',   // Alt
      20: '3a',   // Caps Lock
      27: '01',   // Escape
      32: '39',   // Space
      37: 'e04b', // Left Arrow
      38: 'e048', // Up Arrow
      39: 'e04d', // Right Arrow
      40: 'e050', // Down Arrow
      46: 'e053', // Delete
      48: '0b', 49: '02', 50: '03', 51: '04', 52: '05', // 0-4
      53: '06', 54: '07', 55: '08', 56: '09', 57: '0a', // 5-9
      65: '1e', 66: '30', 67: '2e', 68: '20', 69: '12', // A-E
      70: '21', 71: '22', 72: '23', 73: '17', 74: '24', // F-J
      75: '25', 76: '26', 77: '32', 78: '31', 79: '18', // K-O
      80: '19', 81: '10', 82: '13', 83: '1f', 84: '14', // P-T
      85: '16', 86: '2f', 87: '11', 88: '2d', 89: '15', // U-Y
      90: '2c', // Z
      112: '3b', 113: '3c', 114: '3d', 115: '3e', // F1-F4
      116: '3f', 117: '40', 118: '41', 119: '42', // F5-F8
      120: '43', 121: '44', 122: '57', 123: '58', // F9-F12
    };
    return scancodeMap[keyCode];
  }

  getKeyReleaseScancode(scancode) {
    // Add 0x80 to make it a key release
    if (scancode.startsWith('e0')) {
      return scancode + ' ' + (parseInt(scancode.slice(2), 16) + 0x80).toString(16);
    }
    return (parseInt(scancode, 16) + 0x80).toString(16);
  }

  stop() {
    for (const [clientId, intervalId] of this.streamingClients) {
      clearInterval(intervalId);
    }
    this.streamingClients.clear();
    
    if (this.wss) {
      this.wss.close();
      console.log('Live Stream bridge stopped');
    }
  }
}

module.exports = LiveStreamBridge;
