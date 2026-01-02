const WebSocket = require('ws');
const net = require('net');

class VNCBridge {
  constructor(port = 6080) {
    this.wsPort = port;
    this.wss = null;
    this.connections = new Map();
  }

  start() {
    this.wss = new WebSocket.Server({ port: this.wsPort });
    
    this.wss.on('connection', (ws, req) => {
      console.log('New WebSocket connection for VNC');
      
      // Get VNC server details from query params
      const url = new URL(req.url, `http://${req.headers.host}`);
      const vncHost = url.searchParams.get('host') || 'localhost';
      const vncPort = parseInt(url.searchParams.get('port') || '5000');
      
      // Create TCP connection to VNC server
      const vncSocket = net.createConnection(vncPort, vncHost, () => {
        console.log(`Connected to VNC server at ${vncHost}:${vncPort}`);
      });
      
      // Forward data from WebSocket to VNC
      ws.on('message', (data) => {
        try {
          vncSocket.write(data);
        } catch (error) {
          console.error('Error writing to VNC socket:', error);
        }
      });
      
      // Forward data from VNC to WebSocket
      vncSocket.on('data', (data) => {
        try {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(data);
          }
        } catch (error) {
          console.error('Error sending to WebSocket:', error);
        }
      });
      
      // Handle errors and cleanup
      const cleanup = () => {
        try {
          vncSocket.end();
          ws.close();
        } catch (error) {
          console.error('Error during cleanup:', error);
        }
      };
      
      ws.on('close', () => {
        console.log('WebSocket closed');
        cleanup();
      });
      
      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        cleanup();
      });
      
      vncSocket.on('close', () => {
        console.log('VNC socket closed');
        cleanup();
      });
      
      vncSocket.on('error', (error) => {
        console.error('VNC socket error:', error);
        cleanup();
      });
    });
    
    console.log(`VNC WebSocket bridge listening on port ${this.wsPort}`);
  }
  
  stop() {
    if (this.wss) {
      this.wss.close();
      console.log('VNC WebSocket bridge stopped');
    }
  }
}

module.exports = VNCBridge;
