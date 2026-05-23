const WhatsAppSession = require('../models/WhatsAppSession');
const Report = require('../models/Report');
const cloudinary = require('../config/cloudinary');
const twilio = require('twilio');

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// Send WhatsApp message via Twilio
const sendWhatsAppMessage = async (to, body) => {
  try {
    await client.messages.create({
      from: process.env.TWILIO_WHATSAPP_NUMBER,
      to,
      body,
    });
  } catch (error) {
    console.error(`[WHATSAPP_ERROR] sendMessage to ${to}: ${error.message}`);
  }
};

// Upload image from URL to Cloudinary
const uploadImageFromUrl = async (imageUrl) => {
  try {
    const result = await cloudinary.uploader.upload(imageUrl, {
      folder: 'pawmira-whatsapp',
      transformation: [{ width: 1920, height: 1920, crop: 'limit', quality: 'auto' }],
    });
    return result.secure_url;
  } catch (error) {
    console.error(`[WHATSAPP_ERROR] uploadImage: ${error.message}`);
    return null;
  }
};

// @desc    Handle incoming WhatsApp messages (Twilio webhook)
// @route   POST /api/whatsapp
exports.handleWhatsApp = async (req, res) => {
  try {
    const { From, Body, MediaUrl0, Latitude, Longitude, NumMedia } = req.body;
    const phone = From; // e.g., whatsapp:+919876543210

    // Look up or create session
    let session = await WhatsAppSession.findOne({ phone });

    if (!session) {
      session = await WhatsAppSession.create({ phone, current_step: 'awaiting_image' });
      await sendWhatsAppMessage(
        phone,
        '🐾 *Welcome to PawMira!*\n\nWe\'re here to help rescue dogs in need.\n\n📸 Please send a *photo* of the dog that needs help.'
      );
      return res.status(200).send('<Response></Response>');
    }

    // Handle "cancel" or "reset"
    if (Body && Body.toLowerCase().trim() === 'cancel') {
      await WhatsAppSession.deleteOne({ phone });
      await sendWhatsAppMessage(phone, '❌ Report cancelled. Send any message to start again.');
      return res.status(200).send('<Response></Response>');
    }

    // Step-based flow
    switch (session.current_step) {
      case 'awaiting_image': {
        if (parseInt(NumMedia) > 0 && MediaUrl0) {
          const imageUrl = await uploadImageFromUrl(MediaUrl0);
          if (imageUrl) {
            session.image_url = imageUrl;
            session.current_step = 'awaiting_location';
            session.updated_at = new Date();
            await session.save();
            await sendWhatsAppMessage(
              phone,
              '✅ Photo received!\n\n📍 Now please share the *location* of the dog.\n\n_Tap the + button → Location → Send your current location_'
            );
          } else {
            await sendWhatsAppMessage(phone, '❌ Could not process your image. Please try sending the photo again.');
          }
        } else {
          await sendWhatsAppMessage(phone, '📸 Please send a *photo* of the dog. You can use your camera or gallery.');
        }
        break;
      }

      case 'awaiting_location': {
        if (Latitude && Longitude) {
          session.latitude = parseFloat(Latitude);
          session.longitude = parseFloat(Longitude);
          session.current_step = 'awaiting_description';
          session.updated_at = new Date();
          await session.save();
          await sendWhatsAppMessage(
            phone,
            '✅ Location received!\n\n📝 Please describe the situation briefly.\n\n_Example: "Dog with injured leg near main road"_'
          );
        } else {
          await sendWhatsAppMessage(
            phone,
            '📍 Please share a *location pin*, not a text address.\n\n_Tap + → Location → Send your current location_'
          );
        }
        break;
      }

      case 'awaiting_description': {
        if (Body && Body.trim().length > 0) {
          session.description = Body.trim();
          session.current_step = 'confirming';
          session.updated_at = new Date();
          await session.save();
          await sendWhatsAppMessage(
            phone,
            `✅ Got it! Here's your report summary:\n\n📝 *Description:* ${session.description}\n📍 *Location:* ${session.latitude}, ${session.longitude}\n📸 *Photo:* Attached\n\nReply *YES* to submit or *CANCEL* to discard.`
          );
        } else {
          await sendWhatsAppMessage(phone, '📝 Please type a brief *description* of the situation.');
        }
        break;
      }

      case 'confirming': {
        if (Body && Body.toLowerCase().trim() === 'yes') {
          // Create the report
          const report = await Report.create({
            reporter_name: 'WhatsApp User',
            reporter_phone: phone.replace('whatsapp:', ''),
            image_url: session.image_url,
            description: session.description,
            location: {
              type: 'Point',
              coordinates: [session.longitude, session.latitude],
            },
            issue_type: 'other', // Default for WhatsApp reports
            source: 'whatsapp',
            history: [{ status: 'pending', updated_at: new Date() }],
          });

          // Clean up session
          await WhatsAppSession.deleteOne({ phone });

          console.log(`[WHATSAPP_SESSION_COMPLETED] phone=${phone} reportId=${report._id}`);

          await sendWhatsAppMessage(
            phone,
            `🎉 *Report submitted successfully!*\n\n🆔 Report ID: ${report._id}\n\nOur volunteers will respond as soon as possible. Thank you for caring! 🐾❤️`
          );
        } else if (Body && Body.toLowerCase().trim() === 'cancel') {
          await WhatsAppSession.deleteOne({ phone });
          await sendWhatsAppMessage(phone, '❌ Report cancelled. Send any message to start a new report.');
        } else {
          await sendWhatsAppMessage(phone, 'Please reply *YES* to submit your report or *CANCEL* to discard.');
        }
        break;
      }
    }

    res.status(200).send('<Response></Response>');
  } catch (error) {
    console.error(`[WHATSAPP_ERROR] handleWhatsApp: ${error.message}`);
    res.status(200).send('<Response></Response>');
  }
};
