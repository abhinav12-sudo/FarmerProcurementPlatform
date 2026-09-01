import mongoose, { Schema } from "mongoose";

const slotSchema = new Schema(
  {
    centerId: {
      type: Schema.Types.ObjectId,
      ref: "Center",
      required: true,
    },
    cropType: { 
        type: String, 
        required: true 
    },
    startTime: { 
        type: Date, 
        required: true 
    },
    capacity: { 
        type: Number, 
        required: true, 
        min: 1 
    },
    bookedCount: { 
        type: Number, 
        default: 0, 
        min: 0 
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

slotSchema.index({ centerId: 1, cropType: 1, startTime: 1 });

export const Slot = mongoose.model("Slot", slotSchema);
