import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"

const app = express()

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))

app.use(express.json({limit: "16kb"}))
app.use(express.urlencoded({extended: true, limit: "16kb"}))
app.use(express.static("public"))
app.use(cookieParser())


//routes import
import authRouter from "./routes/staff.routes.js";
import farmerRouter from "./routes/farmer.routes.js";
import slotRouter from "./routes/slot.routes.js";
import bookingRouter from "./routes/booking.routes.js";
import procurementRouter from "./routes/procurement.routes.js";
import paymentRouter from "./routes/payment.routes.js";
import { errorHandler } from "./middlewares/error.middleware.js";

//routes declaration
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/farmers", farmerRouter);
app.use("/api/v1/slots", slotRouter);
app.use("/api/v1/bookings", bookingRouter);
app.use("/api/v1/procurements", procurementRouter);
app.use("/api/v1/payments", paymentRouter);


app.use(errorHandler);

export { app }