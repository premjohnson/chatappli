import User from "../models/user.model.js"

class UserService {

  /**
   * Search users by username
   * Excludes the currently logged-in user
   * Limits results for performance
   */
  static async searchUsers(query, currentUserId) {

    const filter = {
      _id: { $ne: currentUserId },
      isActive: true
    }

    if (query && query.trim() !== "") {
      filter.username = {
        $regex: query,
        $options: "i"
      }
    }

    const users = await User.find(filter)
      .select("_id username avatar")
      .limit(10)
      .lean()

    return users
  }

}

export default UserService