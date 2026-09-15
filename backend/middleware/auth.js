const jwt = require('jsonwebtoken');

const authenticateJWT = (req, res, next) => {
  let token = null;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (authHeader) {
    token = authHeader;
  } else if (req.query && req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Authorization token is missing' });
  }

  const secret = process.env.JWT_SECRET || 'allver_jwt_secure_secret_default';
  jwt.verify(token, secret, (err, decoded) => {
    if (err) {
      return res.status(403).json({ success: false, message: 'Invalid or expired token' });
    }
    const resolvedId = decoded.userId || decoded.id || decoded._id;
    req.userId = resolvedId;
    req.user = { id: resolvedId, _id: resolvedId, role: decoded.role, ...decoded };
    next();
  });
};

module.exports = authenticateJWT;
