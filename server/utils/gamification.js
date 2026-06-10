const User = require('../models/User');
const HeartTransaction = require('../models/HeartTransaction');

const LEVEL_THRESHOLDS = [
  { max: 50, title: 'Animal Friend 🐾' },
  { max: 150, title: 'Rescue Helper 🤝' },
  { max: 300, title: 'Community Hero ❤️' },
  { max: 500, title: 'Guardian Angel 🪽' },
  { max: Infinity, title: 'PawMira Champion 🏆' }
];

const checkAchievements = async (user, actionType) => {
  const newAchievements = [];
  
  if (actionType === 'safe_marked' || actionType === 'rescue_accepted') {
    const hasFirstRescue = user.achievements.some(a => a.type === 'first_rescue');
    if (!hasFirstRescue && user.rescue_count >= 1) {
      newAchievements.push({ title: 'First Rescue Completed', type: 'first_rescue' });
    }
  }

  if (actionType === 'pet_reunited') {
    const hasFirstReunite = user.achievements.some(a => a.type === 'first_reunite');
    if (!hasFirstReunite && user.reunited_pets_count >= 1) {
      newAchievements.push({ title: 'Reunited First Pet', type: 'first_reunite' });
    }
  }

  if (user.hearts >= 50) {
    const has50Hearts = user.achievements.some(a => a.type === '50_hearts');
    if (!has50Hearts) {
      newAchievements.push({ title: 'Earned 50 Hearts', type: '50_hearts' });
    }
  }

  if (user.hero_level === 'Community Hero ❤️') {
    const hasHeroLevel = user.achievements.some(a => a.type === 'hero_level');
    if (!hasHeroLevel) {
      newAchievements.push({ title: 'Community Hero Level Reached', type: 'hero_level' });
    }
  }

  if (newAchievements.length > 0) {
    user.achievements.push(...newAchievements);
  }
};

const awardHearts = async ({ userId, actionType, points, reportId = null, referenceModel = 'Report' }) => {
  try {
    if (!userId) return null;

    // Check if points already awarded for this specific action on this report
    // (Prevents farming from the same action multiple times, like uploading multiple proofs)
    if (reportId && actionType === 'proof_uploaded') {
      const existingTx = await HeartTransaction.findOne({ 
        user_id: userId, 
        report_id: reportId, 
        action_type: actionType 
      });
      if (existingTx) {
        console.log(`[GAMIFICATION] User ${userId} already received points for ${actionType} on report ${reportId}`);
        return null;
      }
    }

    // Create transaction
    await HeartTransaction.create({
      user_id: userId,
      action_type: actionType,
      points: points,
      report_id: reportId,
      reference_model: referenceModel
    });

    // Update user
    const user = await User.findById(userId);
    if (!user) return null;

    user.hearts += points;

    // Determine new level
    let newLevel = 'Animal Friend 🐾';
    for (const threshold of LEVEL_THRESHOLDS) {
      if (user.hearts <= threshold.max) {
        newLevel = threshold.title;
        break;
      }
    }
    user.hero_level = newLevel;

    // Update metrics
    if (actionType === 'safe_marked') {
      user.rescue_count += 1;
    }
    if (actionType === 'pet_reunited') {
      user.reunited_pets_count += 1;
    }

    // Check achievements
    await checkAchievements(user, actionType);

    await user.save();
    console.log(`[GAMIFICATION] Awarded ${points} hearts to user ${userId} for ${actionType}`);
    
    return user;
  } catch (error) {
    console.error(`[GAMIFICATION_ERROR] ${error.message}`);
    return null;
  }
};

module.exports = { awardHearts };
