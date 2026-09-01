import mongoose,{Schema} from "mongoose";

const paymentSchema = new Schema({
  procurementId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Procurement', 
    required: true, 
    unique: true 
},
  amount: { 
    type: Number, 
    required: true 
},
  status: { 
    type: String,
    enum: ['pending', 'processing', 'paid', 'failed'], 
    default: 'pending' 
},
  paidAt: Date,
});

export const Payment = mongoose.model("Payment",paymentSchema);