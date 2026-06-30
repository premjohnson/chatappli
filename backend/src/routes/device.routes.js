import express from "express";
import {
  registerDevice,
  getMyDevices,
  revokeDevice,
  getDevicesByUserId
} from "../controllers/device.controller.js";

import protect from "../middlewares/protect.middleware.js";

const router = express.Router();

/* ================= ALL ROUTES PROTECTED ================= */
router.use(protect);


router.post("/", registerDevice);

router.get("/", getMyDevices);

router.get("/user/:userId", getDevicesByUserId);

router.delete("/:deviceId", revokeDevice);

export default router;