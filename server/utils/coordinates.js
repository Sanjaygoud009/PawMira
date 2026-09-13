'use strict';

const isValidCoordinates = (coordinates) => (
  Array.isArray(coordinates) &&
  coordinates.length === 2 &&
  typeof coordinates[0] === 'number' &&
  typeof coordinates[1] === 'number' &&
  Number.isFinite(coordinates[0]) &&
  Number.isFinite(coordinates[1]) &&
  coordinates[0] >= -180 && coordinates[0] <= 180 &&
  coordinates[1] >= -90 && coordinates[1] <= 90
);

module.exports = { isValidCoordinates };
