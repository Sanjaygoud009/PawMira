const express = require('express');
const router = express.Router();
const {
  createLostPet,
  getLostPets,
  createFoundPet,
  getFoundPets,
  reuniteLostPet,
  getAchievements
} = require('../controllers/lostFoundController');
const upload = require('../middleware/upload');
const { reportLimiter } = require('../middleware/rateLimiter');

// Achievements
router.get('/achievements', getAchievements);

// Lost Pets
router.post('/lost-pets', reportLimiter, upload.single('image'), createLostPet);
router.get('/lost-pets', getLostPets);
router.post('/lost-pets/:id/reunite', upload.single('image'), reuniteLostPet);

// Found Pets
router.post('/found-pets', reportLimiter, upload.single('image'), createFoundPet);
router.get('/found-pets', getFoundPets);

module.exports = router;
