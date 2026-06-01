/**
 * Application Error Constants
 * Centralized source of truth for all error messages and codes.
 */

export const ERROR_CODES = {
  // Auth Errors
  UNAUTHORIZED: "UNAUTHORIZED",
  INVALID_TOKEN: "INVALID_TOKEN",
  TOKEN_EXPIRED: "TOKEN_EXPIRED",
  USER_NOT_FOUND: "USER_NOT_FOUND",
  INVALID_CREDENTIALS: "INVALID_CREDENTIALS",

  // Resource Errors
  NOT_FOUND: "NOT_FOUND",
  ALREADY_EXISTS: "ALREADY_EXISTS",
  PERMISSION_DENIED: "PERMISSION_DENIED",

  // Business Logic Errors
  CONVERSATION_NOT_FOUND: "CONVERSATION_NOT_FOUND",
  NOT_PARTICIPANT: "NOT_PARTICIPANT",
  RECEIVER_NOT_FOUND: "RECEIVER_NOT_FOUND",
  DEVICE_ALREADY_REGISTERED: "DEVICE_ALREADY_REGISTERED",
  DEVICE_NOT_FOUND: "DEVICE_NOT_FOUND",
  WINDOW_EXPIRED: "WINDOW_EXPIRED",

  // System Errors
  INTERNAL_SERVER_ERROR: "INTERNAL_SERVER_ERROR",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  RATE_LIMIT_EXCEEDED: "RATE_LIMIT_EXCEEDED",
};

export const ERROR_MESSAGES = {
  [ERROR_CODES.UNAUTHORIZED]: "Authentication required. Please log in.",
  [ERROR_CODES.INVALID_TOKEN]: "Invalid token. Please log in again.",
  [ERROR_CODES.TOKEN_EXPIRED]: "Your session has expired. Please log in again.",
  [ERROR_CODES.USER_NOT_FOUND]: "The requested user was not found.",
  [ERROR_CODES.INVALID_CREDENTIALS]: "Invalid email or password.",

  [ERROR_CODES.NOT_FOUND]: "The requested resource was not found.",
  [ERROR_CODES.ALREADY_EXISTS]: "This resource already exists.",
  [ERROR_CODES.PERMISSION_DENIED]: "You do not have permission to perform this action.",

  [ERROR_CODES.CONVERSATION_NOT_FOUND]: "Conversation not found.",
  [ERROR_CODES.NOT_PARTICIPANT]: "You are not a participant of this conversation.",
  [ERROR_CODES.RECEIVER_NOT_FOUND]: "Message receiver not found.",
  [ERROR_CODES.DEVICE_ALREADY_REGISTERED]: "This device is already registered.",
  [ERROR_CODES.DEVICE_NOT_FOUND]: "The specified device was not found.",
  [ERROR_CODES.WINDOW_EXPIRED]: "The time window for this action (edit/delete) has expired.",

  [ERROR_CODES.INTERNAL_SERVER_ERROR]: "An unexpected error occurred. Please try again later.",
  [ERROR_CODES.VALIDATION_ERROR]: "Input validation failed.",
  [ERROR_CODES.RATE_LIMIT_EXCEEDED]: "Too many requests. Please slow down.",
};
