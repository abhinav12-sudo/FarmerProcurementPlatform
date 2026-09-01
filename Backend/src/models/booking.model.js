import mongoose,{Schema} from "mongoose";

const bookingSchema = new Schema({
  farmerId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Farmer', 
    required: true 
},
  slotId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Slot', 
    required: true 
},
  centerId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Center', 
    required: true 
},
  tokenNumber: { 
    type: String, 
    required: true 
},
  status: {
    type: String,
    enum: ['booked', 'checked_in', 'completed', 'no_show', 'cancelled'],
    default: 'booked',
  },
}, { timestamps: { createdAt: true, updatedAt: false } });

bookingSchema.index({ centerId: 1, status: 1, createdAt: 1 });
bookingSchema.index({ farmerId: 1 });

export const Booking = mongoose.model("Booking",bookingSchema);