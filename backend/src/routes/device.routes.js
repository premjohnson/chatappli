import express from "express";
import {
  registerDevice,
  getMyDevices,
  revokeDevice
} from "../controllers/device.controller.js";

import protect from "../middlewares/protect.middleware.js";

const router = express.Router();

/* ================= ALL ROUTES PROTECTED ================= */
router.use(protect);

/* ================= DEVICE ================= */

router.post("/", registerDevice);

router.get("/", getMyDevices);

router.delete("/:deviceId", revokeDevice);

export default router;