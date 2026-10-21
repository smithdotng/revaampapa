// models/StructuralAssessment.js
const mongoose = require('mongoose');

const structuralAssessmentSchema = new mongoose.Schema({
    // Who submitted the report
    architect: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Architect',
        required: true
    },

    // Optional link to a proposed project (the promoter "propose a project"
    // record is not built yet — left optional for future wiring).
    project: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project'
    },

    // Project context captured on the form so the report works standalone
    projectTitle: {
        type: String,
        required: true,
        trim: true
    },
    projectLocation: String,
    promoterName: String,
    proposedUse: String,

    // Assessment body
    siteConditions: String,
    foundationAssessment: String,
    structuralDesignReview: String,
    materialsAssessment: String,
    loadBearingEvaluation: String,
    complianceWithCodes: String,
    identifiedRisks: String,
    recommendations: String,
    remarks: String,

    // Structured verdict
    structuralIntegrityRating: {
        type: String,
        enum: ['excellent', 'good', 'fair', 'poor'],
        default: 'good'
    },
    recommendation: {
        type: String,
        enum: ['approved', 'approved_with_conditions', 'rejected'],
        default: 'approved'
    },
    conditions: String,

    // Supporting documents (plan/drawings/report PDF)
    supportingDocuments: [{
        name: String,
        url: String,
        uploadedAt: {
            type: Date,
            default: Date.now
        }
    }],

    // Status
    status: {
        type: String,
        enum: ['submitted', 'under_review', 'verified'],
        default: 'submitted'
    },
    submittedAt: {
        type: Date,
        default: Date.now
    },

    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Update timestamp on save
structuralAssessmentSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('StructuralAssessment', structuralAssessmentSchema);
