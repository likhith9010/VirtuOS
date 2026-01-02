const WebSocket = require('ws');
const rdp = require('node-rdpjs-2');

class RDPBridge {
  constructor(port = 6080) {
    this.wsPort = port;
    this.wss = null;
  }

  start() {
    this.wss = new WebSocket.Server({ port: this.wsPort });
    console.log(`RDP WebSocket bridge listening on port ${this.wsPort}`);
    
    this.wss.on('connection', (ws, req) => {
      console.log('New WebSocket connection for RDP');
      
      // Get RDP server details from query params
      const url = new URL(req.url, `http://${req.headers.host}`);
      const rdpHost = url.searchParams.get('host') || 'localhost';
      const rdpPort = parseInt(url.searchParams.get('port') || '5000');
      
      console.log(`Connecting to RDP server at ${rdpHost}:${rdpPort}`);
      
      try {
        // Create RDP client
        const client = rdp.createClient({
          domain: '',
          userName: 'vbox', // VirtualBox default
          password: '',
          enablePerf: true,
          autoLogin: true,
          decompress: false,
          screen: { width: 1280, height: 720 },
          locale: 'en',
          logLevel: 'INFO'
        }).on('connect', function() {
          console.log('RDP client connected');
          ws.send(JSON.stringify({ type: 'connected' }));
        }).on('bitmap', function(bitmap) {
          // Send bitmap updates to WebSocket
          try {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({
                type: 'bitmap',
                data: {
                  width: bitmap.width,
                  height: bitmap.height,
                  x: bitmap.destLeft,
                  y: bitmap.destTop,
                  data: bitmap.data.toString('base64')
                }
              }));
            }
          } catch (error) {
            console.error('Error sending bitmap:', error);
          }
        }).on('close', function() {
          console.log('RDP client disconnected');
          if (ws.readyState === WebSocket.OPEN) {
            ws.close();
          }
        }).on('error', function(err) {
          console.error('RDP client error:', err);
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'error', message: err.message }));
          }
        });
        
        // Handle WebSocket messages (mouse, keyboard input)
        ws.on('message', (data) => {
          try {
            const message = JSON.parse(data);
            
            if (message.type === 'mouse') {
              client.sendPointerEvent(message.x, message.y, message.button, message.isPressed);
            } else if (message.type === 'keyboard') {
              client.sendKeyEventUnicode(message.keyCode, message.isPressed);
            }
          } catch (error) {
            console.error('Error processing WebSocket message:', error);
          }
        });
        
        // Handle WebSocket close
        ws.on('close', () => {
          console.log('WebSocket closed, closing RDP client');
          client.close();
        });
        
        ws.on('error', (error) => {
          console.error('WebSocket error:', error);
          client.close();
        });
        
        // Connect to RDP server
        client.connect(rdpHost, rdpPort);
        
      } catch (error) {
        console.error('Error creating RDP client:', error);
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'error', message: error.message }));
          ws.close();
        }
      }
    });
  }
  
  stop() {
    if (this.wss) {
      this.wss.close();
      console.log('RDP WebSocket bridge stopped');
    }
  }
}

module.exports = RDPBridge;
