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
      model: 'gemini-2.0-flash',
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
      ],
      config: {
        responseMimeType: "application/json"
      }
    });

    const text = result.text;
    
    // Parse the JSON response
    try {
      const parsed = JSON.parse(text);
      return {
        isAnimal: parsed.isAnimal,
        reason: parsed.reason || "Analysis complete"
      };
    } catch (e) {
      console.error('[GEMINI] Failed to parse JSON response:', text);
      // Fallback: simple text match if JSON parse fails
      const textLower = text.toLowerCase();
      const isAnimal = textLower.includes('true') || (textLower.includes('"isanimal": true'));
      return { isAnimal, reason: 'Fallback text parsing: ' + text.substring(0, 50) };
    }

  } catch (error) {
    console.error(`[GEMINI_ERROR] validateAnimalImage:`, error);
    // TEMPORARY: Fail closed to debug why it's accepting everything.
    // This will send the exact error message to the frontend.
    return { isAnimal: false, reason: `SYSTEM ERROR: ${error.message}` };
  }
}

module.exports = { validateAnimalImage };
