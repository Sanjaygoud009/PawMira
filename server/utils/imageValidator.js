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

const validateReportImageAnalysis = (analysis) => {
  if (
    !analysis ||
    typeof analysis.isValidLiveAnimal !== 'boolean' ||
    typeof analysis.isFakeOrExtinct !== 'boolean' ||
    typeof analysis.isHumanOnly !== 'boolean' ||
    typeof analysis.isUnclear !== 'boolean'
  ) {
    return {
      isAnimal: false,
      serviceError: true,
      reason: 'AI image verification is temporarily unavailable.',
    };
  }

  if (analysis.isUnclear) {
    return {
      isAnimal: false,
      reason: 'Please upload a clearer photo where the animal is visible.',
    };
  }

  if (analysis.isFakeOrExtinct) {
    return {
      isAnimal: false,
      reason: 'Please upload a photo of a real, living animal. Toys, statues, artwork, or extinct animals are not valid for rescue reports.',
    };
  }

  if (analysis.isHumanOnly) {
    return {
      isAnimal: false,
      reason: 'Please upload a photo showing the animal you are reporting. Photos containing only people cannot be used for an animal emergency report.',
    };
  }

  if (!analysis.isValidLiveAnimal) {
    return {
      isAnimal: false,
      reason: 'A real, living animal needing rescue was not detected in this image.',
    };
  }

  return { isAnimal: true, reason: 'Animal visible.' };
};

const cleanupRejectedImage = async (file, uploader) => {
  if (file?.filename && uploader?.destroy) {
    await uploader.destroy(file.filename).catch(() => {});
  }
};

/**
 * Validates an initial emergency image using Gemini. Reports require visual
 * evidence of an animal; portraits and unclear images are rejected.
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

    const prompt = `Analyze this emergency report image from visual evidence only.
Determine whether a real, currently living animal (e.g., dog, cat, bird, livestock) that could plausibly need rescue is visibly present.
The image MUST NOT be a dinosaur, extinct animal, fictional creature, toy, stuffed animal, figurine, statue, sculpture, drawing, painting, cartoon, illustration, or AI-generated artwork.
An animal-only photo is valid. A human and animal together is valid (provided the real animal is clearly visible). A human-only selfie/portrait is invalid. Buildings, roads, landscapes, and other non-animal images are invalid.
Answer ONLY this JSON object:
{
  "isValidLiveAnimal": boolean,
  "isFakeOrExtinct": boolean,
  "isHumanOnly": boolean,
  "isUnclear": boolean
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

    return validateReportImageAnalysis(JSON.parse(result.text));

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

const validateRescueProofAnalysis = (analysis) => {
  if (
    !analysis || 
    typeof analysis.isValidLiveAnimal !== 'boolean' || 
    typeof analysis.isFakeOrExtinct !== 'boolean' ||
    typeof analysis.isHumanOnly !== 'boolean' ||
    typeof analysis.isUnclear !== 'boolean' ||
    typeof analysis.isSameAnimal !== 'boolean'
  ) {
    return {
      isRescueProof: false,
      serviceError: true,
      reason: 'AI image verification is temporarily unavailable.',
    };
  }

  if (analysis.isUnclear) {
    return {
      isRescueProof: false,
      reason: 'Please upload a clearer photo where the rescued animal is visible.',
    };
  }

  if (analysis.isFakeOrExtinct) {
    return {
      isRescueProof: false,
      reason: 'Please upload a photo of a real, living animal. Toys, statues, artwork, or extinct animals cannot be used as rescue proof.',
    };
  }

  if (analysis.isHumanOnly) {
    return {
      isRescueProof: false,
      reason: 'Please upload a photo showing the rescued animal. A selfie alone cannot be used as rescue proof.',
    };
  }

  if (!analysis.isValidLiveAnimal) {
    return {
      isRescueProof: false,
      reason: 'A real, living animal was not detected in this image.',
    };
  }

  if (!analysis.isSameAnimal) {
    return {
      isRescueProof: false,
      reason: 'The animal in the proof photo does not appear to correspond to the animal in the original report.',
    };
  }

  return { isRescueProof: true, reason: analysis.reason || 'Rescue animal visible.' };
};

/**
 * Validates that resolution proof visibly contains an animal and is not a
 * responder-only portrait. A person alongside the animal remains acceptable.
 */
async function validateRescueProofImage(imageUrl, report = {}) {
  if (!process.env.GEMINI_API_KEY) {
    console.error('[GEMINI_ERROR] GEMINI_API_KEY is not configured.');
    return { isRescueProof: false, serviceError: true, reason: 'AI image verification is not configured.' };
  }

  try {
    const response = await fetch(getGeminiImageUrl(imageUrl));
    if (!response.ok) throw new Error(`Failed to fetch image from ${imageUrl}`);

    const buffer = Buffer.from(await response.arrayBuffer());
    const mimeType = response.headers.get('content-type') || 'image/jpeg';
    
    let originalImagePart = null;
    if (report && report.image_url) {
      try {
        const origResponse = await fetch(getGeminiImageUrl(report.image_url));
        if (origResponse.ok) {
          const origBuffer = Buffer.from(await origResponse.arrayBuffer());
          const origMimeType = origResponse.headers.get('content-type') || 'image/jpeg';
          originalImagePart = { inlineData: { data: origBuffer.toString('base64'), mimeType: origMimeType } };
        }
      } catch (err) {
        console.error('[GEMINI_ERROR] Failed to fetch original image for comparison:', err);
      }
    }

    const context = report ? [report.issue_type, report.description]
      .filter(Boolean)
      .join(': ')
      .slice(0, 500) : '';

    const prompt = `Analyze the submitted emergency rescue proof image(s). Visual evidence is required.
Image 1 (if provided) is the ORIGINAL emergency report image.
Image 2 (or Image 1 if no original provided) is the NEW rescue proof image.
Based on the NEW rescue proof image, determine:
1. Is a real, currently living animal visibly present? (Must not be a toy, statue, drawing, cartoon, AI art, dinosaur, or extinct animal).
2. Is the new image only a human selfie/portrait with no animal?
3. Is the new image too unclear to determine?
4. If an original image was provided, does the animal in the new proof image plausibly correspond to the animal in the original image? (Do not demand exact pixel-perfect identity matching, but use visual evidence to ensure it's plausibly the same animal. If you cannot reasonably determine they correspond, or they are clearly different animals (e.g. cat vs dog), return false for isSameAnimal). If no original image is provided, default to true.

Answer ONLY this JSON object:
{
  "isValidLiveAnimal": boolean,
  "isFakeOrExtinct": boolean,
  "isHumanOnly": boolean,
  "isUnclear": boolean,
  "isSameAnimal": boolean,
  "reason": "short visual explanation"
}`;

    const parts = [{ text: prompt }];
    if (originalImagePart) {
      parts.push(originalImagePart);
    }
    parts.push({ inlineData: { data: buffer.toString('base64'), mimeType } });

    const result = await ai.models.generateContent({
      model: 'gemini-3.5-flash-lite',
      contents: [{
        role: 'user',
        parts: parts,
      }],
      config: { responseMimeType: 'application/json' },
    });

    return validateRescueProofAnalysis(JSON.parse(result.text));
  } catch (error) {
    console.error('[GEMINI_ERROR] validateRescueProofImage:', {
      message: error.message,
      status: error.status,
      code: error.code,
    });
    return {
      isRescueProof: false,
      serviceError: true,
      reason: 'AI image verification is temporarily unavailable.',
    };
  }
}

module.exports = {
  cleanupRejectedImage,
  validateAnimalImage,
  validateReportImageAnalysis,
  validateRescueProofAnalysis,
  validateRescueProofImage,
};
