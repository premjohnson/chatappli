import asyncHandler from "../utils/asyncHandler.js"
import UserService from "../services/user.service.js"

export const searchUsers = asyncHandler(async (req, res) => {

  const { q } = req.query

  const users = await UserService.searchUsers(
    q,
    req.user._id
  )

  return res.status(200).json({
    status: "success",
    results: users.length,
    data: users
  })

})