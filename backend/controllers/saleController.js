const { pool } = require("../config/db");

async function list(req, res, next) {
	try {
		const { day } = req.query;
		let sql =
			"SELECT s.*, u.name AS seller_name, u.email AS seller_email FROM sales s LEFT JOIN users u ON u.id = s.user_id";
		const params = [];
		if (day) {
			sql += " WHERE DATE(s.created_at) = ?";
			params.push(day);
		}
		sql += " ORDER BY s.created_at DESC";
		const [rows] = await pool.query(sql, params);
		res.json(rows);
	} catch (err) {
		next(err);
	}
}

async function history(req, res, next) {
	try {
		const { from, to } = req.query;
		const where = [];
		const params = [];
		if (from) {
			where.push("DATE(s.created_at) >= ?");
			params.push(from);
		}
		if (to) {
			where.push("DATE(s.created_at) <= ?");
			params.push(to);
		}
		let sql = `SELECT 
				s.id AS sale_id,
				s.created_at,
				s.total AS sale_total,
				s.payment_method,
				u.name AS seller_name,
				u.email AS seller_email,
				p.name AS product_name,
				si.quantity,
				si.price,
				(si.quantity * si.price) AS line_total
			FROM sales s
			LEFT JOIN sale_items si ON si.sale_id = s.id
			LEFT JOIN products p ON p.id = si.product_id
			LEFT JOIN users u ON u.id = s.user_id`;
		if (where.length) sql += " WHERE " + where.join(" AND ");
		sql += " ORDER BY s.created_at DESC, s.id DESC, p.name ASC";
		const [rows] = await pool.query(sql, params);
		res.json(rows);
	} catch (err) {
		next(err);
	}
}

async function create(req, res, next) {
	const conn = await pool.getConnection();
	try {
		const { items, payment_method } = req.body;
		if (!Array.isArray(items) || !items.length) {
			conn.release();
			return res.status(400).json({ message: "Items requeridos" });
		}
		await conn.beginTransaction();
		let total = 0;
		const normalized = [];
		for (const it of items) {
			const productId = Number(it.product_id);
			const quantity = Number(it.quantity);
			if (
				!productId ||
				!Number.isFinite(productId) ||
				!Number.isFinite(quantity) ||
				quantity <= 0
			) {
				await conn.rollback();
				conn.release();
				return res.status(400).json({ message: "Item inválido" });
			}
			normalized.push({ product_id: productId, quantity });
		}
		const pm =
			payment_method === "cash" ||
			payment_method === "transfer" ||
			payment_method === "yape_plin" ||
			payment_method === "card" ||
			payment_method === "other"
				? payment_method
				: "cash";
		const [saleRes] = await conn.query(
			"INSERT INTO sales (total, payment_method, user_id) VALUES (?, ?, ?)",
			[total, pm, req.user?.id || null],
		);
		const saleId = saleRes.insertId;
		for (const it of normalized) {
			const [productRows] = await conn.query(
				"SELECT id, price, stock, status FROM products WHERE id = ? FOR UPDATE",
				[it.product_id],
			);
			if (!productRows.length) {
				await conn.rollback();
				conn.release();
				return res.status(400).json({
					message: `Producto no encontrado (${it.product_id})`,
				});
			}
			const p = productRows[0];
			if (p.status !== "active") {
				await conn.rollback();
				conn.release();
				return res
					.status(400)
					.json({ message: `Producto inactivo (${it.product_id})` });
			}
			const stock = Number(p.stock || 0);
			if (it.quantity > stock) {
				await conn.rollback();
				conn.release();
				return res
					.status(400)
					.json({ message: `Stock insuficiente para ${p.id}` });
			}
			const price = Number(p.price || 0);
			total += price * it.quantity;
			await conn.query(
				"INSERT INTO sale_items (sale_id, product_id, quantity, price) VALUES (?, ?, ?, ?)",
				[saleId, p.id, it.quantity, price],
			);
			await conn.query(
				"UPDATE products SET stock = stock - ? WHERE id = ?",
				[it.quantity, p.id],
			);
		}
		await conn.query("UPDATE sales SET total = ? WHERE id = ?", [
			total,
			saleId,
		]);
		await conn.commit();
		const [rows] = await conn.query(
			"SELECT s.*, u.name AS seller_name, u.email AS seller_email FROM sales s LEFT JOIN users u ON u.id = s.user_id WHERE s.id = ?",
			[saleId],
		);
		conn.release();
		res.status(201).json(rows[0]);
	} catch (err) {
		await conn.rollback();
		conn.release();
		next(err);
	}
}

module.exports = { list, history, create };
