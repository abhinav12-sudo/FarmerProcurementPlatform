import { Notification } from "../models/notification.model.js";

/**
 * Sends an SMS/app notification and logs it.
 * Replace the console.log with a real SMS gateway call (Twilio, MSG91, etc.)
 * when you're ready — the logging/DB side stays the same.
 */
const notify = async (farmerId, type, message) => {
    console.log(`[SMS -> farmer ${farmerId}] (${type}): ${message}`);
    await Notification.create({ farmerId, type, message });
};

export { notify };
