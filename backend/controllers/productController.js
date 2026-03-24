const { pool } = require('../config/db')

async function list (req, res, next) {
  try {
    const [rows] = await pool.query('SELECT * FROM products WHERE status = "active" ORDER BY name')
    res.json(rows)
  } catch (err) {
    next(err)
  }
}

async function create (req, res, next) {
  try {
    const { name, price, stock, status } = req.body
    if (!name) return res.status(400).json({ message: 'Nombre requerido' })
    const [result] = await pool.query('INSERT INTO products (name, price, stock, status) VALUES (?, ?, ?, ?)', [name, Number(price || 0), Number(stock || 0), status || 'active'])
    const [rows] = await pool.query('SELECT * FROM products WHERE id = ?', [result.insertId])
    res.status(201).json(rows[0])
  } catch (err) {
    next(err)
  }
}

async function update (req, res, next) {
  try {
    const { id } = req.params
    const { name, price, stock, status } = req.body
    const [result] = await pool.query('UPDATE products SET name = COALESCE(?, name), price = COALESCE(?, price), stock = COALESCE(?, stock), status = COALESCE(?, status) WHERE id = ?', [name || null, price != null ? Number(price) : null, stock != null ? Number(stock) : null, status || null, id])
    if (!result.affectedRows) return res.status(404).json({ message: 'No encontrado' })
    const [rows] = await pool.query('SELECT * FROM products WHERE id = ?', [id])
    res.json(rows[0])
  } catch (err) {
    next(err)
  }
}

async function remove (req, res, next) {
  try {
    const { id } = req.params
    const [result] = await pool.query('DELETE FROM products WHERE id = ?', [id])
    if (!result.affectedRows) return res.status(404).json({ message: 'No encontrado' })
    res.json({ success: true })
  } catch (err) {
    next(err)
  }
}

module.exports = { list, create, update, remove }
