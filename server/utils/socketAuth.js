exports.authenticateSocket = async (socket, next, { jwt, User, jwtSecret }) => {
  try {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');
    if (!token) return next(new Error('Authentication error: Token missing'));

    const decoded = jwt.verify(token, jwtSecret);
    const user = await User.findById(decoded.id).select('-password');
    if (!user) return next(new Error('Authentication error: User not found'));

    socket.user = user;
    return next();
  } catch (error) {
    return next(new Error('Authentication error: Invalid token'));
  }
};
