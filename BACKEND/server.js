require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { getChatResponse, isTask } = require('./chatBot');
const vmController = require('./vmController');
const LiveStreamBridge = require('./liveStream');
const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173", "file://"], // Allow both web and Electron
    methods: ["GET", "POST"]
  }
});

// Start Live Stream WebSocket bridge
const liveStream = new LiveStreamBridge(6080);
liveStream.start();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.')); // Serve screenshots

// Basic route
app.get('/', (req, res) => {
  res.json({ message: 'VirtuOS Backend Server Running' });
});

// VM API routes
app.get('/api/vms', async (req, res) => {
  try {
    const vms = await vmController.listVMs();
    res.json({ success: true, vms });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/vm/:name/status', async (req, res) => {
  try {
    const status = await vmController.getVMStatus(req.params.name);
    res.json({ success: true, status });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/vm/:name/start', async (req, res) => {
  try {
    const result = await vmController.startVM(req.params.name);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/vm/:name/stop', async (req, res) => {
  try {
    const result = await vmController.stopVM(req.params.name);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/vm/:name/screenshot', async (req, res) => {
  try {
    const result = await vmController.getVMScreenshot(req.params.name);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Handle incoming chat messages from frontend
  socket.on('chat-message', async (data) => {
    try {
      const { message, conversationHistory, vmName } = data;
      
      console.log('Received message:', message);
      
      // Send user message back to frontend immediately
      socket.emit('chat-response', {
        role: 'user',
        content: message,
        timestamp: new Date().toISOString()
      });

      // Check if this is a task (only capture screenshot for tasks)
      const isTaskMessage = isTask(message);
      let screenshotBase64 = null;
      const targetVM = vmName || 'Arch Linux';
      
      // Only capture screenshot for tasks, not general chat
      if (isTaskMessage) {
        try {
          // Check if VM is running
          const status = await vmController.getVMStatus(targetVM);
          if (status.isRunning) {
            // Capture screenshot
            const screenshotResult = await vmController.getVMScreenshot(targetVM);
            if (screenshotResult.success) {
              const screenshotPath = path.join(__dirname, screenshotResult.path);
              
              if (fs.existsSync(screenshotPath)) {
                const imageBuffer = fs.readFileSync(screenshotPath);
                screenshotBase64 = imageBuffer.toString('base64');
                console.log('📸 Screenshot captured for task analysis');
                
                // Clean up screenshot file
                fs.unlinkSync(screenshotPath);
              }
            }
          }
        } catch (screenshotError) {
          console.log('Screenshot capture skipped:', screenshotError.message);
        }
      }

      // Get AI response from chatBot (with optional screenshot for tasks)
      const aiResponse = await getChatResponse(message, conversationHistory, screenshotBase64);
      
      // Send AI response to frontend (include screenshot for tasks)
      socket.emit('chat-response', {
        role: 'assistant',
        content: aiResponse.content,
        type: aiResponse.type,
        actions: aiResponse.actions,
        screenshot: isTaskMessage ? screenshotBase64 : null, // Attach screenshot to message
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Error processing message:', error);
      socket.emit('chat-error', {
        error: 'Failed to get response from AI',
        message: error.message
      });
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`VirtuOS Backend Server running on port ${PORT}`);
});
