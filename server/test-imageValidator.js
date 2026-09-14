const test = require('node:test');
const assert = require('node:assert/strict');
const { validateReportImageAnalysis, validateRescueProofAnalysis } = require('./utils/imageValidator');

test('Image Validator Logic Tests - Emergency Report', async (t) => {
  await t.test('should ACCEPT real dog', () => {
    const analysis = { isValidLiveAnimal: true, isFakeOrExtinct: false, isHumanOnly: false, isUnclear: false };
    assert.equal(validateReportImageAnalysis(analysis).isAnimal, true);
  });

  await t.test('should ACCEPT real cat', () => {
    const analysis = { isValidLiveAnimal: true, isFakeOrExtinct: false, isHumanOnly: false, isUnclear: false };
    assert.equal(validateReportImageAnalysis(analysis).isAnimal, true);
  });

  await t.test('should ACCEPT dog + person', () => {
    const analysis = { isValidLiveAnimal: true, isFakeOrExtinct: false, isHumanOnly: false, isUnclear: false };
    assert.equal(validateReportImageAnalysis(analysis).isAnimal, true);
  });

  await t.test('should REJECT human-only selfie', () => {
    const analysis = { isValidLiveAnimal: false, isFakeOrExtinct: false, isHumanOnly: true, isUnclear: false };
    assert.equal(validateReportImageAnalysis(analysis).isAnimal, false);
  });

  await t.test('should REJECT human portrait', () => {
    const analysis = { isValidLiveAnimal: false, isFakeOrExtinct: false, isHumanOnly: true, isUnclear: false };
    assert.equal(validateReportImageAnalysis(analysis).isAnimal, false);
  });

  await t.test('should REJECT dinosaur (extinct/fake)', () => {
    const analysis = { isValidLiveAnimal: false, isFakeOrExtinct: true, isHumanOnly: false, isUnclear: false };
    assert.equal(validateReportImageAnalysis(analysis).isAnimal, false);
  });

  await t.test('should REJECT toy dog', () => {
    const analysis = { isValidLiveAnimal: false, isFakeOrExtinct: true, isHumanOnly: false, isUnclear: false };
    assert.equal(validateReportImageAnalysis(analysis).isAnimal, false);
  });

  await t.test('should REJECT animal statue/figurine', () => {
    const analysis = { isValidLiveAnimal: false, isFakeOrExtinct: true, isHumanOnly: false, isUnclear: false };
    assert.equal(validateReportImageAnalysis(analysis).isAnimal, false);
  });

  await t.test('should REJECT cartoon animal', () => {
    const analysis = { isValidLiveAnimal: false, isFakeOrExtinct: true, isHumanOnly: false, isUnclear: false };
    assert.equal(validateReportImageAnalysis(analysis).isAnimal, false);
  });

  await t.test('should REJECT AI-generated animal artwork', () => {
    const analysis = { isValidLiveAnimal: false, isFakeOrExtinct: true, isHumanOnly: false, isUnclear: false };
    assert.equal(validateReportImageAnalysis(analysis).isAnimal, false);
  });

  await t.test('should REJECT landscape', () => {
    const analysis = { isValidLiveAnimal: false, isFakeOrExtinct: false, isHumanOnly: false, isUnclear: false };
    assert.equal(validateReportImageAnalysis(analysis).isAnimal, false);
  });

  await t.test('should REJECT building/road', () => {
    const analysis = { isValidLiveAnimal: false, isFakeOrExtinct: false, isHumanOnly: false, isUnclear: false };
    assert.equal(validateReportImageAnalysis(analysis).isAnimal, false);
  });

  await t.test('should REJECT unclear image', () => {
    const analysis = { isValidLiveAnimal: false, isFakeOrExtinct: false, isHumanOnly: false, isUnclear: true };
    assert.equal(validateReportImageAnalysis(analysis).isAnimal, false);
  });

  await t.test('should REJECT malformed Gemini response', () => {
    const analysis = { isValidLiveAnimal: "yes" }; 
    const result = validateReportImageAnalysis(analysis);
    assert.equal(result.isAnimal, false);
    assert.equal(result.serviceError, true);
  });
  
  await t.test('should REJECT Gemini API failure (null analysis)', () => {
    const result = validateReportImageAnalysis(null);
    assert.equal(result.isAnimal, false);
    assert.equal(result.serviceError, true);
  });
});

test('Image Validator Logic Tests - Rescue Proof', async (t) => {
  await t.test('should ACCEPT original dog + same/plausibly same dog', () => {
    const analysis = { isValidLiveAnimal: true, isFakeOrExtinct: false, isHumanOnly: false, isUnclear: false, isSameAnimal: true };
    assert.equal(validateRescueProofAnalysis(analysis).isRescueProof, true);
  });

  await t.test('should REJECT original cat + clearly different dog', () => {
    const analysis = { isValidLiveAnimal: true, isFakeOrExtinct: false, isHumanOnly: false, isUnclear: false, isSameAnimal: false };
    assert.equal(validateRescueProofAnalysis(analysis).isRescueProof, false);
  });

  await t.test('should REJECT original dog + human-only selfie', () => {
    const analysis = { isValidLiveAnimal: false, isFakeOrExtinct: false, isHumanOnly: true, isUnclear: false, isSameAnimal: false };
    assert.equal(validateRescueProofAnalysis(analysis).isRescueProof, false);
  });

  await t.test('should REJECT original dog + dinosaur', () => {
    const analysis = { isValidLiveAnimal: false, isFakeOrExtinct: true, isHumanOnly: false, isUnclear: false, isSameAnimal: false };
    assert.equal(validateRescueProofAnalysis(analysis).isRescueProof, false);
  });

  await t.test('should REJECT original dog + toy animal', () => {
    const analysis = { isValidLiveAnimal: false, isFakeOrExtinct: true, isHumanOnly: false, isUnclear: false, isSameAnimal: false };
    assert.equal(validateRescueProofAnalysis(analysis).isRescueProof, false);
  });

  await t.test('should REJECT original dog + unclear proof', () => {
    const analysis = { isValidLiveAnimal: false, isFakeOrExtinct: false, isHumanOnly: false, isUnclear: true, isSameAnimal: false };
    assert.equal(validateRescueProofAnalysis(analysis).isRescueProof, false);
  });

  await t.test('should REJECT malformed Gemini response', () => {
    const analysis = { isValidLiveAnimal: true, isSameAnimal: "true" }; 
    const result = validateRescueProofAnalysis(analysis);
    assert.equal(result.isRescueProof, false);
    assert.equal(result.serviceError, true);
  });

  await t.test('should REJECT Gemini API failure', () => {
    const result = validateRescueProofAnalysis(null);
    assert.equal(result.isRescueProof, false);
    assert.equal(result.serviceError, true);
  });
});
