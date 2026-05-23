const https = require('https');

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';

function callOpenAI(question, apiKey) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      model: 'gpt-4.1-mini',

      messages: [
        {
          role: 'system',
          content: `
You are PawMira AI Assistant.

You help users with:
- Pet care
- Animal rescue
- Dog and cat health
- Emergency guidance
- Adoption and volunteering
- General questions

Always answer naturally and helpfully.
          `,
        },

        {
          role: 'user',
          content: question,
        },
      ],

      max_tokens: 400,
      temperature: 0.7,
    });

    const url = new URL(OPENAI_URL);

    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',

      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        Authorization: `Bearer ${apiKey}`,
      },
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);

          console.log(parsed);

          const content =
            parsed.choices &&
            parsed.choices[0] &&
            parsed.choices[0].message &&
            parsed.choices[0].message.content;

          resolve(content || null);
        } catch (err) {
          reject(err);
        }
      });
    });

    req.on('error', (err) => reject(err));

    req.write(payload);
    req.end();
  });
}

exports.chat = async (req, res) => {
  try {
    const { question } = req.body;

    if (!question) {
      return res.status(400).json({
        message: 'Missing question',
      });
    }

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        message: 'OpenAI API key missing',
      });
    }

    const answer = await callOpenAI(question, apiKey);

    if (!answer) {
      return res.status(500).json({
        message: 'No response from OpenAI',
      });
    }

    return res.json({
      answer,
    });
  } catch (error) {
    console.error('[CHAT_ERROR]', error);

    return res.status(500).json({
      message: 'Chat service error',
    });
  }
};