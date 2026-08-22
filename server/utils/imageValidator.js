const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const getGeminiImageUrl = (imageUrl) => {
  if (!imageUrl.includes('res.cloudinary.com') || !imageUrl.includes('/upload/')) {
    return imageUrl;
  }

  // Delivery-only transformation: preserves the original Cloudinary asset
  // while reducing the image transferred to Render and Gemini.
  return imageUrl.replace('/upload/', '/upload/w_600,c_limit,q_auto,f_auto/');
};

/**
 * Validates if an image contains an animal using Gemini.
 * @param {string} imageUrl - The URL of the image uploaded to Cloudinary
 * @returns {Promise<{ isAnimal: boolean, reason?: string, serviceError?: boolean }>}
 */
async function validateAnimalImage(imageUrl) {
  if (!process.env.GEMINI_API_KEY) {
    console.error('[GEMINI_ERROR] GEMINI_API_KEY is not configured.');
    return {
      isAnimal: false,
      serviceError: true,
      reason: 'AI image verification is not configured.'
    };
  }

  try {
    const response = await fetch(getGeminiImageUrl(imageUrl));
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
      model: 'gemini-3.5-flash-lite',
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
    console.error('[GEMINI_ERROR] validateAnimalImage:', {
      message: error.message,
      status: error.status,
      code: error.code
    });
    return {
      isAnimal: false,
      serviceError: true,
      reason: 'AI image verification is temporarily unavailable.'
    };
  }
}

module.exports = { validateAnimalImage };
