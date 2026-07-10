import PresenceService from "../../services/presence.service.js";
import { PRESENCE_EVENTS } from "../events/presence.events.js";
import logger from "../../config/logger.js";

export default async function presenceHandler(io, socket) {
  const userId = socket.userId;

  try {
    await PresenceService.setOnline(userId);

    const activeSockets = await io.in(`user:${userId}`).fetchSockets();

    if (activeSockets.length === 1) {
      // Scoped broadcast: only to conversation rooms the user is in
      socket.rooms.forEach(room => {
        if (room !== socket.id && room !== `user:${userId}`) {
          socket.to(room).emit(PRESENCE_EVENTS.USER_ONLINE, { userId });
        }
      });
    }
  } catch (error) {
    logger.error(`presenceHandler error for user ${userId}: ${error.message}`);
  }
}