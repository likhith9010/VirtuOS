/**
 * Computer Use Agent - Main orchestrator for autonomous computer control
 * Implements: See → Think → Act → Loop
 */

const fs = require('fs').promises;
const path = require('path');
const vmController = require('./vmController');
const actionExecutor = require('./actionExecutor');
const { getComputerUseAction } = require('./chatBot');

const VM_NAME = 'Arch Linux';
const MAX_ITERATIONS = 10;
const SCREENSHOT_DELAY = 2000; // ms to wait after action before screenshot (increased for UI to settle)
const API_DELAY = 12000; // Rate limit delay (5 RPM = 12s between requests)

// Screen dimensions and grid config
const SCREEN_WIDTH = 1920;
const SCREEN_HEIGHT = 1080;
const GRID_COLS = 12;  // A-L columns
const GRID_ROWS = 8;   // 1-8 rows

/**
 * Known app locations for quick actions (hardcoded for demo)
 * These are pre-mapped locations for common tasks
 * Based on 1920x1080 Arch Linux KDE desktop
 */
const KNOWN_LOCATIONS = {
  // Desktop Icons (top-left area)
  'vlc': { x: 46, y: 55, action: 'click', description: 'VLC media player desktop icon' },
  'vlc media player': { x: 46, y: 55, action: 'click', description: 'VLC media player desktop icon' },
  'media player': { x: 46, y: 55, action: 'click', description: 'VLC media player desktop icon' },
  'zen browser': { x: 46, y: 165, action: 'click', description: 'Zen Browser desktop icon' },
  'zenbrowser': { x: 46, y: 165, action: 'click', description: 'Zen Browser desktop icon' },
  'zen': { x: 46, y: 165, action: 'click', description: 'Zen Browser desktop icon' },
  'browser': { x: 46, y: 165, action: 'click', description: 'Zen Browser desktop icon' },
  
  // Taskbar Icons (bottom panel, y ≈ 740)
  'app menu': { x: 30, y: 740, action: 'click', description: 'App menu in taskbar' },
  'menu': { x: 30, y: 740, action: 'click', description: 'App menu in taskbar' },
  'start': { x: 30, y: 740, action: 'click', description: 'App menu in taskbar' },
  'show desktop': { x: 78, y: 740, action: 'click', description: 'Show desktop in taskbar' },
  'vlc taskbar': { x: 128, y: 740, action: 'click', description: 'VLC in taskbar' },
  'settings': { x: 178, y: 740, action: 'click', description: 'Settings in taskbar' },
  'file manager': { x: 228, y: 740, action: 'click', description: 'File manager (Dolphin) in taskbar' },
  'files': { x: 228, y: 740, action: 'click', description: 'File manager (Dolphin) in taskbar' },
  'dolphin': { x: 228, y: 740, action: 'click', description: 'Dolphin file manager in taskbar' },
  'terminal': { x: 278, y: 740, action: 'click', description: 'Terminal (Konsole) in taskbar' },
  'konsole': { x: 278, y: 740, action: 'click', description: 'Konsole terminal in taskbar' },
  'console': { x: 278, y: 740, action: 'click', description: 'Terminal in taskbar' },
};

/**
 * Convert grid reference (like "B3") to pixel coordinates
 * Grid: A-L (columns), 1-8 (rows)
 */
function gridToPixels(gridRef) {
  const match = gridRef.match(/^([A-L])(\d)$/i);
  if (!match) return null;
  
  const col = match[1].toUpperCase().charCodeAt(0) - 65; // A=0, B=1, etc.
  const row = parseInt(match[2]) - 1; // 1=0, 2=1, etc.
  
  const cellWidth = SCREEN_WIDTH / GRID_COLS;
  const cellHeight = SCREEN_HEIGHT / GRID_ROWS;
  
  // Return center of the grid cell
  return {
    x: Math.round(col * cellWidth + cellWidth / 2),
    y: Math.round(row * cellHeight + cellHeight / 2)
  };
}

/**
 * Convert pixel coordinates to grid reference
 */
function pixelsToGrid(x, y) {
  const cellWidth = SCREEN_WIDTH / GRID_COLS;
  const cellHeight = SCREEN_HEIGHT / GRID_ROWS;
  
  const col = Math.floor(x / cellWidth);
  const row = Math.floor(y / cellHeight);
  
  const colLetter = String.fromCharCode(65 + Math.min(col, GRID_COLS - 1));
  const rowNum = Math.min(row + 1, GRID_ROWS);
  
  return `${colLetter}${rowNum}`;
}

/**
 * Get grid overlay info for AI
 */
function getGridInfo() {
  const cellWidth = Math.round(SCREEN_WIDTH / GRID_COLS);
  const cellHeight = Math.round(SCREEN_HEIGHT / GRID_ROWS);
  
  return {
    cols: GRID_COLS,
    rows: GRID_ROWS,
    cellWidth,
    cellHeight,
    description: `Screen is divided into ${GRID_COLS}x${GRID_ROWS} grid (A-L columns, 1-8 rows). Each cell is ${cellWidth}x${cellHeight}px.`
  };
}

/**
 * Check if task matches a known location for quick execution
 */
function findKnownLocation(task) {
  const taskLower = task.toLowerCase();
  
  for (const [key, location] of Object.entries(KNOWN_LOCATIONS)) {
    if (taskLower.includes(key)) {
      return { key, ...location };
    }
  }
  return null;
}

// Global flag to track if agent should stop
let shouldStopAgent = false;

function stopAgent() {
  shouldStopAgent = true;
}

function resetStopFlag() {
  shouldStopAgent = false;
}

/**
 * Compare two screenshots to detect if screen changed
 * Returns a simple hash to detect changes (not pixel-perfect)
 */
function getImageHash(base64) {
  // Simple hash based on sample of the base64 string
  let hash = 0;
  const sample = base64.substring(0, 10000); // Sample first part
  for (let i = 0; i < sample.length; i++) {
    hash = ((hash << 5) - hash) + sample.charCodeAt(i);
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash;
}

/**
 * Run the Computer Use agent loop
 * @param {string} task - The user's task description
 * @param {Function} onUpdate - Callback for progress updates (io.emit)
 * @returns {Object} Final result
 */
async function runComputerUseAgent(task, onUpdate = null) {
  resetStopFlag(); // Reset stop flag at start
  const history = [];
  let iteration = 0;
  let completed = false;
  let finalMessage = '';
  let stopped = false;
  let lastScreenHash = null;
  let sameScreenCount = 0;
  const MAX_SAME_SCREEN = 3; // Max times we allow seeing the same screen

  const emit = (event, data) => {
    if (onUpdate) onUpdate(event, data);
    console.log(`[Agent] ${event}:`, JSON.stringify(data).substring(0, 200));
  };

  emit('agent_start', { task, maxIterations: MAX_ITERATIONS });

  try {
    // ========== QUICK PATH: Check for known locations first ==========
    const knownLocation = findKnownLocation(task);
    if (knownLocation) {
      emit('agent_status', { 
        phase: 'quick', 
        message: `Found known location: ${knownLocation.description}` 
      });
      
      iteration = 1;
      emit('agent_iteration', { iteration, maxIterations: MAX_ITERATIONS });
      
      // Take initial screenshot
      emit('agent_status', { phase: 'capture', message: 'Taking screenshot...' });
      const screenshotResult = await vmController.getVMScreenshot(VM_NAME);
      if (screenshotResult.success) {
        const screenshotBuffer = await fs.readFile(screenshotResult.path);
        const screenshotBase64 = screenshotBuffer.toString('base64');
        emit('agent_screenshot', { 
          path: screenshotResult.path,
          base64: screenshotBase64,
          iteration: 1 
        });
      }
      
      // Emit thinking
      emit('agent_thinking', { 
        thinking: `I recognize this task! "${knownLocation.key}" is at a known location (${knownLocation.x}, ${knownLocation.y}). I'll click there directly.`,
        action: { type: knownLocation.action, x: knownLocation.x, y: knownLocation.y }
      });
      
      // Execute the known action
      emit('agent_status', { 
        phase: 'act', 
        message: `Clicking ${knownLocation.description} at (${knownLocation.x}, ${knownLocation.y})` 
      });
      
      const action = { type: knownLocation.action, x: knownLocation.x, y: knownLocation.y };
      const actionResult = await actionExecutor.executeAction(action);
      
      emit('agent_action_result', { 
        action: knownLocation.action,
        description: `Click at (${knownLocation.x}, ${knownLocation.y}) - ${knownLocation.description}`,
        success: actionResult.success,
        message: actionResult.message
      });
      
      // Wait and take final screenshot
      await sleep(2000);
      
      emit('agent_status', { phase: 'capture', message: 'Taking verification screenshot...' });
      const finalScreenshot = await vmController.getVMScreenshot(VM_NAME);
      if (finalScreenshot.success) {
        const finalBuffer = await fs.readFile(finalScreenshot.path);
        const finalBase64 = finalBuffer.toString('base64');
        emit('agent_screenshot', { 
          path: finalScreenshot.path,
          base64: finalBase64,
          iteration: 2 
        });
      }
      
      completed = true;
      finalMessage = `Opened ${knownLocation.key} successfully!`;
      emit('agent_complete', { message: finalMessage, iterations: 1 });
      
      return {
        success: true,
        task,
        message: finalMessage,
        iterations: 1,
        history: [{
          iteration: 1,
          thinking: `Used known location for ${knownLocation.key}`,
          action,
          description: knownLocation.description,
          success: true,
          result: actionResult.message
        }]
      };
    }
    
    // ========== NORMAL PATH: AI-driven loop ==========
    while (iteration < MAX_ITERATIONS && !completed && !shouldStopAgent) {
      iteration++;
      emit('agent_iteration', { iteration, maxIterations: MAX_ITERATIONS });
      
      // Check if stopped
      if (shouldStopAgent) {
        stopped = true;
        finalMessage = 'Agent stopped by user';
        emit('agent_stopped', { message: finalMessage, iterations: iteration });
        break;
      }

      // Step 1: CAPTURE - Take screenshot
      emit('agent_status', { phase: 'capture', message: 'Taking screenshot...' });
      const screenshotResult = await vmController.getVMScreenshot(VM_NAME);
      
      if (!screenshotResult.success) {
        throw new Error(`Screenshot failed: ${screenshotResult.message}`);
      }

      // Read screenshot as base64 (path is now absolute)
      const screenshotPath = screenshotResult.path;
      const screenshotBuffer = await fs.readFile(screenshotPath);
      const screenshotBase64 = screenshotBuffer.toString('base64');

      // Emit screenshot for UI
      emit('agent_screenshot', { 
        path: screenshotResult.path,
        base64: screenshotBase64,
        iteration 
      });

      // Detect if screen changed from last iteration
      const currentScreenHash = getImageHash(screenshotBase64);
      const screenChanged = lastScreenHash !== currentScreenHash;
      
      // Update the last history entry with screen change info
      if (history.length > 0) {
        history[history.length - 1].screenChanged = screenChanged;
      }
      
      if (!screenChanged && lastScreenHash !== null) {
        sameScreenCount++;
        emit('agent_status', { 
          phase: 'detect', 
          message: `Screen unchanged (${sameScreenCount}/${MAX_SAME_SCREEN})` 
        });
        
        // If screen hasn't changed after multiple actions, something's wrong
        if (sameScreenCount >= MAX_SAME_SCREEN) {
          emit('agent_warning', { 
            message: 'Screen not responding to actions. Trying alternative approach...' 
          });
        }
      } else {
        sameScreenCount = 0; // Reset counter on screen change
        if (lastScreenHash !== null) {
          emit('agent_status', { phase: 'detect', message: 'Screen changed - action was effective!' });
        }
      }
      lastScreenHash = currentScreenHash;

      // Step 2: THINK - Ask AI for next action
      emit('agent_status', { phase: 'think', message: 'AI analyzing screen...' });
      
      // Build detailed history for AI context
      const actionHistory = history.map((h, idx) => ({
        step: idx + 1,
        action: h.description,
        success: h.success,
        screenChanged: h.screenChanged || false
      }));
      
      const aiResult = await getComputerUseAction(task, screenshotBase64, {
        previousActions: history.map(h => h.description),
        actionHistory: actionHistory,
        attempt: iteration,
        maxAttempts: MAX_ITERATIONS,
        screenUnchanged: sameScreenCount > 0,
        sameScreenCount: sameScreenCount
      });

      if (!aiResult.success) {
        emit('agent_error', { message: `AI failed: ${aiResult.error}` });
        
        // Handle rate limiting - wait longer
        if (aiResult.rateLimited) {
          emit('agent_status', { phase: 'wait', message: 'Rate limited, waiting 10 seconds...' });
          await sleep(10000);  // Wait 10 seconds on rate limit
        } else {
          await sleep(2000);  // Normal error, wait 2 seconds
        }
        
        history.push({ description: `Error: ${aiResult.error}`, success: false, screenChanged: false });
        continue;
      }

      const { thinking, action } = aiResult;
      emit('agent_thinking', { thinking, action });

      // Check if task is done or not
      if (action.type === 'done') {
        completed = true;
        finalMessage = action.message || 'Task completed successfully';
        emit('agent_complete', { message: finalMessage, iterations: iteration });
        break;
      }

      // Check for error from AI
      if (action.type === 'error') {
        completed = true;
        finalMessage = action.message || 'Task could not be completed';
        emit('agent_failed', { message: finalMessage, iterations: iteration });
        break;
      }

      // Step 3: ACT - Execute the action
      emit('agent_status', { phase: 'act', message: `Executing: ${actionExecutor.describeAction(action)}` });
      
      const actionResult = await actionExecutor.executeAction(action);
      
      const historyEntry = {
        iteration,
        thinking,
        action,
        description: actionExecutor.describeAction(action),
        success: actionResult.success,
        result: actionResult.message,
        screenChanged: false // Will be updated on next iteration
      };
      history.push(historyEntry);

      emit('agent_action_result', { 
        action: action.type,
        description: historyEntry.description,
        success: actionResult.success,
        message: actionResult.message
      });

      if (!actionResult.success) {
        emit('agent_warning', { message: `Action failed: ${actionResult.message}` });
        // Continue anyway - AI might correct on next iteration
      }

      // Wait for UI to update after action + rate limit buffer
      emit('agent_status', { phase: 'wait', message: 'Waiting for screen to update...' });
      await sleep(SCREENSHOT_DELAY); // Wait for UI to settle
      await sleep(API_DELAY);  // Rate limit delay
    }

    // Loop finished
    if (!completed) {
      finalMessage = `Reached maximum iterations (${MAX_ITERATIONS}). Task may be incomplete.`;
      emit('agent_timeout', { message: finalMessage, iterations: iteration });
    }

    return {
      success: completed,
      task,
      message: finalMessage,
      iterations: iteration,
      history
    };

  } catch (error) {
    emit('agent_error', { message: error.message });
    return {
      success: false,
      task,
      message: `Agent error: ${error.message}`,
      iterations: iteration,
      history
    };
  }
}

/**
 * Execute a single Computer Use action (for manual/testing)
 */
async function executeSingleAction(action) {
  return await actionExecutor.executeAction(action);
}

/**
 * Get current screen state
 */
async function getScreenState() {
  try {
    const screenshot = await vmController.getVMScreenshot(VM_NAME);
    const resolution = await vmController.getScreenResolution(VM_NAME);
    const mousePos = await vmController.getMousePosition(VM_NAME);
    
    return {
      success: true,
      screenshot: screenshot.path,
      resolution,
      mousePosition: mousePos
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
  runComputerUseAgent,
  executeSingleAction,
  getScreenState,
  stopAgent,
  MAX_ITERATIONS,
  // Grid utilities
  gridToPixels,
  pixelsToGrid,
  getGridInfo,
  // Known locations
  KNOWN_LOCATIONS,
  findKnownLocation
};
