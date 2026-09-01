import mongoose,{Schema} from "mongoose";

const farmerSchema = new Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true, unique: true },
  village: String,
  landRecordNumber: String,
  bankAccount: String,
}, { timestamps: { createdAt: true, updatedAt: false } });

export const Farmer = mongoose.model("Farmer",farmerSchema);