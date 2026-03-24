const bcrypt = require("bcrypt");
const { pool } = require("../config/db");

async function list(req, res, next) {
	try {
		const [rows] = await pool.query(
			"SELECT id, name, email, phone, created_at FROM users ORDER BY id DESC",
		);
		res.json(rows);
	} catch (err) {
		next(err);
	}
}

async function update(req, res, next) {
	try {
		const id = Number(req.params.id);
		if (!id) return res.status(400).json({ message: "ID inválido" });

		const { name, email, phone, password } = req.body || {};
		const [currentRows] = await pool.query(
			"SELECT id, name, email, phone FROM users WHERE id = ?",
			[id],
		);
		if (!currentRows.length)
			return res.status(404).json({ message: "No encontrado" });
		const current = currentRows[0];

		const nextName =
			name != null ? String(name).trim() : String(current.name || "");
		const nextEmail =
			email != null ? String(email).trim() : String(current.email || "");
		const nextPhone =
			phone != null
				? String(phone).trim() || null
				: current.phone || null;
		if (!nextName || !nextEmail)
			return res
				.status(400)
				.json({ message: "Nombre y email requeridos" });

		if (nextEmail !== current.email) {
			const [exists] = await pool.query(
				"SELECT id FROM users WHERE email = ? AND id <> ? LIMIT 1",
				[nextEmail, id],
			);
			if (exists.length)
				return res.status(409).json({ message: "Email ya registrado" });
		}

		let passHash = null;
		if (password != null && String(password).trim()) {
			passHash = await bcrypt.hash(String(password), 10);
		}

		if (passHash) {
			await pool.query(
				"UPDATE users SET name = ?, email = ?, phone = ?, password_hash = ? WHERE id = ?",
				[nextName, nextEmail, nextPhone, passHash, id],
			);
		} else {
			await pool.query(
				"UPDATE users SET name = ?, email = ?, phone = ? WHERE id = ?",
				[nextName, nextEmail, nextPhone, id],
			);
		}

		const [rows] = await pool.query(
			"SELECT id, name, email, phone, created_at FROM users WHERE id = ?",
			[id],
		);
		res.json(rows[0]);
	} catch (err) {
		next(err);
	}
}

module.exports = { list, update };

