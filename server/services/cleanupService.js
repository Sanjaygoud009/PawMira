const cron = require('node-cron');
const cloudinary = require('../config/cloudinary');
const Report = require('../models/Report');
const LostPet = require('../models/LostPet');
const FoundPet = require('../models/FoundPet');
const User = require('../models/User');
const CleanupLog = require('../models/CleanupLog');

// Helper to extract Cloudinary public_id from a stored asset URL.
// Works for every upload folder (pawmira-reports, pawmira-whatsapp, etc.)
// because it parses the actual URL structure rather than hardcoding a folder prefix.
// Cloudinary URL format:
//   https://res.cloudinary.com/<cloud>/image/upload/v<version>/<folder>/<filename>.<ext>
const extractPublicId = (url) => {
  if (!url || typeof url !== 'string') return null;
  try {
    const pathname = new URL(url).pathname; // e.g. /<cloud>/image/upload/v1234/pawmira-reports/abc123.jpg
    const uploadIndex = pathname.indexOf('/upload/');
    if (uploadIndex === -1) return null;
    let assetPath = pathname.slice(uploadIndex + '/upload/'.length);
    assetPath = assetPath.replace(/^v\d+\//, ''); // strip the version segment (e.g. v1234/)
    return assetPath.replace(/\.[^/.]+$/, '');    // strip the file extension
  } catch (err) {
    return null;
  }
};

// Helper to delete from Cloudinary and log
const deleteAssetAndLog = async (doc, collectionName, reason, imageUrlField) => {
  const imageUrl = doc[imageUrlField];
  let assetId = null;

  if (imageUrl) {
    assetId = extractPublicId(imageUrl);
    if (assetId) {
      try {
        await cloudinary.uploader.destroy(assetId);
      } catch (err) {
        console.error(`Failed to delete Cloudinary asset ${assetId}:`, err);
      }
    }
  }

  // Create cleanup log
  await CleanupLog.create({
    reason,
    asset_id: assetId,
    report_id: doc._id,
    collection_name: collectionName
  });
};

const runCleanup = async () => {
  console.log('Running daily cleanup service...');
  const now = new Date();

  try {
    // 1. Delete Unresolved Spam/Abandoned Emergencies older than 15 days
    const fifteenDaysAgo = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000);
    const oldUnresolvedReports = await Report.find({
      status: { $ne: 'safe' },
      is_archived: false,
      created_at: { $lte: fifteenDaysAgo }
    });

    for (const report of oldUnresolvedReports) {
      await deleteAssetAndLog(report, 'Report', '15_day_unresolved', 'image_url');
      await Report.findByIdAndDelete(report._id);
    }
    console.log(`Cleaned up ${oldUnresolvedReports.length} unresolved reports.`);

    // 2. Delete Resolved Emergencies without resolution images older than 30 days
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const oldResolvedReports = await Report.find({
      status: 'safe',
      is_archived: false,
      created_at: { $lte: thirtyDaysAgo }
    });

    for (const report of oldResolvedReports) {
      await deleteAssetAndLog(report, 'Report', '30_day_resolved', 'image_url');
      // If there's a resolution image, delete it too
      if (report.resolution_image_url) {
        const resAssetId = extractPublicId(report.resolution_image_url);
        if (resAssetId) await cloudinary.uploader.destroy(resAssetId);
      }
      await Report.findByIdAndDelete(report._id);
    }
    console.log(`Cleaned up ${oldResolvedReports.length} resolved reports.`);

    // 3. Delete Un-reunited Lost Pets older than 90 days
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const oldLostPets = await LostPet.find({
      status: { $ne: 'reunited' },
      is_archived: false,
      created_at: { $lte: ninetyDaysAgo }
    });

    for (const pet of oldLostPets) {
      await deleteAssetAndLog(pet, 'LostPet', '90_day_lost', 'image_url');
      await LostPet.findByIdAndDelete(pet._id);
    }
    console.log(`Cleaned up ${oldLostPets.length} old lost pets.`);

    // 4. Delete Un-reunited Found Pets older than 90 days
    const oldFoundPets = await FoundPet.find({
      status: { $ne: 'resolved' },
      is_archived: false,
      created_at: { $lte: ninetyDaysAgo }
    });

    for (const pet of oldFoundPets) {
      await deleteAssetAndLog(pet, 'FoundPet', '90_day_found', 'image_url');
      await FoundPet.findByIdAndDelete(pet._id);
    }
    console.log(`Cleaned up ${oldFoundPets.length} old found pets.`);

    // 5. Delete Unverified Users older than 24 hours
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const unverifiedUsers = await User.find({
      isVerified: false,
      created_at: { $lte: oneDayAgo }
    });

    for (const user of unverifiedUsers) {
      await User.findByIdAndDelete(user._id);
    }
    console.log(`Cleaned up ${unverifiedUsers.length} unverified users.`);

  } catch (error) {
    console.error('Error during cleanup service:', error);
  }
};

// Schedule to run every day at midnight
const startCleanupService = () => {
  cron.schedule('0 0 * * *', runCleanup);
  console.log('Cleanup service scheduled to run daily at midnight.');
};

module.exports = { startCleanupService, runCleanup };
