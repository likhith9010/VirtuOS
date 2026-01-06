/**
 * Action Executor - Executes AI-generated actions on the VM
 * Handles: click, type, key_press, scroll, drag, wait, screenshots
 */

const vmController = require('./vmController');

const VM_NAME = 'Arch Linux';

/**
 * Execute a single action 
 * @param {Object} action - Action object from AI
 * @returns {Object} Result of the action
 */
async function executeAction(action) {
  const { type } = action;
  
  try {
    switch (type) {
      case 'click':
        return await executeClick(action);
      
      case 'double_click':
        return await executeDoubleClick(action);
      
      case 'right_click':
        return await executeRightClick(action);
      
      case 'type':
        return await executeType(action);
      
      case 'key_press':
      case 'key':
        return await executeKeyPress(action);
      
      case 'scroll':
        return await executeScroll(action);
      
      case 'drag':
        return await executeDrag(action);
      
      case 'move':
        return await executeMove(action);
      
      case 'wait':
        return await executeWait(action);
      
      case 'screenshot':
        return await executeScreenshot();
      
      case 'done':
        return { success: true, done: true, message: action.message || 'Task completed' };
      
      case 'error':
        return { success: false, error: true, message: action.message || 'AI reported an error' };
      
      default:
        return { success: false, message: `Unknown action type: ${type}` };
    }
  } catch (error) {
    console.error(`[ActionExecutor] Error executing ${type}:`, error.message);
    return { success: false, message: `${type} failed: ${error.message}` };
  }
}

/**
 * Execute a sequence of actions
 * @param {Array} actions - Array of action objects
 * @param {Function} onProgress - Callback for progress updates
 * @returns {Object} Final result
 */
async function executeActions(actions, onProgress = null) {
  const results = [];
  
  for (let i = 0; i < actions.length; i++) {
    const action = actions[i];
    
    if (onProgress) {
      onProgress({
        current: i + 1,
        total: actions.length,
        action: action.type,
        description: describeAction(action)
      });
    }
    
    const result = await executeAction(action);
    results.push({ action, result });
    
    // Stop if action failed or is 'done'
    if (!result.success || result.done) {
      break;
    }
    
    // Small delay between actions for stability
    await sleep(100);
  }
  
  return {
    success: results.every(r => r.result.success),
    results,
    summary: results.map(r => r.result.message).join('\n')
  };
}

// ==================== Action Implementations ====================

async function executeClick(action) {
  const { x, y, button = 'left' } = action;
  const buttonCode = button === 'right' ? 3 : button === 'middle' ? 2 : 1;
  return await vmController.mouseClick(VM_NAME, x, y, buttonCode);
}

async function executeDoubleClick(action) {
  const { x, y } = action;
  return await vmController.mouseDoubleClick(VM_NAME, x, y);
}

async function executeRightClick(action) {
  const { x, y } = action;
  return await vmController.mouseClick(VM_NAME, x, y, 3);
}

async function executeType(action) {
  const { text } = action;
  if (!text) {
    return { success: false, message: 'No text provided for typing' };
  }
  return await vmController.typeText(VM_NAME, text);
}

async function executeKeyPress(action) {
  const { key, modifiers } = action;
  
  if (!key) {
    return { success: false, message: 'No key provided' };
  }
  
  // If modifiers are provided, use combo
  if (modifiers && modifiers.length > 0) {
    return await vmController.pressKeyCombo(VM_NAME, modifiers, key);
  }
  
  // Check if key contains + (like ctrl+c)
  if (key.includes('+')) {
    return await vmController.pressKey(VM_NAME, key);
  }
  
  return await vmController.pressKey(VM_NAME, key);
}

async function executeScroll(action) {
  const { x, y, direction = 'down', amount = 3 } = action;
  const clicks = direction === 'up' ? amount : -amount;
  return await vmController.mouseScroll(VM_NAME, x || 0, y || 0, clicks);
}

async function executeDrag(action) {
  const { startX, startY, endX, endY } = action;
  return await vmController.mouseDrag(VM_NAME, startX, startY, endX, endY);
}

async function executeMove(action) {
  const { x, y } = action;
  return await vmController.mouseMove(VM_NAME, x, y);
}

async function executeWait(action) {
  const { duration = 1000 } = action;
  await sleep(duration);
  return { success: true, message: `Waited ${duration}ms` };
}

async function executeScreenshot() {
  return await vmController.getVMScreenshot(VM_NAME);
}

// ==================== Helper Functions ====================

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Generate human-readable description of an action
 */
function describeAction(action) {
  switch (action.type) {
    case 'click':
      return `Click at (${action.x}, ${action.y})`;
    case 'double_click':
      return `Double-click at (${action.x}, ${action.y})`;
    case 'right_click':
      return `Right-click at (${action.x}, ${action.y})`;
    case 'type':
      return `Type: "${action.text?.substring(0, 30)}${action.text?.length > 30 ? '...' : ''}"`;
    case 'key_press':
    case 'key':
      return `Press key: ${action.modifiers ? action.modifiers.join('+') + '+' : ''}${action.key}`;
    case 'scroll':
      return `Scroll ${action.direction || 'down'} at (${action.x}, ${action.y})`;
    case 'drag':
      return `Drag from (${action.startX}, ${action.startY}) to (${action.endX}, ${action.endY})`;
    case 'move':
      return `Move mouse to (${action.x}, ${action.y})`;
    case 'wait':
      return `Wait ${action.duration || 1000}ms`;
    case 'screenshot':
      return `Take screenshot`;
    case 'done':
      return `Task completed: ${action.message || ''}`;
    case 'error':
      return `Error: ${action.message || 'Unknown error'}`;
    default:
      return `Unknown action: ${action.type}`;
  }
}

/**
 * Validate action format
 */
function validateAction(action) {
  if (!action || typeof action !== 'object') {
    return { valid: false, error: 'Action must be an object' };
  }
  
  if (!action.type) {
    return { valid: false, error: 'Action must have a type' };
  }
  
  // Type-specific validation
  switch (action.type) {
    case 'click':
    case 'double_click':
    case 'right_click':
    case 'move':
      if (typeof action.x !== 'number' || typeof action.y !== 'number') {
        return { valid: false, error: `${action.type} requires x and y coordinates` };
      }
      break;
    
    case 'type':
      if (typeof action.text !== 'string') {
        return { valid: false, error: 'type action requires text string' };
      }
      break;
    
    case 'key_press':
    case 'key':
      if (!action.key) {
        return { valid: false, error: 'key_press action requires key' };
      }
      break;
    
    case 'drag':
      if (typeof action.startX !== 'number' || typeof action.startY !== 'number' ||
          typeof action.endX !== 'number' || typeof action.endY !== 'number') {
        return { valid: false, error: 'drag requires startX, startY, endX, endY' };
      }
      break;
  }
  
  return { valid: true };
}

module.exports = {
  executeAction,
  executeActions,
  describeAction,
  validateAction,
  VM_NAME
};
