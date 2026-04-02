import express from "express"
import { searchUsers } from "../controllers/user.controller.js"
import protect from "../middlewares/protect.middleware.js"

const router = express.Router()

/**
 * Search users
 * GET /api/v1/search/users?q=sai
 */
router.get("/users", protect, searchUsers)

export default router