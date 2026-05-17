const LostPet = require('../models/LostPet');
const FoundPet = require('../models/FoundPet');

// @desc    Create a lost pet report
// @route   POST /api/lost-found/lost-pets
exports.createLostPet = async (req, res) => {
  try {
    const { pet_name, animal_type, breed, color, latitude, longitude, last_seen_at, description, contact_phone } = req.body;

    if (!pet_name || !animal_type || !color || !latitude || !longitude || !last_seen_at || !description || !contact_phone) {
      return res.status(400).json({ message: 'Pet name, type, color, location, date, description, and contact are required.' });
    }

    const petData = {
      pet_name,
      animal_type,
      breed,
      color,
      location: {
        type: 'Point',
        coordinates: [parseFloat(longitude), parseFloat(latitude)],
      },
      last_seen_at: new Date(last_seen_at),
      description,
      contact_phone,
    };

    if (req.file) {
      petData.image_url = req.file.path;
    }

    const pet = await LostPet.create(petData);
    console.log(`[LOST_PET_CREATED] id=${pet._id} name=${pet_name} type=${animal_type}`);
    res.status(201).json(pet);
  } catch (error) {
    console.error(`[LOST_PET_ERROR] create: ${error.message}`);
    res.status(500).json({ message: 'Failed to create lost pet report.' });
  }
};

// @desc    Get all lost pet reports
// @route   GET /api/lost-found/lost-pets
exports.getLostPets = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const pets = await LostPet.find(filter).sort({ created_at: -1 }).lean();

    const transformed = pets.map((p) => ({
      ...p,
      latitude: p.location?.coordinates?.[1],
      longitude: p.location?.coordinates?.[0],
    }));

    res.json(transformed);
  } catch (error) {
    console.error(`[LOST_PET_ERROR] fetch: ${error.message}`);
    res.status(500).json({ message: 'Failed to fetch lost pet reports.' });
  }
};

// @desc    Create a found pet report
// @route   POST /api/lost-found/found-pets
exports.createFoundPet = async (req, res) => {
  try {
    const { animal_type, breed, latitude, longitude, found_at, description, finder_contact } = req.body;

    if (!animal_type || !latitude || !longitude || !found_at || !description || !finder_contact) {
      return res.status(400).json({ message: 'Animal type, location, date found, description, and contact are required.' });
    }

    const petData = {
      animal_type,
      breed,
      location: {
        type: 'Point',
        coordinates: [parseFloat(longitude), parseFloat(latitude)],
      },
      found_at: new Date(found_at),
      description,
      finder_contact,
    };

    if (req.file) {
      petData.image_url = req.file.path;
    }

    const pet = await FoundPet.create(petData);
    console.log(`[FOUND_PET_CREATED] id=${pet._id} type=${animal_type}`);
    res.status(201).json(pet);
  } catch (error) {
    console.error(`[FOUND_PET_ERROR] create: ${error.message}`);
    res.status(500).json({ message: 'Failed to create found pet report.' });
  }
};

// @desc    Get all found pet reports
// @route   GET /api/lost-found/found-pets
exports.getFoundPets = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const pets = await FoundPet.find(filter).sort({ created_at: -1 }).lean();

    const transformed = pets.map((p) => ({
      ...p,
      latitude: p.location?.coordinates?.[1],
      longitude: p.location?.coordinates?.[0],
    }));

    res.json(transformed);
  } catch (error) {
    console.error(`[FOUND_PET_ERROR] fetch: ${error.message}`);
    res.status(500).json({ message: 'Failed to fetch found pet reports.' });
  }
};
