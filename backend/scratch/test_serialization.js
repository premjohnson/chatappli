import mongoose from "mongoose";
import Message from "../src/models/message.model.js";

const MONGODB_URI = "mongodb+srv://MITS:mits@cluster0.0pcib.mongodb.net/mychatdb";

async function run() {
  try {
    await mongoose.connect(MONGODB_URI);
    const msg = await Message.findOne();
    if (msg) {
      const serialized = JSON.parse(JSON.stringify({ message: msg }));
      console.log("--------------------------------");
      console.log("conversation type:", typeof serialized.message.conversation);
      console.log("conversation value:", serialized.message.conversation);
      console.log("sender type:", typeof serialized.message.sender);
      console.log("sender value:", serialized.message.sender);
      console.log("--------------------------------");
    } else {
      console.log("No messages found to test serialization");
    }
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

run();
