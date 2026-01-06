const { exec } = require('child_process');
const util = require('util');
const path = require('path');
const fs = require('fs').promises;
const { Client } = require('ssh2');
const execPromise = util.promisify(exec);

// VBoxManage path for Windows
// sc
const VBOX_MANAGE = process.env.VBOX_PATH || 'C:\\Program Files\\Oracle\\VirtualBox\\VBoxManage.exe';

async function listVMs() {
  try {
    const { stdout } = await execPromise(`"${VBOX_MANAGE}" list vms`);
    const vms = [];
    const lines = stdout.trim().split('\n');
    
    for (const line of lines) {
      const match = line.match(/"(.+)"\s+\{(.+)\}/);
      if (match) {
        vms.push({ name: match[1], uuid: match[2] });
      }
    }
    return vms;
  } catch (error) {
    throw new Error('Failed to list VMs');
  }
}

async function getVMStatus(vmName) {
  try {
    const { stdout } = await execPromise(`"${VBOX_MANAGE}" showvminfo "${vmName}" --machinereadable`);
    const stateMatch = stdout.match(/VMState="(.+)"/);
    const state = stateMatch ? stateMatch[1] : 'unknown';
    
    // Get VRDE port
    const vrdePortMatch = stdout.match(/vrdeport="(.+)"/);
    const vrdePort = vrdePortMatch ? vrdePortMatch[1] : '5000';
    
    return {
      name: vmName,
      state: state,
      isRunning: state === 'running',
      vrdePort: vrdePort
    };
  } catch (error) {
    throw new Error(`Failed to get VM status`);
  }
}

async function startVM(vmName) {
  try {
    // Check if VM is already running
    const status = await getVMStatus(vmName);
    if (status.isRunning) {
      return { 
        success: true, 
        message: `VM "${vmName}" is already running`,
        vrdePort: 5000 
      };
    }

    // Enable VRDE (Remote Desktop) for optional remote access
    await execPromise(`"${VBOX_MANAGE}" modifyvm "${vmName}" --vrde on`);
    await execPromise(`"${VBOX_MANAGE}" modifyvm "${vmName}" --vrdeport 5000`);
    
    // Start VM with GUI so a window exists to embed
    await execPromise(`"${VBOX_MANAGE}" startvm "${vmName}" --type gui`);
    
    return { 
      success: true, 
      message: `VM "${vmName}" started successfully`,
      vrdePort: 5000 
    };
  } catch (error) {
    console.error('Start VM error:', error);
    throw new Error(`Failed to start VM: ${error.message}`);
  }
}

async function stopVM(vmName) {
  try {
    // Check if VM is running
    const status = await getVMStatus(vmName);
    if (!status.isRunning) {
      return { 
        success: true, 
        message: `VM "${vmName}" is already stopped` 
      };
    }

    // Try ACPI shutdown first (graceful)
    await execPromise(`"${VBOX_MANAGE}" controlvm "${vmName}" acpipowerbutton`);
    return { 
      success: true, 
      message: `Shutdown signal sent to "${vmName}"` 
    };
  } catch (error) {
    console.error('Stop VM error:', error);
    throw new Error(`Failed to stop VM: ${error.message}`);
  }
}

async function getVMScreenshot(vmName) {
  try {
    // Ensure screenshots directory exists
    const screenshotsDir = path.join(__dirname, 'screenshots');
    await fs.mkdir(screenshotsDir, { recursive: true }).catch(() => {});
    
    const screenshotPath = path.join(screenshotsDir, `screenshot_${Date.now()}.png`);
    await execPromise(`"${VBOX_MANAGE}" controlvm "${vmName}" screenshotpng "${screenshotPath}"`);
    return { success: true, path: screenshotPath };
  } catch (error) {
    console.error('Screenshot error:', error.message);
    throw new Error(`Failed to capture screenshot: ${error.message}`);
  }
}

// ==================== KEYBOARD CONTROL ====================

/**
 * Type a string of text in the VM
 * @param {string} vmName - VM name
 * @param {string} text - Text to type
 */
async function typeText(vmName, text) {
  try {
    // Escape special characters for command line
    const escapedText = text.replace(/"/g, '\\"');
    await execPromise(`"${VBOX_MANAGE}" controlvm "${vmName}" keyboardputstring "${escapedText}"`);
    return { success: true, message: `Typed: "${text}"` };
  } catch (error) {
    throw new Error(`Failed to type text: ${error.message}`);
  }
}

/**
 * Press a special key using scancode
 * Common scancodes:
 * - Enter: 1c 9c
 * - Escape: 01 81
 * - Tab: 0f 8f
 * - Backspace: 0e 8e
 * - Space: 39 b9
 * - Up: e0 48 e0 c8
 * - Down: e0 50 e0 d0
 * - Left: e0 4b e0 cb
 * - Right: e0 4d e0 cd
 */
async function pressKey(vmName, keyName) {
  const keyScancodes = {
    'enter': '1c 9c',
    'return': '1c 9c',
    'escape': '01 81',
    'esc': '01 81',
    'tab': '0f 8f',
    'backspace': '0e 8e',
    'space': '39 b9',
    'up': 'e0 48 e0 c8',
    'down': 'e0 50 e0 d0',
    'left': 'e0 4b e0 cb',
    'right': 'e0 4d e0 cd',
    'home': 'e0 47 e0 c7',
    'end': 'e0 4f e0 cf',
    'pageup': 'e0 49 e0 c9',
    'pagedown': 'e0 51 e0 d1',
    'delete': 'e0 53 e0 d3',
    'insert': 'e0 52 e0 d2',
    'f1': '3b bb',
    'f2': '3c bc',
    'f3': '3d bd',
    'f4': '3e be',
    'f5': '3f bf',
    'f6': '40 c0',
    'f7': '41 c1',
    'f8': '42 c2',
    'f9': '43 c3',
    'f10': '44 c4',
    'f11': '57 d7',
    'f12': '58 d8',
    // Modifier combos
    'ctrl+a': '1d 1e 9e 9d',  // Ctrl down, A down, A up, Ctrl up
    'ctrl+c': '1d 2e ae 9d',
    'ctrl+v': '1d 2f af 9d',
    'ctrl+x': '1d 2d ad 9d',
    'ctrl+z': '1d 2c ac 9d',
    'ctrl+s': '1d 1f 9f 9d',
    'ctrl+l': '1d 26 a6 9d',  // Focus URL bar in browsers
    'ctrl+t': '1d 14 94 9d',  // New tab
    'ctrl+w': '1d 11 91 9d',  // Close tab
    'alt+f4': '38 3e be b8',  // Close window
    'alt+tab': '38 0f 8f b8', // Switch window
    'super': 'e0 5b e0 db',   // Windows/Super key
    'win': 'e0 5b e0 db',
  };

  const scancode = keyScancodes[keyName.toLowerCase()];
  if (!scancode) {
    throw new Error(`Unknown key: ${keyName}`);
  }

  try {
    await execPromise(`"${VBOX_MANAGE}" controlvm "${vmName}" keyboardputscancode ${scancode}`);
    return { success: true, message: `Pressed: ${keyName}` };
  } catch (error) {
    throw new Error(`Failed to press key: ${error.message}`);
  }
}

/**
 * Press key combination (e.g., Ctrl+Shift+T)
 * @param {string} vmName - VM name
 * @param {string[]} modifiers - Array of modifiers ['ctrl', 'shift', 'alt']
 * @param {string} key - The main key
 */
async function pressKeyCombo(vmName, modifiers, key) {
  // Scancode mappings for modifiers (press and release)
  const modifierCodes = {
    'ctrl': { down: '1d', up: '9d' },
    'shift': { down: '2a', up: 'aa' },
    'alt': { down: '38', up: 'b8' },
    'super': { down: 'e0 5b', up: 'e0 db' },
    'win': { down: 'e0 5b', up: 'e0 db' }
  };

  // Basic key scancodes
  const keyCodes = {
    'a': { down: '1e', up: '9e' }, 'b': { down: '30', up: 'b0' },
    'c': { down: '2e', up: 'ae' }, 'd': { down: '20', up: 'a0' },
    'e': { down: '12', up: '92' }, 'f': { down: '21', up: 'a1' },
    'g': { down: '22', up: 'a2' }, 'h': { down: '23', up: 'a3' },
    'i': { down: '17', up: '97' }, 'j': { down: '24', up: 'a4' },
    'k': { down: '25', up: 'a5' }, 'l': { down: '26', up: 'a6' },
    'm': { down: '32', up: 'b2' }, 'n': { down: '31', up: 'b1' },
    'o': { down: '18', up: '98' }, 'p': { down: '19', up: '99' },
    'q': { down: '10', up: '90' }, 'r': { down: '13', up: '93' },
    's': { down: '1f', up: '9f' }, 't': { down: '14', up: '94' },
    'u': { down: '16', up: '96' }, 'v': { down: '2f', up: 'af' },
    'w': { down: '11', up: '91' }, 'x': { down: '2d', up: 'ad' },
    'y': { down: '15', up: '95' }, 'z': { down: '2c', up: 'ac' },
    '1': { down: '02', up: '82' }, '2': { down: '03', up: '83' },
    '3': { down: '04', up: '84' }, '4': { down: '05', up: '85' },
    '5': { down: '06', up: '86' }, '6': { down: '07', up: '87' },
    '7': { down: '08', up: '88' }, '8': { down: '09', up: '89' },
    '9': { down: '0a', up: '8a' }, '0': { down: '0b', up: '8b' },
    'enter': { down: '1c', up: '9c' },
    'space': { down: '39', up: 'b9' },
    'tab': { down: '0f', up: '8f' },
  };

  let scancodes = [];
  
  // Press modifiers
  for (const mod of modifiers) {
    const code = modifierCodes[mod.toLowerCase()];
    if (code) scancodes.push(code.down);
  }
  
  // Press main key
  const keyCode = keyCodes[key.toLowerCase()];
  if (keyCode) {
    scancodes.push(keyCode.down);
    scancodes.push(keyCode.up);
  }
  
  // Release modifiers (reverse order)
  for (const mod of modifiers.reverse()) {
    const code = modifierCodes[mod.toLowerCase()];
    if (code) scancodes.push(code.up);
  }

  try {
    await execPromise(`"${VBOX_MANAGE}" controlvm "${vmName}" keyboardputscancode ${scancodes.join(' ')}`);
    return { success: true, message: `Pressed: ${modifiers.join('+')}+${key}` };
  } catch (error) {
    throw new Error(`Failed to press key combo: ${error.message}`);
  }
}

// ==================== MOUSE CONTROL (via xdotool over SSH) ====================

// SSH connection pool for reuse
let sshConnection = null;
let sshConnecting = false;

/**
 * Get or create SSH connection using ssh2 package
 */
async function getSSHConnection() {
  const sshHost = process.env.VM_SSH_HOST || '127.0.0.1';
  const sshPort = parseInt(process.env.VM_SSH_PORT || '2222');
  const sshUser = process.env.VM_SSH_USER || 'liki';
  const sshPassword = process.env.VM_SSH_PASSWORD || '';  // Set in .env if using password auth
  
  // Return existing connection if valid
  if (sshConnection && sshConnection._sock && !sshConnection._sock.destroyed) {
    return sshConnection;
  }
  
  // Wait if another connection is in progress
  if (sshConnecting) {
    await new Promise(resolve => setTimeout(resolve, 500));
    return getSSHConnection();
  }
  
  sshConnecting = true;
  
  return new Promise((resolve, reject) => {
    const conn = new Client();
    
    conn.on('ready', () => {
      console.log('[SSH2] Connected to VM');
      sshConnection = conn;
      sshConnecting = false;
      resolve(conn);
    });
    
    conn.on('error', (err) => {
      console.error('[SSH2] Connection error:', err.message);
      sshConnecting = false;
      sshConnection = null;
      reject(err);
    });
    
    conn.on('close', () => {
      console.log('[SSH2] Connection closed');
      sshConnection = null;
    });
    
    const connectConfig = {
      host: sshHost,
      port: sshPort,
      username: sshUser,
      readyTimeout: 10000,
      keepaliveInterval: 5000,
    };
    
    // Try SSH key auth first, then password
    const homeDir = process.env.HOME || process.env.USERPROFILE;
    const privateKeyPath = path.join(homeDir, '.ssh', 'id_rsa');
    
    fs.readFile(privateKeyPath, 'utf8')
      .then(privateKey => {
        connectConfig.privateKey = privateKey;
        console.log('[SSH2] Using key authentication');
        conn.connect(connectConfig);
      })
      .catch(() => {
        // Fall back to password if key not available
        if (sshPassword) {
          connectConfig.password = sshPassword;
          console.log('[SSH2] Using password authentication');
        } else {
          // Try agent-based auth
          connectConfig.agent = process.env.SSH_AUTH_SOCK;
          console.log('[SSH2] Trying SSH agent authentication');
        }
        conn.connect(connectConfig);
      });
  });
}

/**
 * Execute command on VM via SSH using ssh2 package
 */
async function executeSSHCommand(command) {
  try {
    const conn = await getSSHConnection();
    
    return new Promise((resolve, reject) => {
      conn.exec(command, { env: { DISPLAY: ':0' } }, (err, stream) => {
        if (err) {
          reject(err);
          return;
        }
        
        let stdout = '';
        let stderr = '';
        
        stream.on('close', (code) => {
          if (code === 0 || code === null) {
            resolve({ success: true, output: stdout.trim() });
          } else {
            reject(new Error(stderr || `Command exited with code ${code}`));
          }
        });
        
        stream.on('data', (data) => {
          stdout += data.toString();
        });
        
        stream.stderr.on('data', (data) => {
          stderr += data.toString();
        });
      });
    });
  } catch (error) {
    console.error('[SSH2] Error:', error.message);
    throw new Error(`SSH command failed: ${error.message}`);
  }
}

/**
 * Execute xdotool command on VM via SSH
 */
async function executeXdotool(vmName, command) {
  console.log(`[SSH2] Executing: DISPLAY=:0 ${command}`);
  return await executeSSHCommand(`DISPLAY=:0 ${command}`);
}

/**
 * Move mouse to coordinates
 */
async function mouseMove(vmName, x, y) {
  try {
    await executeXdotool(vmName, `xdotool mousemove ${x} ${y}`);
    return { success: true, message: `Mouse moved to (${x}, ${y})` };
  } catch (error) {
    throw new Error(`Failed to move mouse: ${error.message}`);
  }
}

/**
 * Click at coordinates
 * @param {string} button - 1=left, 2=middle, 3=right
 */
async function mouseClick(vmName, x, y, button = 1) {
  try {
    await executeXdotool(vmName, `xdotool mousemove ${x} ${y} click ${button}`);
    return { success: true, message: `Clicked at (${x}, ${y}) with button ${button}` };
  } catch (error) {
    throw new Error(`Failed to click: ${error.message}`);
  }
}

/**
 * Double click at coordinates
 */
async function mouseDoubleClick(vmName, x, y) {
  try {
    // Move to position first, then double click with proper delay
    await executeXdotool(vmName, `xdotool mousemove ${x} ${y}`);
    await new Promise(resolve => setTimeout(resolve, 100)); // Small delay
    await executeXdotool(vmName, `xdotool click --repeat 2 --delay 100 1`);
    return { success: true, message: `Double-clicked at (${x}, ${y})` };
  } catch (error) {
    throw new Error(`Failed to double-click: ${error.message}`);
  }
}

/**
 * Drag from one point to another
 */
async function mouseDrag(vmName, startX, startY, endX, endY) {
  try {
    await executeXdotool(vmName, `xdotool mousemove ${startX} ${startY} mousedown 1 mousemove ${endX} ${endY} mouseup 1`);
    return { success: true, message: `Dragged from (${startX}, ${startY}) to (${endX}, ${endY})` };
  } catch (error) {
    throw new Error(`Failed to drag: ${error.message}`);
  }
}

/**
 * Scroll at position
 * @param {number} clicks - Positive = up, Negative = down
 */
async function mouseScroll(vmName, x, y, clicks) {
  try {
    const direction = clicks > 0 ? 4 : 5; // 4 = scroll up, 5 = scroll down
    const count = Math.abs(clicks);
    await executeXdotool(vmName, `xdotool mousemove ${x} ${y} click --repeat ${count} ${direction}`);
    return { success: true, message: `Scrolled ${clicks > 0 ? 'up' : 'down'} ${count} times at (${x}, ${y})` };
  } catch (error) {
    throw new Error(`Failed to scroll: ${error.message}`);
  }
}

/**
 * Get current mouse position
 */
async function getMousePosition(vmName) {
  try {
    const result = await executeXdotool(vmName, `xdotool getmouselocation`);
    const match = result.output.match(/x:(\d+)\s+y:(\d+)/);
    if (match) {
      return { success: true, x: parseInt(match[1]), y: parseInt(match[2]) };
    }
    throw new Error('Could not parse mouse position');
  } catch (error) {
    throw new Error(`Failed to get mouse position: ${error.message}`);
  }
}

/**
 * Get screen resolution
 */
async function getScreenResolution(vmName) {
  try {
    const result = await executeXdotool(vmName, `xdotool getdisplaygeometry`);
    const match = result.output.match(/(\d+)\s+(\d+)/);
    if (match) {
      return { success: true, width: parseInt(match[1]), height: parseInt(match[2]) };
    }
    throw new Error('Could not parse screen resolution');
  } catch (error) {
    throw new Error(`Failed to get screen resolution: ${error.message}`);
  }
}

module.exports = { 
  listVMs, 
  getVMStatus, 
  startVM, 
  stopVM, 
  getVMScreenshot,
  // Keyboard
  typeText,
  pressKey,
  pressKeyCombo,
  // Mouse
  mouseMove,
  mouseClick,
  mouseDoubleClick,
  mouseDrag,
  mouseScroll,
  getMousePosition,
  getScreenResolution,
  executeXdotool
};
