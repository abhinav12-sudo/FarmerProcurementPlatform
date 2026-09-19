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
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    const queue = await Booking.find({ centerId, status: "checked_in" })
        .populate({ path: "slotId", match: { startTime: { $gte: startOfDay, $lt: endOfDay } } })
        .sort({ createdAt: 1 });

    const todaysQueue = queue.filter((b) => b.slotId);

    for (let i = 0; i < todaysQueue.length; i++) {
        const booking = todaysQueue[i];
        const peopleAhead = i;

        if (peopleAhead <= PEOPLE_AHEAD_THRESHOLD && !booking.fivePeopleAheadNotified) {
            await notify(
                booking.farmerId,
                "queue_update",
                `Update: only ${PEOPLE_AHEAD_THRESHOLD} people ahead of you in the queue now. Please be ready.`
            );
            booking.fivePeopleAheadNotified = true;
            await booking.save();
        }
    }
}