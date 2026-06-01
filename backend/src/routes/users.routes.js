import express from "express"
import { searchUsers } from "../controllers/user.controller.js"
import protect from "../middlewares/protect.middleware.js"

const router = express.Router()


router.get("/users", protect, searchUsers)

export default router