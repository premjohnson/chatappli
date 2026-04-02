import mongoose from "mongoose";

export const validateObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

export const assertObjectId = (id, fieldName = "ID") => {
  if (!validateObjectId(id)) {
    const error = new Error(`Invalid ${fieldName}`);
    error.statusCode = 400;
    throw error;
  }
}; 