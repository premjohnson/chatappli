import PresenceService from "../../services/presence.service.js";
import { PRESENCE_EVENTS } from "../events/presence.events.js";

export default async function presenceHandler(io, socket) {

  const userId = socket.userId;
  const count = 

   await PresenceService.incrementConnections(userId);

    if(count === 1) {
      // Scoped broadcast: only to conversation rooms the user is in
      socket.rooms.forEach(room => {
        if (room !== socket.id && room !== `user:${userId}`) {
          socket.to(room).emit(PRESENCE_EVENTS.USER_ONLINE, { userId });
        }
      });
    }

}