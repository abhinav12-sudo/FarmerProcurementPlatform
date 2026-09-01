import mongoose,{Schema} from "mongoose";

const notificationSchema = new Schema({
  farmerId:{ 
    type: Schema.Types.ObjectId, 
    ref: 'Farmer', 
    required: true 
},
  type: { 
    type: String,
    required: true 
},
  message: { 
    type: String,
    required: true 
},
}, { timestamps: { createdAt: 'sentAt', updatedAt: false } });

export const Notification = mongoose.model("Notification",notificationSchema);