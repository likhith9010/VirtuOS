const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Using Google Gemini 2.0 Flash API (supports vision)
const API_KEY = process.env.GEMINI_API_KEY || 'your-api-key-here';
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${API_KEY}`;

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
  isTask
};
