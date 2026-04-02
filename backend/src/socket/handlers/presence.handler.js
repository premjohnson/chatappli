import PresenceService from "../../services/presence.service.js";
import { PRESENCE_EVENTS } from "../events/presence.events.js";

export default function presenceHandler(io, socket) {

  const userId = socket.userId;

  PresenceService.setOnline(userId);

  io.emit(PRESENCE_EVENTS.USER_ONLINE, { userId });

  socket.on("disconnect", async () => {

    await PresenceService.setOffline(userId);

    io.emit(PRESENCE_EVENTS.USER_OFFLINE, { userId });

  });

}