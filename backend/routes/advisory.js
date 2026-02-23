// Backend Route: routes/advisory.js
// Compatible with v1beta API (older SDK versions)

const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// POST /api/advisory/chat
router.post('/chat', async (req, res) => {
  try {
    const { message, context, conversationHistory, productContext } = req.body;

    // Validate input
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Build context-aware system prompt
    const systemPrompt = buildSystemPrompt(context, productContext);

    // Use gemini-2.5-flash model
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
    });

    // Build the full prompt with context and history
    let fullPrompt = systemPrompt + "\n\n";
    
    // Add conversation history (skip initial greeting)
    if (conversationHistory && conversationHistory.length > 1) {
      for (let i = 1; i < conversationHistory.length; i++) {
        const msg = conversationHistory[i];
        if (msg.role === 'user') {
          fullPrompt += `User: ${msg.text}\n\n`;
        } else if (msg.role === 'assistant') {
          const responseText = msg.explanation 
            ? `ADVICE: ${msg.text}\n\nEXPLANATION: ${msg.explanation}`
            : msg.text;
          fullPrompt += `Assistant: ${responseText}\n\n`;
        }
      }
    }
    
    // Add current message
    fullPrompt += `User: ${message}\n\nAssistant:`;

    console.log('Sending request to Gemini API...');
    
    // Generate response
    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    const responseText = response.text();

    console.log('Received response from Gemini API');

    // Parse response to extract main text and explanation
    const { mainText, explanation } = parseAIResponse(responseText, context);

    res.json({
      success: true,
      response: mainText,
      explanation: explanation,
    });

  } catch (error) {
    console.error('Gemini API Error:', error);
    res.status(500).json({ 
      error: 'Failed to get AI response',
      details: error.message 
    });
  }
});

// Build context-aware system prompt
function buildSystemPrompt(context, productContext) {
  let prompt = `You are FarmWise AI Assistant, an expert agricultural advisor for farmers in India. You help with ALL farming-related questions and decision-making.

CAPABILITIES - You can help with:
- Crop selection, planting, and harvesting advice
- Pest and disease identification and treatment
- Fertilizer and soil management recommendations
- Weather-based farming decisions
- Market timing and selling strategies
- Equipment and tool recommendations
- Irrigation and water management
- Organic and sustainable farming practices
- Government schemes and subsidies for farmers
- Translation of advice to regional languages (Tamil, Hindi, Telugu, Kannada, Malayalam, etc.)
- Follow-up questions and clarifications
- Cost-benefit analysis for farming decisions

RESPONSE RULES:
1. ALWAYS respond to what the user ACTUALLY asked - do not repeat previous answers
2. If user asks for translation, translate your PREVIOUS response to the requested language
3. If user asks a follow-up question, answer that specific question
4. Keep responses concise (max 100 words for advice, 50 words for explanation)
5. DO NOT use markdown symbols (**, *, #, backticks) - write plain text only
6. Use numbered points for multiple tips
7. Be practical and actionable

LANGUAGE SUPPORT:
- You can respond in English, Tamil (தமிழ்), Hindi (हिंदी), Telugu (తెలుగు), Kannada (ಕನ್ನಡ), Malayalam (മലയാളം)
- When user asks "in Tamil" or "translate to Hindi" etc., provide the FULL response in that language
- Understand crop names in all these languages

RESPONSE FORMAT:
ADVICE: [Your recommendation - concise and actionable]

EXPLANATION: [Brief reason - 2-3 sentences max]

SPECIAL CASES:
- For translation requests: Provide the translated content directly without repeating English
- For yes/no questions: Give a direct answer first, then brief explanation
- For "what is" questions: Give a clear definition/answer
- For comparisons: Use a simple format to compare options

`;

  if (context && Object.values(context).some(val => val)) {
    prompt += `\nCurrent farmer context:\n`;
    
    if (context.crop) {
      prompt += `- Crop: ${context.crop}\n`;
    }
    if (context.stage) {
      prompt += `- Growth stage: ${context.stage}\n`;
    }
    if (context.location) {
      prompt += `- Location: ${context.location}\n`;
    }
    if (context.season) {
      prompt += `- Season/Conditions: ${context.season}\n`;
    }

    prompt += `\nIMPORTANT: Tailor your advice specifically to ${context.crop || 'the crop'} at ${context.stage || 'this stage'} in ${context.location || 'this location'} during ${context.season || 'current conditions'}. Reference these contextual factors in your EXPLANATION to show how they influenced your recommendation.\n`;
  }

  // Add product context if available
  if (productContext) {
    prompt += `\n--- PRODUCT INQUIRY ---\n`;
    prompt += `The farmer is asking about a specific product from the marketplace:\n`;
    
    if (typeof productContext === 'string') {
      prompt += `- Product: ${productContext}\n`;
    } else {
      if (productContext.name) prompt += `- Product Name: ${productContext.name}\n`;
      if (productContext.price) prompt += `- Price: ₹${productContext.price}\n`;
      if (productContext.category) prompt += `- Category: ${productContext.category}\n`;
      if (productContext.description) prompt += `- Description: ${productContext.description}\n`;
      if (productContext.seller) prompt += `- Seller: ${productContext.seller}\n`;
    }
    
    prompt += `\nProvide advice on:\n`;
    prompt += `1. Whether this product is suitable for their crop/situation\n`;
    prompt += `2. How to use this product effectively\n`;
    prompt += `3. Best timing and application methods\n`;
    prompt += `4. Any precautions or alternatives to consider\n`;
    prompt += `--- END PRODUCT INQUIRY ---\n`;
  }

  prompt += `\nFormat your response EXACTLY as:
ADVICE: [Your main recommendation here]

EXPLANATION: [Why this advice is appropriate given their crop, location, stage, and season. Mention specific contextual factors that influenced your recommendation.]`;

  return prompt;
}

// Parse AI response to extract advice and explanation
function parseAIResponse(responseText, context) {
  // Clean up any markdown symbols
  let cleanResponse = responseText
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/#{1,6}\s/g, '')
    .replace(/`/g, '')
    .trim();

  // Try to parse structured response
  const adviceMatch = cleanResponse.match(/ADVICE:\s*(.+?)(?=\n\nEXPLANATION:|EXPLANATION:|$)/s);
  const explanationMatch = cleanResponse.match(/EXPLANATION:\s*(.+)/s);

  let mainText, explanation;

  if (adviceMatch && explanationMatch) {
    mainText = adviceMatch[1].trim();
    explanation = explanationMatch[1].trim();
  } else if (adviceMatch) {
    // Has advice but no explanation
    mainText = adviceMatch[1].trim();
    explanation = generateFallbackExplanation(context);
  } else {
    // No structured format - likely a translation or direct answer
    // Check if it looks like a translation (contains non-English characters)
    const hasNonEnglish = /[\u0B80-\u0BFF\u0900-\u097F\u0C00-\u0C7F\u0D00-\u0D7F\u0C80-\u0CFF]/.test(cleanResponse);
    
    if (hasNonEnglish) {
      // It's a translation - use the whole response as the main text
      mainText = cleanResponse.replace(/^ADVICE:\s*/i, '').trim();
      explanation = 'இது உங்கள் கேள்விக்கான மொழிபெயர்ப்பு. / This is the translation of your query.';
    } else {
      // Fallback: split response or use as-is
      const parts = cleanResponse.split('\n\n');
      if (parts.length >= 2) {
        mainText = parts[0].replace(/^ADVICE:\s*/i, '').trim();
        explanation = parts.slice(1).join('\n\n').replace(/^EXPLANATION:\s*/i, '').trim();
      } else {
        mainText = cleanResponse;
        explanation = generateFallbackExplanation(context);
      }
    }
  }

  return { mainText, explanation };
}

// Generate fallback explanation based on context
function generateFallbackExplanation(context) {
  const factors = [];
  
  if (context.crop) factors.push(`your ${context.crop} crop`);
  if (context.stage) factors.push(`the ${context.stage} growth stage`);
  if (context.location) factors.push(`conditions in ${context.location}`);
  if (context.season) factors.push(`${context.season} season`);

  if (factors.length > 0) {
    return `This recommendation considers ${factors.join(', ')} to provide context-specific advice tailored to your field conditions.`;
  }

  return 'This advice is based on general agricultural best practices and your field observations.';
}

module.exports = router;