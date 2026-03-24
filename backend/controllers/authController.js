const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const { pool } = require('../config/db')

async function register (req, res, next) {
  try {
    const { name, email, password, phone } = req.body
    if (!name || !email || !password) return res.status(400).json({ message: 'Datos inválidos' })
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email])
    if (existing.length) return res.status(409).json({ message: 'Email ya registrado' })
    const hash = await bcrypt.hash(password, 10)
    const [result] = await pool.query('INSERT INTO users (name, email, password_hash, phone) VALUES (?, ?, ?, ?)', [name, email, hash, phone || null])
    const token = jwt.sign({ id: result.insertId, email }, process.env.JWT_SECRET || 'devsecret', { expiresIn: '7d' })
    res.status(201).json({ token })
  } catch (err) {
    next(err)
  }
}

async function login (req, res, next) {
  try {
    const { email, password } = req.body
    if (!email || !password) return res.status(400).json({ message: 'Datos inválidos' })
    const [rows] = await pool.query('SELECT id, password_hash FROM users WHERE email = ?', [email])
    if (!rows.length) return res.status(401).json({ message: 'Credenciales inválidas' })
    const user = rows[0]
    const ok = await bcrypt.compare(password, user.password_hash)
    if (!ok) return res.status(401).json({ message: 'Credenciales inválidas' })
    const token = jwt.sign({ id: user.id, email }, process.env.JWT_SECRET || 'devsecret', { expiresIn: '7d' })
    res.json({ token })
  } catch (err) {
    next(err)
  }
}

module.exports = { register, login }
