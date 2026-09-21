import { Booking } from "../models/booking.model.js";
import { notify } from "./notify.js";

const PEOPLE_AHEAD_THRESHOLD = 5;

/**
 * Call this after ANY event that shrinks a center's queue: a procurement
 * is recorded (farmer served) or a booking is cancelled. Sends one SMS to
 * any waiting farmer who now has 5 or fewer people ahead of them, and
 * hasn't already been notified.
 */
export async function updateQueueNotifications(centerId) {
    const queue = await Booking.find({ centerId, status: "checked_in" })
        .sort({ checkedInAt: 1, createdAt: 1 });

    for (let i = 0; i < queue.length; i++) {
        const booking = queue[i];
        const peopleAhead = i;

        if (peopleAhead <= PEOPLE_AHEAD_THRESHOLD && !booking.fivePeopleAheadNotified) {
            await notify(
                booking.farmerId,
                "queue_update",
                `MANDI ALERT: Only ${peopleAhead} tractor${peopleAhead === 1 ? '' : 's'} ahead of you at Scale #1. Please keep your tractor ready near the scale ramp.`
            );
            booking.fivePeopleAheadNotified = true;
            await booking.save();
        }
    }
}