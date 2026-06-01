import mongoose from "mongoose";

class TransactionManager {

  //Execute database operations inside a MongoDB transaction

  static async run(callback) {

    const session = await mongoose.startSession();

    try {

      session.startTransaction();

      const result = await callback(session);

      await session.commitTransaction();

      return result;

    } catch (error) {

      await session.abortTransaction();

      throw error;

    } finally {

      session.endSession();

    }

  }


  static async runWithoutTransaction(callback) {

    return callback(null);

  }


  static attachSession(query, session) {

    if (session) {
      query.session(session);
    }

    return query;

  }

}

export default TransactionManager;