import LiveBlock from "../models/liveblock.model.js";

class LiveBlockRepository {
  /* ================= FIND ================= */

  static async findById(id, session = null) {
    const query = LiveBlock.findById(id);
    if (session) query.session(session);
    return query;
  }

  static async findByConversationId(conversationId, session = null) {
    const query = LiveBlock.find({ conversationId });
    if (session) query.session(session);
    return query;
  }

  /* ================= CREATE ================= */

  static async create(data, session = null) {
    const [liveblock] = await LiveBlock.create([data], { session });
    return liveblock;
  }

  /* ================= SAVE ================= */

  static async save(liveblock, session = null) {
    return liveblock.save({ session });
  }

  /* ================= UPDATE ================= */

  static async updateOne(filter, update, session = null) {
    return LiveBlock.updateOne(filter, update, { session });
  }
}

export default LiveBlockRepository;
