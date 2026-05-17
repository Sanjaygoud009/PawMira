const nodemailer = require('nodemailer');

// Create transporter using Gmail
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS, // Gmail App Password (not your regular password)
    },
  });
};

/**
 * POST /api/contact
 * Sends contact form message to pawmiraofficial@gmail.com
 */
const sendContactEmail = async (req, res) => {
  const { name, email, message } = req.body;

  // Validate fields
  if (!name || !email || !message) {
    return res.status(400).json({ message: 'All fields are required.' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: 'Invalid email address.' });
  }

  try {
    const transporter = createTransporter();

    // Email sent TO the PawMira team
    const mailOptions = {
      from: `"PawMira Contact Form" <${process.env.EMAIL_USER}>`,
      to: 'pawmiraofficial@gmail.com',
      replyTo: email,
      subject: `📬 New Contact Message from ${name}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9f9f9; border-radius: 12px; overflow: hidden;">
          <div style="background: linear-gradient(135deg, #FF6B35, #FF8C61); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">🐾 PawMira</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0; font-size: 14px;">New Contact Form Submission</p>
          </div>
          <div style="padding: 30px; background: white;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #eee;">
                  <strong style="color: #666; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">From</strong>
                  <p style="margin: 4px 0 0; color: #222; font-size: 16px;">${name}</p>
                </td>
              </tr>
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #eee;">
                  <strong style="color: #666; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Email</strong>
                  <p style="margin: 4px 0 0;"><a href="mailto:${email}" style="color: #FF6B35; text-decoration: none;">${email}</a></p>
                </td>
              </tr>
              <tr>
                <td style="padding: 10px 0;">
                  <strong style="color: #666; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Message</strong>
                  <p style="margin: 4px 0 0; color: #222; line-height: 1.6; white-space: pre-wrap;">${message}</p>
                </td>
              </tr>
            </table>
          </div>
          <div style="padding: 16px 30px; background: #f9f9f9; text-align: center; border-top: 1px solid #eee;">
            <p style="margin: 0; color: #999; font-size: 12px;">Reply directly to this email to respond to ${name}</p>
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);

    return res.status(200).json({ message: 'Message sent successfully!' });
  } catch (error) {
    console.error('[CONTACT_EMAIL_ERROR]', error.message);
    return res.status(500).json({ message: 'Failed to send message. Please try again later.' });
  }
};

module.exports = { sendContactEmail };
