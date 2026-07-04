const jwt = require('jsonwebtoken');

const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.split(' ')[1]; // Expecting: Bearer <token>
    if (!token) {
      return res.status(401).json({ message: 'Authorization token is missing' });
    }
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        return res.status(403).json({ message: 'Invalid or expired token' });
      }
      req.userId = decoded.userId;
      next();
    });
  } else {
    res.status(401).json({ message: 'Authorization header is missing' });
  }
};

module.exports = authenticateJWT;
