import mongoose from 'mongoose';

const curriculumItemSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    detail: { type: String, default: '', trim: true },
    lessons: [{ type: String, trim: true }]
  },
  { _id: false }
);

const courseSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, trim: true },
    title: { type: String, required: true, trim: true },
    subtitle: { type: String, default: '', trim: true },
    shortDescription: { type: String, required: true, trim: true },

    dateLabel: { type: String, required: true, trim: true },
    timeLabel: { type: String, default: '', trim: true },
    durationLabel: { type: String, required: true, trim: true },

    standardPriceUsd: { type: Number, required: true },
    earlyBirdPriceUsd: { type: Number, required: true },
    earlyBirdEndsAt: { type: Date, required: true },

    imageUrl: { type: String, default: '', trim: true },
    imageAlt: { type: String, default: '', trim: true },
    imageCredit: { type: String, default: '', trim: true },

    badge: { type: String, default: 'Masterclass', trim: true },

    highlights: [{ type: String, trim: true }],
    curriculum: [curriculumItemSchema],

    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export const Course = mongoose.model('Course', courseSchema);