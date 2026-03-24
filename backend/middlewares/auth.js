const jwt = require('jsonwebtoken')

function authMiddleware (req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return res.status(401).json({ message: 'No autorizado' })
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'devsecret')
    req.user = { id: decoded.id, email: decoded.email }
    next()
  } catch (e) {
    res.status(401).json({ message: 'Token inválido' })
  }
}

module.exports = authMiddleware
