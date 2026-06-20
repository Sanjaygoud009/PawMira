require('dotenv').config();
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

async function runTest() {
  try {
    console.log("Sending email to:", process.env.EMAIL_USER);
    const info = await transporter.sendMail({
      from: `"PawMira Test" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER,
      subject: `🐾 Test Email from Server`,
      text: `If you see this, the email sending works.`,
    });
    console.log("Email sent successfully!");
    console.log("Message ID:", info.messageId);
    console.log("Response:", info.response);
  } catch (error) {
    console.error("Failed to send email:", error);
  }
}

runTest();
