/**
 * Email Service — unified interface for sending emails.
 * 
 * Production (Render): Uses Brevo HTTP API (port 443, not blocked).
 * Development (localhost): Uses Nodemailer + Gmail SMTP.
 * 
 * Switch is automatic based on the presence of BREVO_API_KEY env var.
 * To change providers later, just add a new transport function here.
 */

const nodemailer = require('nodemailer');
const dns = require('dns');
const { promisify } = require('util');

dns.setDefaultResultOrder('ipv4first');
const resolve4 = promisify(dns.resolve4);

// ---------------------------------------------------------------------------
// Brevo transport (production — HTTP API, works on Render)
// ---------------------------------------------------------------------------
const sendViaBrevo = async ({ to, from, subject, html, text }) => {
  let senderName = 'PawMira';

  // Extract name from the 'from' field if provided, but DO NOT override the verified email
  if (from) {
    const match = from.match(/(.*)<(.*)>/);
    if (match) {
      senderName = match[1].trim().replace(/['"]/g, '');
    }
  }

  // Strictly use the verified sender email configured in the environment
  const senderEmail = process.env.BREVO_FROM_EMAIL || process.env.EMAIL_USER;

  if (!senderEmail) {
    throw new Error('A verified sender email is required. Please set BREVO_FROM_EMAIL in your .env file.');
  }

  console.log(`[EMAIL] Sending via Brevo to ${to}`);

  const payload = {
    sender: {
      name: senderName,
      email: senderEmail
    },
    to: [
      { email: to }
    ],
    subject: subject
  };

  if (html) payload.htmlContent = html;
  if (text) payload.textContent = text;

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'api-key': process.env.BREVO_API_KEY,
      'content-type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(`Brevo API Error: ${response.status} ${response.statusText} ${errorData ? JSON.stringify(errorData) : ''}`);
  }

  const data = await response.json();
  console.log(`[EMAIL] Brevo success (id: ${data.messageId})`);
  return { messageId: data.messageId };
};

// ---------------------------------------------------------------------------
// Nodemailer transport (development — Gmail SMTP with IPv4 fix)
// ---------------------------------------------------------------------------
const sendViaNodemailer = async ({ to, from, subject, html, text }) => {
  let host = 'smtp.gmail.com';
  try {
    const addresses = await resolve4('smtp.gmail.com');
    if (addresses.length > 0) {
      host = addresses[0];
    }
  } catch (e) {
    // fallback to hostname
  }

  const transporter = nodemailer.createTransport({
    host,
    port: 465,
    secure: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    tls: { servername: 'smtp.gmail.com' },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 20000,
  });

  const fromAddress = from || `"PawMira" <${process.env.EMAIL_USER}>`;

  console.log(`[EMAIL] Sending via Nodemailer to ${to}`);

  const info = await transporter.sendMail({
    from: fromAddress,
    to,
    subject,
    html,
    text,
  });

  console.log(`[EMAIL] Nodemailer success (messageId: ${info.messageId})`);
  return { messageId: info.messageId };
};

// ---------------------------------------------------------------------------
// Public API — auto-selects transport based on environment
// ---------------------------------------------------------------------------

/**
 * Send an email.
 * @param {{ to: string, subject: string, html?: string, text?: string, from?: string }} options
 * @returns {Promise<{ messageId: string }>}
 */
const sendEmail = async (options) => {
  if (process.env.BREVO_API_KEY) {
    return sendViaBrevo(options);
  }
  return sendViaNodemailer(options);
};

/**
 * Returns which transport is active (for logging/debugging).
 */
const getTransportName = () => {
  return process.env.BREVO_API_KEY ? 'Brevo' : 'Nodemailer';
};

module.exports = { sendEmail, getTransportName };
