import axios from "axios";
import { Notification } from "../models/notification.model.js";

/**
 * Sends an SMS via Fast2SMS and logs it to the Notification collection.
 * Get an API key from fast2sms.com (free trial credits available) and set
 * FAST2SMS_API_KEY in your .env.
 */
const sendSms = async (phone, message) => {
    if (!process.env.FAST2SMS_API_KEY) {
        // no key configured yet — fall back to console logging so dev/testing isn't blocked
        console.log(`[SMS -> ${phone}]: ${message}`);
        return;
    }

    try {
        await axios.post(
            "https://www.fast2sms.com/dev/bulkV2",
            {
                route: "q", // quick/transactional route
                message,
                language: "english",
                flash: 0,
                numbers: phone,
            },
            {
                headers: {
                    authorization: process.env.FAST2SMS_API_KEY,
                    "Content-Type": "application/json",
                },
            }
        );
    } catch (error) {
        // never let an SMS failure break the API request that triggered it
        console.error("SMS send failed:", error?.response?.data || error.message);
    }
};

const notify = async (farmerId, type, message) => {
    const { Farmer } = await import("../models/farmer.model.js");
    const farmer = await Farmer.findById(farmerId);

    if (farmer?.phone) {
        await sendSms(farmer.phone, message);
    }

    await Notification.create({ farmerId, type, message });
};

export { notify };