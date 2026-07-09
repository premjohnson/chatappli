import mongoose from "mongoose";
import Message from "../src/models/message.model.js";

const MONGODB_URI = "mongodb+srv://MITS:mits@cluster0.0pcib.mongodb.net/mychatdb";

async function run() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB");

    // Find a message to get its sender and conversation
    const sampleMsg = await Message.findOne();
    if (!sampleMsg) {
      console.log("No messages in database to test");
      return;
    }

    const conversationId = sampleMsg.conversation;
    const senderIdStr = sampleMsg.sender.toString();

    console.log(`Testing with Conversation: ${conversationId}, Sender: ${senderIdStr}`);

    // Query 1: Using string ID in $ne
    const queryStr = {
      conversation: conversationId,
      sender: { $ne: senderIdStr }
    };
    const resultsStr = await Message.find(queryStr);
    const hasOwnMessageStr = resultsStr.some(m => m.sender.toString() === senderIdStr);
    console.log(`Query with string ID returned ${resultsStr.length} messages. Has own message? ${hasOwnMessageStr}`);

    // Query 2: Using ObjectId in $ne
    const queryObj = {
      conversation: conversationId,
      sender: { $ne: new mongoose.Types.ObjectId(senderIdStr) }
    };
    const resultsObj = await Message.find(queryObj);
    const hasOwnMessageObj = resultsObj.some(m => m.sender.toString() === senderIdStr);
    console.log(`Query with ObjectId returned ${resultsObj.length} messages. Has own message? ${hasOwnMessageObj}`);

  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

run();
