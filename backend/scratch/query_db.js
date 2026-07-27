import mongoose from "mongoose";
import Message from "../src/models/message.model.js";

const MONGODB_URI = "mongodb+srv://MITS:mits@cluster0.0pcib.mongodb.net/mychatdb";

async function run() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB successfully");

    const messages = await Message.find({
      deliveryReceipts: { $exists: true, $not: { $size: 0 } }
    })
      .sort({ createdAt: -1 })
      .limit(10);

    console.log(`Found ${messages.length} messages with receipts:`);
    messages.forEach((msg) => {
      console.log(`Message ID: ${msg._id}`);
      console.log(`Sender: ${msg.sender}`);
      console.log(`Created At: ${msg.createdAt?.toISOString()}`);
      console.log("Receipts:", JSON.stringify(msg.deliveryReceipts, null, 2));
    });

  } catch (error) {
    console.error("Error running query:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
}

run();
