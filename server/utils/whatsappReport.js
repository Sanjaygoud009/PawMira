exports.buildWhatsAppReportData = (session, phone) => ({
  reporter_name: 'WhatsApp User',
  reporter_phone: phone.replace('whatsapp:', ''),
  image_url: session.image_url,
  description: session.description,
  location: {
    type: 'Point',
    coordinates: [session.longitude, session.latitude],
  },
  issue_type: 'other',
  source: 'whatsapp',
  status: 'open',
  history: [{ status: 'open', updated_at: new Date() }],
});
