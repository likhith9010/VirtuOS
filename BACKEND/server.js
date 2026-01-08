require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const multer = require('multer');
const { getChatResponse, isTask } = require('./chatBot');
const vmController = require('./vmController');
const LiveStreamBridge = require('./liveStream');
const computerUseAgent = require('./computerUseAgent');
const actionExecutor = require('./actionExecutor');
const fs = require('fs');
const fsp = require('fs').promises;
const path = require('path');

// Setup multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const isImage = file.mimetype.startsWith('image/');
    const folder = isImage ? 'images' : 'pdfs';
    const dir = path.join(__dirname, folder);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}_${file.originalname}`;
    cb(null, uniqueName);
  }
});
const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    const isImage = file.mimetype.startsWith('image/');
    const isPdf = file.mimetype === 'application/pdf';
    if (isImage || isPdf) {
      cb(null, true);
    } else {
      cb(new Error('Only images and PDFs are allowed'));
    }
  }
});

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
    // Convert absolute path to relative path for frontend
    const relativePath = path.relative(__dirname, result.path).replace(/\\/g, '/');
    res.json({ success: true, path: relativePath });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// File upload endpoint for images and PDFs
app.post('/api/upload', upload.array('files', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, error: 'No files uploaded' });
    }
    
    const uploadedFiles = req.files.map(file => ({
      filename: file.filename,
      originalName: file.originalname,
      type: file.mimetype.startsWith('image/') ? 'image' : 'pdf',
      path: file.path,
      size: file.size
    }));
    
    console.log('📁 Files uploaded:', uploadedFiles.map(f => f.originalName).join(', '));
    
    // Auto-cleanup for images and pdfs folders
    await cleanupFolder(path.join(__dirname, 'images'), 100, 50);
    await cleanupFolder(path.join(__dirname, 'pdfs'), 20, 10);
    
    res.json({ success: true, files: uploadedFiles });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Auto-cleanup function: delete oldest files when threshold reached
async function cleanupFolder(folderPath, threshold, deleteCount) {
  try {
    const files = await fsp.readdir(folderPath);
    
    if (files.length >= threshold) {
      console.log(`📁 ${path.basename(folderPath)} folder has ${files.length} files. Cleaning up oldest ${deleteCount}...`);
      
      // Get file stats and sort by creation time (oldest first)
      const fileStats = await Promise.all(
        files.map(async (file) => {
          const filePath = path.join(folderPath, file);
          const stat = await fsp.stat(filePath);
          return { file, filePath, mtime: stat.mtime.getTime() };
        })
      );
      
      fileStats.sort((a, b) => a.mtime - b.mtime);
      
      // Delete oldest files
      const filesToDelete = fileStats.slice(0, deleteCount);
      for (const { file, filePath } of filesToDelete) {
        await fsp.unlink(filePath);
        console.log(`🗑️ Deleted old file: ${file}`);
      }
      
      console.log(`✅ Cleaned up ${deleteCount} files from ${path.basename(folderPath)}`);
    }
  } catch (error) {
    console.error(`Cleanup error for ${folderPath}:`, error.message);
  }
}

// Get list of uploaded files
app.get('/api/files', async (req, res) => {
  try {
    const imagesDir = path.join(__dirname, 'images');
    const pdfsDir = path.join(__dirname, 'pdfs');
    
    // Ensure directories exist
    await fsp.mkdir(imagesDir, { recursive: true }).catch(() => {});
    await fsp.mkdir(pdfsDir, { recursive: true }).catch(() => {});
    
    const images = await fsp.readdir(imagesDir).catch(() => []);
    const pdfs = await fsp.readdir(pdfsDir).catch(() => []);
    
    res.json({
      success: true,
      images: images.map(f => ({ name: f, path: `images/${f}` })),
      pdfs: pdfs.map(f => ({ name: f, path: `pdfs/${f}` }))
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete a file
app.delete('/api/files/:type/:filename', async (req, res) => {
  try {
    const { type, filename } = req.params;
    const folder = type === 'image' ? 'images' : 'pdfs';
    const filePath = path.join(__dirname, folder, filename);
    await fsp.unlink(filePath);
    res.json({ success: true });
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
      const { message, conversationHistory, vmName, aiSettings, attachments } = data;
      
      console.log('Received message:', message);
      if (aiSettings) console.log('Using AI:', aiSettings.provider, aiSettings.model);
      if (attachments?.length) console.log('📎 Attachments:', attachments.length, '(images:', attachments.filter(a => a.type === 'image').length, ', PDFs:', attachments.filter(a => a.type === 'pdf').length, ')');
      
      // Send user message back to frontend immediately (with ALL attachments for display)
      socket.emit('chat-response', {
        role: 'user',
        content: message,
        attachments: attachments || [],
        timestamp: new Date().toISOString()
      });

      // Check if this is a task (only capture screenshot for tasks)
      const isTaskMessage = isTask(message);
      let screenshotBase64 = null;
      const targetVM = vmName || 'Arch Linux';
      
      // Load attached images as base64 for AI context
      // Load attached IMAGES as base64 for AI context (skip PDFs - for RAG later)
      let attachedImageBase64 = [];
      const imageAttachments = attachments?.filter(a => a.type === 'image') || [];
      if (imageAttachments.length > 0) {
        for (const img of imageAttachments) {
          try {
            const imgPath = path.join(__dirname, img.path);
            if (fs.existsSync(imgPath)) {
              const imgBuffer = fs.readFileSync(imgPath);
              attachedImageBase64.push({
                name: img.name,
                base64: imgBuffer.toString('base64')
              });
            }
          } catch (e) {
            console.error('Error loading attached image:', e.message);
          }
        }
        console.log('📷 Loaded', attachedImageBase64.length, 'images for AI context');
      }
      
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

      // Get AI response from chatBot (with optional screenshot for tasks, or attached images)
      const imageForAI = attachedImageBase64.length > 0 ? attachedImageBase64[0].base64 : screenshotBase64;
      const aiResponse = await getChatResponse(message, conversationHistory, imageForAI, aiSettings);
      
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

  // Handle Computer Use request - starts autonomous agent loop
  socket.on('computer-use', async (data) => {
    try {
      const { task, vmName, aiSettings } = data;
      const targetVM = vmName || 'Arch Linux';
      
      console.log('🖥️ Starting Computer Use for task:', task);
      if (aiSettings) console.log('Using AI:', aiSettings.provider, aiSettings.model);
      
      // Check VM status first
      const status = await vmController.getVMStatus(targetVM);
      if (!status.isRunning) {
        socket.emit('computer-use-error', {
          error: 'VM not running',
          message: 'Please start the VM first'
        });
        return;
      }
      
      // Run the computer use agent with real-time updates
      const result = await computerUseAgent.runComputerUseAgent(task, (event, eventData) => {
        socket.emit(event, eventData);
      }, aiSettings);
      
      // Send final result
      socket.emit('computer-use-complete', result);
      
    } catch (error) {
      console.error('Computer Use error:', error);
      socket.emit('computer-use-error', {
        error: 'Computer Use failed',
        message: error.message
      });
    }
  });

  // Handle single action execution (for testing/manual control)
  socket.on('execute-action', async (data) => {
    try {
      const { action } = data;
      console.log('⚡ Executing action:', action);
      
      const result = await actionExecutor.executeAction(action);
      socket.emit('action-result', result);
      
    } catch (error) {
      console.emit('action-error', { error: error.message });
    }
  });

  // Handle stop agent request
  socket.on('stop-agent', () => {
    console.log('🛑 Stop agent requested');
    computerUseAgent.stopAgent();
    socket.emit('agent_stopped', { message: 'Agent stopped by user' });
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
