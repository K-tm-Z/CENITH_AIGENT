const EquipmentItem = require('../models/EquipmentItem')

/**
 * Merge parsed fields + equipment into a FormSubmission.
 *
 * - updates submission.structuredData
 * - upserts EquipmentItem rows linked to the submission
 */
async function applyParsedDataToSubmission(submission, { fields, equipment }) {
  const structured = submission.structuredData || {}

  const mergedFields = {
    ...(structured.fields || {}),
    ...(fields || {})
  }

  submission.structuredData = {
    ...structured,
    fields: mergedFields
  }

  await submission.save()

  // If equipment items are provided, append them as new records.
  if (Array.isArray(equipment) && equipment.length) {
    const docs = equipment
      .filter(item => item && item.name)
      .map(item => ({
        formSubmission: submission._id,
        name: item.name,
        quantity:
          typeof item.quantity === 'number' && !Number.isNaN(item.quantity)
            ? item.quantity
            : 1,
        unit: item.unit || '',
        location: item.location || '',
        codes: Array.isArray(item.codes) ? item.codes : [],
        metadata: item.metadata || {}
      }))

    if (docs.length) {
      await EquipmentItem.insertMany(docs)
    }
  }

  return submission
}

module.exports = {
  applyParsedDataToSubmission
}

