const sanitizeUser = (user) => ({
  id: user._id,
  email: user.email,
  username: user.username,
  avatar: user.avatar,
  createdAt: user.createdAt
});

export default sanitizeUser;
