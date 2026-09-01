import mongoose, { Schema } from "mongoose";

const centerSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    district: {
      type: String,
      required: true,
    },
    dailyCapacity: { 
        type: Number, 
        default: 0 
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export const Center = mongoose.model("Center", centerSchema);
