import mongoose from "mongoose";
import Message from "../src/models/message.model.js";
import MessageService from "../src/services/message.service.js";
import MessageRepository from "../src/repositories/message.repository.js";

const MONGODB_URI = "mongodb+srv://MITS:mits@cluster0.0pcib.mongodb.net/mychatdb";

async function run() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB successfully");

    const senderId = new mongoose.Types.ObjectId();
    const receiverId = new mongoose.Types.ObjectId();
    const conversationId = new mongoose.Types.ObjectId();

    // 1. Create a dummy message
    const msg = await Message.create({
      conversation: conversationId,
      sender: senderId,
      encryptedContent: "Encrypted text",
      nonce: "nonce",
      clientMessageId: "client-temp-" + Date.now(),
      type: "text",
      deliveryReceipts: [
        {
          user: receiverId
        }
      ]
    });

    console.log("Created message in DB:", msg._id);
    console.log("Initial receipts:", JSON.stringify(msg.deliveryReceipts, null, 2));

    // 2. Mark as delivered
    const deliverTime = new Date();
    await MessageRepository.markReceiptDelivered(msg._id, receiverId.toString(), deliverTime);
    
    let deliveredMsg = await Message.findById(msg._id);
    console.log("Receipts after markReceiptDelivered:", JSON.stringify(deliveredMsg.deliveryReceipts, null, 2));

    // 3. Mark as read
    const readTime = new Date();
    await MessageRepository.markReceiptRead(msg._id, receiverId.toString(), readTime);

    let readMsg = await Message.findById(msg._id);
    console.log("Receipts after markReceiptRead:", JSON.stringify(readMsg.deliveryReceipts, null, 2));

    // Clean up
    await Message.deleteOne({ _id: msg._id });
    console.log("Cleaned up database");

  } catch (error) {
    console.error("Error running test:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
}

run();
