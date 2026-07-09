import mongoose from "mongoose";
import Message from "../src/models/message.model.js";

const MONGODB_URI = "mongodb+srv://MITS:mits@cluster0.0pcib.mongodb.net/mychatdb";

async function run() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB");

    // Find a message to get its conversation and a user from receipts
    const sampleMsg = await Message.findOne({
      deliveryReceipts: { $exists: true, $not: { $size: 0 } }
    });
    if (!sampleMsg) {
      console.log("No messages with receipts found to test");
      return;
    }

    const conversationId = sampleMsg.conversation;
    const testUserIdStr = sampleMsg.deliveryReceipts[0].user.toString();

    console.log(`Testing with Conversation: ${conversationId}, User: ${testUserIdStr}`);

    // Query 1: Using string ID in $elemMatch
    const queryStr = {
      conversation: conversationId,
      deliveryReceipts: {
        $elemMatch: {
          user: testUserIdStr
        }
      }
    };
    const resultsStr = await Message.find(queryStr);
    console.log(`Query with string ID returned ${resultsStr.length} messages.`);

    // Query 2: Using ObjectId in $elemMatch
    const queryObj = {
      conversation: conversationId,
      deliveryReceipts: {
        $elemMatch: {
          user: new mongoose.Types.ObjectId(testUserIdStr)
        }
      }
    };
    const resultsObj = await Message.find(queryObj);
    console.log(`Query with ObjectId returned ${resultsObj.length} messages.`);

  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

run();
