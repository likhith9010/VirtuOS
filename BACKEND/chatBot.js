const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Using Google Gemini API (supports vision) - Default configuration
// These are used if no settings are passed from frontend
const DEFAULT_API_KEY = process.env.GEMINI_API_KEY || 'your-api-key-here';
const DEFAULT_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const DEFAULT_PROVIDER = 'google';

// API URL builders for different providers
function getApiConfig(aiSettings) {
  const provider = aiSettings?.provider || DEFAULT_PROVIDER;
  const model = aiSettings?.model || DEFAULT_MODEL;
  const apiKey = aiSettings?.apiKey || DEFAULT_API_KEY;
  
  switch (provider) {
    case 'google':
      return {
        provider,
        model,
        apiKey,
        url: `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
      };
    case 'openai':
      return {
        provider,
        model,
        apiKey,
        url: 'https://api.openai.com/v1/chat/completions'
      };
    case 'anthropic':
      return {
        provider,
        model,
        apiKey,
        url: 'https://api.anthropic.com/v1/messages'
      };
    case 'xai':
      return {
        provider,
        model,
        apiKey,
        url: 'https://api.x.ai/v1/chat/completions'
      };
    default:
      return {
        provider: 'google',
        model: DEFAULT_MODEL,
        apiKey: DEFAULT_API_KEY,
        url: `https://generativelanguage.googleapis.com/v1beta/models/${DEFAULT_MODEL}:generateContent?key=${DEFAULT_API_KEY}`
      };
  }
}

/**
 * Detect if message is a task (action command) vs question
 */
function isTask(message) {
  const taskKeywords = ['open', 'play', 'search', 'find', 'create', 'make', 'start', 'run', 'execute', 'launch', 'click', 'type', 'browse', 'go to', 'navigate'];
  const lowerMessage = message.toLowerCase();
  return taskKeywords.some(keyword => lowerMessage.includes(keyword));
}

// Export isTask for use in server.js
module.exports.isTask = isTask;

/**
 * COMPUTER USE: Get next action(s) from AI based on screen state
 * Returns structured JSON actions that can be executed on the VM
 * @param {Object} aiSettings - Optional AI provider settings { provider, model, apiKey }
 */
async function getComputerUseAction(task, screenshotBase64, context = {}, aiSettings = null) {
  const { 
    previousActions = [], 
    actionHistory = [],
    attempt = 1, 
    maxAttempts = 10,
    screenUnchanged = false,
    sameScreenCount = 0
  } = context;
  
  // Get API configuration based on settings
  const apiConfig = getApiConfig(aiSettings);
  
  // Build action history string with success/failure info
  let historyStr = 'None';
  if (actionHistory.length > 0) {
    historyStr = actionHistory.map(h => 
      `Step ${h.step}: ${h.action} [${h.success ? '✓' : '✗'}]${h.screenChanged ? ' (screen changed)' : ''}`
    ).join('\n');
  }
  
  // Add warning if screen hasn't changed
  let screenWarning = '';
  if (screenUnchanged && sameScreenCount > 0) {
    screenWarning = `
⚠️ WARNING: The screen has NOT changed after ${sameScreenCount} action(s). This means:
- The previous click/action may have missed the target
- You should try a DIFFERENT coordinate or approach
- After a failed click look at mouse position and UI to decide next click example: if the mouse is near the slightly left and little down from the target, adujst your next click coordinates to be slightly right and up.
- DO NOT repeat the exact same action - it won't work!
- Consider: Is the element clickable? Is there a loading state? Try a different location.`;
  }

  const systemPrompt = `You are a Computer Use AI agent controlling a Linux desktop (Arch Linux with KDE). Analyze the screenshot and decide the NEXT ACTION.

SCREEN LAYOUT & COMMON LOCATIONS (1280x800):
┌───────────────────────────────────────────────────────────────────────┐
│ DESKTOP AREA (0,0) to (1280, 750)                                     │
│  - Left Icon Column (Center x ≈ 46):                                  │
│    • First Icon: (46, 55)                                             │
│    • Second Icon: (46, 165)  (Vertical spacing ≈ 110px)               │
│                                                                       │
│ BROWSER / MAXIMIZED APP WINDOWS (0,0) to (1280, 750)                  │
│  - Top Bar Area (y ≈ 0-70):                                           │
│    • Window Controls (Right edge): Close(1255,12), Maximize(1225,12)  │
│    • URL/Address Bar: (400, 52)                                       │
│    • YouTube Search Box: (640, 52) (Centered horizontally at top)     │
│  - Main Content Area:                                                 │
│    • Google Search Box: (640, 370) (Centered in middle of page)       │
├───────────────────────────────────────────────────────────────────────┤
│ TASKBAR (Bottom band, y from 750 to 800)                              │
│  - App Icons (Left to Right, Center y ≈ 775):                         │
│    • App Menu: (26, 775)    | • Desktop: (68, 775) | • VLC: (112, 775)│
│    • Settings: (156, 775)   | • Files: (200, 775)  | • Term: (244, 775) │
│  - System Tray & Clock (Right side): (Start x ≈ 1150, y ≈ 775)        │
└───────────────────────────────────────────────────────────────────────┘

SCREEN GRID REFERENCE (4x4 division for spatial context & initial clicks):
(Coordinates given are the CENTER of each sector)
┌───────────────────┬───────────────────┬───────────────────┬───────────────────┐
│ Sector 1,1 (TL)   │ Sector 2,1 (TC-L) │ Sector 3,1 (TC-R) │ Sector 4,1 (TR)   │
│ Center: (160, 100)│ Center: (480, 100)│ Center: (800, 100)│ Center: (1120, 100)│
├───────────────────┼───────────────────┼───────────────────┼───────────────────┤
│ Sector 1,2 (MTL)  │ Sector 2,2 (MTC-L)│ Sector 3,2 (MTC-R)│ Sector 4,2 (MTR)  │
│ Center: (160, 300)│ Center: (480, 300)│ Center: (800, 300)│ Center: (1120, 300)│
├───────────────────┼───────────────────┼───────────────────┼───────────────────┤
│ Sector 1,3 (MBL)  │ Sector 2,3 (MBC-L)│ Sector 3,3 (MBC-R)│ Sector 4,3 (MBR)  │
│ Center: (160, 500)│ Center: (480, 500)│ Center: (800, 500)│ Center: (1120, 500)│
├───────────────────┼───────────────────┼───────────────────┼───────────────────┤
│ Sector 1,4 (BL)   │ Sector 2,4 (BC-L) │ Sector 3,4 (BC-R) │ Sector 4,4 (BR)   │
│ Center: (160, 700)│ Center: (480, 700)│ Center: (800, 700)│ Center: (1120, 700)│
└───────────────────┴───────────────────┴───────────────────┴───────────────────┘
TL=Top-Left, TC=Top-Center, TR=Top-Right, M=Mid, B=Bottom, L=Left, R=Right

RESPOND WITH ONLY THIS JSON FORMAT (nothing else):
{"thinking": "I see [describe UI elements]. I will click [target] at approximately (x, y)", "action": {"type": "click", "x": 100, "y": 200}}

ACTION TYPES:
- click: {"type": "click", "x": <int>, "y": <int>}
- double_click: {"type": "double_click", "x": <int>, "y": <int>}
- type: {"type": "type", "text": "text to type"}
- key: {"type": "key", "key": "enter"} (enter, escape, tab, backspace, ctrl+c, ctrl+v, ctrl+t, alt+f4, super)
- scroll: {"type": "scroll", "x": <int>, "y": <int>, "direction": "down", "amount": 3}
- wait: {"type": "wait", "duration": 2000}
- done: {"type": "done", "message": "Task completed because..."}
- error: {"type": "error", "message": "Cannot complete because..."}

COMMON UI ELEMENT LOCATIONS (1280x800):
- YouTube logo (when open): ~(100, 52)
- YouTube search box: ~(640, 52) - click then type, CENTERED horizontally
- Google search box: ~(640, 370) - center of page
- Browser URL bar: ~(400, 52) 
- Window close (X): ~(1255, 12)
- Window maximize: ~(1225, 12)

IMPORTANT RULES:
1. ONE action per response
2. Click CENTER of UI elements - be precise with coordinates
3. After typing in a field, use key:enter to submit
4. Desktop icons: Use SINGLE CLICK (not double-click) on modern desktops
5. Taskbar/panel apps need single click
6. If you see the app is already open (window visible), use "done"
7. NEVER repeat the same action with same coordinates if it didn't work
8. Look carefully at what changed on screen since last action
${screenWarning}

PREVIOUS ACTIONS:
${historyStr}

ATTEMPT: ${attempt}/${maxAttempts}
TASK: ${task}

Analyze the current screenshot and provide the next action. If the task appears complete (e.g., app window is open), use "done".
OUTPUT ONLY VALID JSON:`;

  try {
    let aiResponse;
    
    // Make API call based on provider
    if (apiConfig.provider === 'google') {
      const response = await axios.post(
        apiConfig.url,
        {
          contents: [{
            parts: [
              { text: systemPrompt },
              {
                inline_data: {
                  mime_type: "image/png",
                  data: screenshotBase64
                }
              }
            ]
          }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 300,
            topP: 0.8,
            responseMimeType: "application/json"
          }
        },
        { headers: { 'Content-Type': 'application/json' } }
      );
      aiResponse = response.data.candidates[0].content.parts[0].text;
      
    } else if (apiConfig.provider === 'openai') {
      const response = await axios.post(
        apiConfig.url,
        {
          model: apiConfig.model,
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: systemPrompt },
                { type: 'image_url', image_url: { url: `data:image/png;base64,${screenshotBase64}` } }
              ]
            }
          ],
          max_tokens: 300,
          temperature: 0.2,
          response_format: { type: 'json_object' }
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiConfig.apiKey}`
          }
        }
      );
      aiResponse = response.data.choices[0].message.content;
      
    } else if (apiConfig.provider === 'anthropic') {
      const response = await axios.post(
        apiConfig.url,
        {
          model: apiConfig.model,
          max_tokens: 300,
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: systemPrompt },
                { type: 'image', source: { type: 'base64', media_type: 'image/png', data: screenshotBase64 } }
              ]
            }
          ]
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiConfig.apiKey,
            'anthropic-version': '2023-06-01'
          }
        }
      );
      aiResponse = response.data.content[0].text;
      
    } else if (apiConfig.provider === 'xai') {
      const response = await axios.post(
        apiConfig.url,
        {
          model: apiConfig.model,
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: systemPrompt },
                { type: 'image_url', image_url: { url: `data:image/png;base64,${screenshotBase64}` } }
              ]
            }
          ],
          max_tokens: 300,
          temperature: 0.2
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiConfig.apiKey}`
          }
        }
      );
      aiResponse = response.data.choices[0].message.content;
      
    } else {
      throw new Error(`Unsupported provider: ${apiConfig.provider}`);
    }
    
    console.log(`🤖 [${apiConfig.provider}/${apiConfig.model}] Response:`, aiResponse);

    // Parse JSON from response
    let jsonStr = aiResponse.trim();
    
    // Remove markdown code blocks if present
    if (jsonStr.includes('```')) {
      const match = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (match) jsonStr = match[1].trim();
    }
    
    // Try to extract JSON object if there's extra text
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
    }
    
    const parsed = JSON.parse(jsonStr);

    return {
      success: true,
      thinking: parsed.thinking || '',
      action: parsed.action
    };

  } catch (error) {
    console.error('Computer Use API error:', error.response?.data || error.message);
    
    // Handle rate limiting
    if (error.response?.status === 429) {
      return {
        success: false,
        error: 'Rate limited - please wait a moment',
        rateLimited: true
      };
    }
    
    // Try to extract partial response for JSON errors
    if (error instanceof SyntaxError) {
      return {
        success: false,
        error: 'Failed to parse AI response as JSON',
        raw: error.message
      };
    }
    
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Extract action steps from task
 */
function generateActionSteps(message) {
  const lowerMessage = message.toLowerCase();
  const steps = [];
  
  // Basic step generation logic - can be enhanced with AI
  if (lowerMessage.includes('open') && lowerMessage.includes('youtube')) {
    steps.push('Opening YouTube');
  }
  if (lowerMessage.includes('play') || lowerMessage.includes('search')) {
    const searchMatch = message.match(/play\s+['"]?([^'"]+)['"]?|search\s+for\s+['"]?([^'"]+)['"]?/i);
    if (searchMatch) {
      const query = searchMatch[1] || searchMatch[2];
      steps.push(`Searching for '${query}'`);
      steps.push('Playing video');
    }
  }
  if (lowerMessage.includes('find')) {
    steps.push('Searching the web');
    steps.push('Analyzing results');
  }
  if (lowerMessage.includes('create') || lowerMessage.includes('make')) {
    steps.push('Creating document');
    steps.push('Setting up content');
  }
  
  return steps;
}

/**
 * Get chat response from AI with Vision
 * @param {string} userMessage - The message from the user
 * @param {Array} conversationHistory - Previous conversation messages
 * @param {string} screenshotBase64 - Optional base64 encoded screenshot of VM screen
 * @param {Object} aiSettings - Optional AI provider settings { provider, model, apiKey }
 * @returns {Promise<Object>} - AI response with type and optional actions
 */
async function getChatResponse(userMessage, conversationHistory = [], screenshotBase64 = null, aiSettings = null) {
  // Get API configuration based on settings
  const apiConfig = getApiConfig(aiSettings);
  
  try {
    // Build conversation context from history
    let conversationContext = '';
    if (conversationHistory.length > 0) {
      conversationContext = conversationHistory
        .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
        .join('\n') + '\n';
    }

    // Detect if this is a task
    const isTaskMessage = isTask(userMessage);
    
    // System prompt with vision capabilities
    const systemPrompt = `You are VirtuOS, an advanced AI assistant that helps users control their computer through natural language. You can SEE the user's screen through screenshots.

You can help with various tasks including:
- Opening applications and files
- Web browsing and research  
- File management and organization
- System automation
- General computer tasks

${screenshotBase64 ? 'I have provided you with a screenshot of the current screen. Use this visual information to understand the current state and provide better assistance.' : ''}

${isTaskMessage ? 'The user is asking you to perform an action. Respond as if you are doing it, using phrases like "I\'ll..." or "I\'m...". Describe what you see on screen if relevant.' : ''}

Be helpful, concise, and friendly. When explaining computer actions, be clear and specific. If you can see the screen, reference what you observe.

${conversationContext}User: ${userMessage}
Assistant:`;

    let aiResponse;
    
    // Make API call based on provider
    if (apiConfig.provider === 'google') {
      // Build the request parts (text + optional image)
      const parts = [{ text: systemPrompt }];
      if (screenshotBase64) {
        parts.push({
          inline_data: {
            mime_type: "image/png",
            data: screenshotBase64
          }
        });
      }
      
      const response = await axios.post(
        apiConfig.url,
        {
          contents: [{ parts }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 500,
            topP: 0.95,
            topK: 40
          }
        },
        { headers: { 'Content-Type': 'application/json' } }
      );
      aiResponse = response.data.candidates[0].content.parts[0].text;
      
    } else if (apiConfig.provider === 'openai') {
      const content = [{ type: 'text', text: systemPrompt }];
      if (screenshotBase64) {
        content.push({ type: 'image_url', image_url: { url: `data:image/png;base64,${screenshotBase64}` } });
      }
      
      const response = await axios.post(
        apiConfig.url,
        {
          model: apiConfig.model,
          messages: [{ role: 'user', content }],
          max_tokens: 500,
          temperature: 0.7
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiConfig.apiKey}`
          }
        }
      );
      aiResponse = response.data.choices[0].message.content;
      
    } else if (apiConfig.provider === 'anthropic') {
      const content = [{ type: 'text', text: systemPrompt }];
      if (screenshotBase64) {
        content.push({ type: 'image', source: { type: 'base64', media_type: 'image/png', data: screenshotBase64 } });
      }
      
      const response = await axios.post(
        apiConfig.url,
        {
          model: apiConfig.model,
          max_tokens: 500,
          messages: [{ role: 'user', content }]
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiConfig.apiKey,
            'anthropic-version': '2023-06-01'
          }
        }
      );
      aiResponse = response.data.content[0].text;
      
    } else if (apiConfig.provider === 'xai') {
      const content = [{ type: 'text', text: systemPrompt }];
      if (screenshotBase64) {
        content.push({ type: 'image_url', image_url: { url: `data:image/png;base64,${screenshotBase64}` } });
      }
      
      const response = await axios.post(
        apiConfig.url,
        {
          model: apiConfig.model,
          messages: [{ role: 'user', content }],
          max_tokens: 500,
          temperature: 0.7
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiConfig.apiKey}`
          }
        }
      );
      aiResponse = response.data.choices[0].message.content;
      
    } else {
      throw new Error(`Unsupported provider: ${apiConfig.provider}`);
    }
    
    console.log(`📨 [${apiConfig.provider}/${apiConfig.model}] Chat response received`);
    
    // Return structured response
    if (isTaskMessage) {
      return {
        type: 'task',
        content: aiResponse,
        actions: generateActionSteps(userMessage)
      };
    } else {
      return {
        type: 'message',
        content: aiResponse
      };
    }

  } catch (error) {
    console.error('Error calling Gemini API:', error.response?.data || error.message);
    
    // Return fallback response if API fails
    let errorMessage = 'I apologize, but I encountered an error processing your request. Please try again.';
    if (error.response?.status === 400) {
      errorMessage = 'API request failed. Please check your API key configuration.';
    } else if (error.response?.status === 429) {
      errorMessage = 'Rate limit exceeded. Please try again in a moment.';
    }
    
    return {
      type: 'message',
      content: errorMessage
    };
  }
}

module.exports = {
  getChatResponse,
  getComputerUseAction,
  isTask
};
