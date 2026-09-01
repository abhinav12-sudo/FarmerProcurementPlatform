import mongoose,{Schema} from "mongoose";

const itemSchema = new Schema({
  cropType: { 
    type: String, 
    required: true 
},
  quantityKg: { 
    type: Number, 
    required: true, 
    min: 0.01 
},
  grade: { 
    type: String, 
    required: true 
},
  ratePerKg: { 
    type: Number, 
    required: true, 
    min: 0 
},
}, { _id: false });

const procurementSchema = new Schema({
  bookingId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Booking', 
    required: true, 
    unique: true },
  items: { 
    type: [itemSchema], 
    validate: v => Array.isArray(v) && v.length > 0 
},
}, { timestamps: { createdAt: 'recordedAt', updatedAt: false } });

export const Procurement = mongoose.model("Procurement",procurementSchema);