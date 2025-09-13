// Claude SDK for calling the LLM with an image and a prompt

// Assumes you have installed the Claude SDK: npm install @anthropic-ai/sdk

const { Anthropic } = require('@anthropic-ai/sdk');
const fs = require('fs');
const path = require('path');

// Initialize Claude client with your API key (set ANTHROPIC_API_KEY in env)
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Calls Claude LLM with an image and a prompt.
 * @param {string} imagePath - Path to the image file.
 * @param {string} prompt - The text prompt to send with the image.
 * @returns {Promise<string>} - The LLM's response.
 */
async function callClaudeWithImage(imagePath, prompt) {
  // Read image as base64
  const imageBuffer = fs.readFileSync(imagePath);
  const imageBase64 = imageBuffer.toString('base64');
  const ext = path.extname(imagePath).toLowerCase().replace('.', '');
  let mimeType = 'image/jpeg';
  if (ext === 'png') mimeType = 'image/png';
  else if (ext === 'webp') mimeType = 'image/webp';
  else if (ext === 'gif') mimeType = 'image/gif';

  // Prepare the message with image and prompt
  const messages = [
    {
      role: "user",
      content: [
        { type: "text", text: prompt },
        {
          type: "image",
          source: {
            type: "base64",
            media_type: mimeType,
            data: imageBase64,
          }
        }
      ]
    }
  ];

  // Call Claude's messages API
  const response = await anthropic.messages.create({
    model: "claude-3-5-sonnet-20241022", // or another Claude 3 model
    max_tokens: 1024,
    messages,
  });

  // Return the LLM's reply text
  return response.content[0]?.text || '';
}

//Example usage:
(async () => {
const result = await callClaudeWithImage('./uploads/glass-photo-2025-09-13T19-45-23-941Z-nicholasterek1@gmail.com.jpg', 'Describe this image.');
console.log(result);
})();

module.exports = { callClaudeWithImage };
