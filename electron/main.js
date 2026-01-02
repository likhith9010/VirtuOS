const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn, exec } = require('child_process');
const { promisify } = require('util');
const execPromise = promisify(exec);

let mainWindow;
let backendProcess;
let vboxProcess = null;

// Start backend server
function startBackend() {
  const isDev = !app.isPackaged;
  
  if (isDev) {
    // In development, assume backend is already running
    console.log('Development mode: Backend should be running separately');
    return;
  }

  // In production, start the backend server
  const backendPath = path.join(process.resourcesPath, 'BACKEND');
  backendProcess = spawn('node', ['server.js'], {
    cwd: backendPath,
    env: { ...process.env, PORT: 3000 }
  });

  backendProcess.stdout.on('data', (data) => {
    console.log(`Backend: ${data}`);
  });

  backendProcess.stderr.on('data', (data) => {
    console.error(`Backend Error: ${data}`);
  });

  backendProcess.on('close', (code) => {
    console.log(`Backend process exited with code ${code}`);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 600,
    frame: true,
    backgroundColor: '#ffffff',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true
    },
    icon: path.join(__dirname, '../FRONTEND/src/assets/image.png')
  });

  // Remove menu bar
  mainWindow.setMenuBarVisibility(false);

  const isDev = !app.isPackaged;

  if (isDev) {
    // Load from Vite dev server
    mainWindow.loadURL('http://localhost:5173');
    // Open DevTools in development
    mainWindow.webContents.openDevTools();
  } else {
    // Load built files
    mainWindow.loadFile(path.join(__dirname, '../FRONTEND/dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Handle window controls
  ipcMain.on('minimize-window', () => {
    if (mainWindow) mainWindow.minimize();
  });

  ipcMain.on('maximize-window', () => {
    if (mainWindow) {
      if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
      } else {
        mainWindow.maximize();
      }
    }
  });

  ipcMain.on('close-window', () => {
    if (mainWindow) mainWindow.close();
  });

  // Handle VM embedding - direct approach
  ipcMain.handle('embed-vm', async (event, vmName) => {
    try {
      console.log('Starting VM embedding for:', vmName);

      // Get parent window handle
      const parentHandle = mainWindow.getNativeWindowHandle();
      const parentHwnd = parentHandle.readInt32LE(0);
      console.log('Parent window handle:', parentHwnd);

      // Launch VirtualBox VM process
      const vboxPath = 'C:\\Program Files\\Oracle\\VirtualBox\\VirtualBoxVM.exe';
      vboxProcess = spawn(vboxPath, ['--startvm', vmName], {
        detached: false,
        stdio: 'ignore'
      });

      console.log('VirtualBox launched, waiting for window...');
      await new Promise(resolve => setTimeout(resolve, 6000));

      // PowerShell to find and reparent the VM window
      const psScript = `
        Add-Type @" 
          using System;
          using System.Runtime.InteropServices;
          using System.Text;
          
          public class WinAPI {
            public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
            [DllImport("user32.dll")] public static extern bool EnumWindows(EnumWindowsProc enumProc, IntPtr lParam);
            [DllImport("user32.dll", CharSet = CharSet.Auto)] public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);
            [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hWnd);
            [DllImport("user32.dll")] public static extern IntPtr SetParent(IntPtr hWndChild, IntPtr hWndNewParent);
            [DllImport("user32.dll")] public static extern int SetWindowLong(IntPtr hWnd, int nIndex, int dwNewLong);
            [DllImport("user32.dll")] public static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);
            public const int GWL_STYLE = -16;
            public const int WS_CHILD = 0x40000000;
            public const int WS_VISIBLE = 0x10000000;
            public const uint SWP_FRAMECHANGED = 0x0020;
            public const uint SWP_SHOWWINDOW = 0x0040;
          }
"@ 

        $vmName = "${vmName}"
        $parentHwnd = [IntPtr]${parentHwnd}
        $target = [IntPtr]::Zero

        $callback = {
          param($hwnd, $lParam)
          if ([WinAPI]::IsWindowVisible($hwnd)) {
            $sb = New-Object System.Text.StringBuilder 256
            [WinAPI]::GetWindowText($hwnd, $sb, 256) | Out-Null
            $title = $sb.ToString()
            # Match on VM name OR VirtualBox window class text
            if ($title -like "*$vmName*" -or $title -like "*Oracle VM VirtualBox*" -or $title -like "*VirtualBox*" -or $title -like "*VirtualBoxVM*") {
              $script:target = $hwnd
              return $false
            }
          }
          return $true
        }

        [WinAPI]::EnumWindows($callback, [IntPtr]::Zero) | Out-Null

        if ($script:target -ne [IntPtr]::Zero) {
          # Make it a child window and show it
          [WinAPI]::SetWindowLong($script:target, [WinAPI]::GWL_STYLE, ([WinAPI]::WS_CHILD -bor [WinAPI]::WS_VISIBLE)) | Out-Null
          [WinAPI]::SetParent($script:target, $parentHwnd) | Out-Null
          [WinAPI]::SetWindowPos($script:target, [IntPtr]::Zero, 0, 0, 1200, 800, ([WinAPI]::SWP_FRAMECHANGED -bor [WinAPI]::SWP_SHOWWINDOW)) | Out-Null
          Write-Output "success:$($script:target.ToInt64())"
        } else {
          Write-Output "error:Window not found"
        }
      `;

      const { stdout } = await execPromise(`powershell -ExecutionPolicy Bypass -Command "${psScript.replace(/"/g, '`"')}"`);
      console.log('PowerShell output:', stdout);

      if (stdout.includes('success:')) {
        const hwnd = stdout.split(':')[1].trim();
        return { success: true, hwnd };
      }

      return { success: false, error: stdout.includes('error:') ? stdout.split(':')[1] : 'Failed to embed window' };
    } catch (error) {
      console.error('Error embedding VM:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('resize-embedded-vm', async (event, width, height) => {
    // Window resizing handled by parent window resize
    return { success: true };
  });
}

// App lifecycle
app.whenReady().then(() => {
  startBackend();
  
  // Wait a bit for backend to start
  setTimeout(() => {
    createWindow();
  }, 2000);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  // Kill backend process when app quits
  if (backendProcess) {
    backendProcess.kill();
  }

  // Kill VirtualBox process if launched
  if (vboxProcess && !vboxProcess.killed) {
    vboxProcess.kill();
  }
});

// Handle any unhandled errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled Rejection:', error);
});
