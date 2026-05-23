const express = require('express');
const router = express.Router();
const {
  createLostPet,
  getLostPets,
  createFoundPet,
  getFoundPets,
} = require('../controllers/lostFoundController');
const upload = require('../middleware/upload');
const { reportLimiter } = require('../middleware/rateLimiter');

// Lost Pets
router.post('/lost-pets', reportLimiter, upload.single('image'), createLostPet);
router.get('/lost-pets', getLostPets);

// Found Pets
router.post('/found-pets', reportLimiter, upload.single('image'), createFoundPet);
router.get('/found-pets', getFoundPets);

module.exports = router;
