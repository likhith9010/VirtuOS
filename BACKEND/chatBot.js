const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Using Google Gemini API (supports vision)
// gemini-2.5-flash works but has 5 RPM limit on free tier - wait between iterations
const API_KEY = process.env.GEMINI_API_KEY || 'your-api-key-here';
const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;

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
 */
async function getComputerUseAction(task, screenshotBase64, context = {}) {
  const { 
    previousActions = [], 
    actionHistory = [],
    attempt = 1, 
    maxAttempts = 10,
    screenUnchanged = false,
    sameScreenCount = 0
  } = context;
  
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
- DO NOT repeat the exact same action - it won't work!
- Consider: Is the element clickable? Is there a loading state? Try a different location.`;
  }

  const systemPrompt = `You are a Computer Use AI agent controlling a Linux desktop (Arch Linux with KDE). Analyze the screenshot and decide the NEXT ACTION.

SCREEN LAYOUT (1920x1080 pixels):
┌─────────────────────────────────────────────────────────────────┐
│ Desktop Area (0,0) to (1920,700)                                │
│  - Icons on LEFT edge: x=40-60, y starts at ~50                 │
│  - First icon: ~(46, 55), Second: ~(46, 165), spacing ~110px    │
├─────────────────────────────────────────────────────────────────┤
│ Browser/App Windows typically:                                   │
│  - URL bar: y ≈ 60-80 from window top                           │
│  - Search boxes: Look for white input fields                    │
│  - YouTube search: Around (600, 60) when YT is open             │
├─────────────────────────────────────────────────────────────────┤
│ TASKBAR (bottom): y = 740 (not 1080!)                           │
│  - App Menu: x≈30  | Show Desktop: x≈78  | VLC: x≈128           │
│  - Settings: x≈178 | Files: x≈228       | Terminal: x≈278      │
└─────────────────────────────────────────────────────────────────┘

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

COMMON UI ELEMENT LOCATIONS:
- YouTube logo (when open): ~(115, 60)
- YouTube search box: ~(640, 60) - click then type
- Google search box: ~(960, 500) on homepage
- Browser URL bar: ~(400-600, 65) depending on browser
- Window close (X): Top-right corner of window, ~(1890, 15)
- Window maximize: ~(1855, 15)

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
    const response = await axios.post(
      API_URL,
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
          temperature: 0.2,  // Even lower for consistent JSON
          maxOutputTokens: 300,
          topP: 0.8,
          responseMimeType: "application/json"  // Force JSON output
        }
      },
      {
        headers: { 'Content-Type': 'application/json' }
      }
    );

    const aiResponse = response.data.candidates[0].content.parts[0].text;
    console.log('🤖 AI Response:', aiResponse);

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
 * Get chat response from Google Gemini 2.0 Flash with Vision
 * @param {string} userMessage - The message from the user
 * @param {Array} conversationHistory - Previous conversation messages
 * @param {string} screenshotBase64 - Optional base64 encoded screenshot of VM screen
 * @returns {Promise<Object>} - AI response with type and optional actions
 */
async function getChatResponse(userMessage, conversationHistory = [], screenshotBase64 = null) {
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

    // Build the request parts (text + optional image)
    const parts = [{ text: systemPrompt }];
    
    // Add screenshot if provided
    if (screenshotBase64) {
      parts.push({
        inline_data: {
          mime_type: "image/png",
          data: screenshotBase64
        }
      });
      console.log('📸 Sending screenshot to Gemini for vision analysis');
    }

    // Make API call to Gemini
    const response = await axios.post(
      API_URL,
      {
        contents: [{
          parts: parts
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 500,
          topP: 0.95,
          topK: 40
        }
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    // Extract and return the AI response
    const aiResponse = response.data.candidates[0].content.parts[0].text;
    
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
