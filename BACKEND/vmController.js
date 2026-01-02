const { exec } = require('child_process');
const util = require('util');
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
    const screenshotPath = `screenshots/screenshot_${Date.now()}.png`;
    await execPromise(`"${VBOX_MANAGE}" controlvm "${vmName}" screenshotpng ${screenshotPath}`);
    return { success: true, path: screenshotPath };
  } catch (error) {
    throw new Error(`Failed to capture screenshot`);
  }
}

module.exports = { listVMs, getVMStatus, startVM, stopVM, getVMScreenshot };
