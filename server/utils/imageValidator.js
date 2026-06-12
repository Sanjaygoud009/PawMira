const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

/**
 * Validates if an image contains an animal using Gemini 3.1
 * @param {string} imageUrl - The URL of the image uploaded to Cloudinary
 * @returns {Promise<{ isAnimal: boolean, reason?: string }>}
 */
async function validateAnimalImage(imageUrl) {
  // If no API key is provided, bypass validation (useful for local dev before setup)
  if (!process.env.GEMINI_API_KEY) {
    console.warn('[GEMINI] No GEMINI_API_KEY found, skipping image validation.');
    return { isAnimal: true };
  }

  try {
    // We pass the URL. The model can process public image URLs.
    // However, @google/genai requires we fetch the image to base64 if it's a URL in this method,
    // or we can just ask Gemini to analyze the URL if it supports it.
    // Wait, let's fetch the image and send it as inlineData.
    
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image from ${imageUrl}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const mimeType = response.headers.get('content-type') || 'image/jpeg';
    const base64Data = buffer.toString('base64');

    const prompt = `Analyze this image carefully. 
Is there an animal in this image? 
Answer with ONLY a JSON object containing two fields:
{
  "isAnimal": boolean,
  "reason": "short explanation of what you see"
}`;

    const result = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            {
              inlineData: {
                data: base64Data,
                mimeType: mimeType
              }
            }
          ]
        }
      ]
    });

    const text = result.text;
    
    // Parse the JSON response
    try {
      // Find the JSON block if it's wrapped in markdown
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : text;
      const parsed = JSON.parse(jsonStr);
      
      return {
        isAnimal: parsed.isAnimal,
        reason: parsed.reason
      };
    } catch (e) {
      console.error('[GEMINI] Failed to parse JSON response:', text);
      // Fallback: simple text match
      const isAnimal = text.toLowerCase().includes('true') || !text.toLowerCase().includes('false');
      return { isAnimal, reason: 'Fallback text parsing' };
    }

  } catch (error) {
    console.error(`[GEMINI_ERROR] validateAnimalImage: ${error.message}`);
    // Fail open if Gemini is down, don't block legitimate rescues
    return { isAnimal: true, reason: 'Error communicating with validation service' };
  }
}

module.exports = { validateAnimalImage };
