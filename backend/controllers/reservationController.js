const { pool } = require("../config/db");

function parseAmount(v) {
	if (v == null) return null;
	if (typeof v === "number") return Number.isFinite(v) ? v : null;
	if (typeof v !== "string") return null;
	const cleaned = String(v).trim().replace(/\s+/g, "").replace(",", ".");
	if (!cleaned) return null;
	const n = Number(cleaned);
	return Number.isFinite(n) ? n : null;
}

async function list(req, res, next) {
	try {
		const { date, court_id } = req.query;
		let sql =
			"SELECT r.*, c.name AS court_name, (r.price - r.deposit) AS remaining FROM reservations r JOIN courts c ON c.id = r.court_id";
		const params = [];
		const where = [];
		if (date) {
			where.push("r.date = ?");
			params.push(date);
		}
		if (court_id) {
			where.push("r.court_id = ?");
			params.push(court_id);
		}
		if (where.length) sql += " WHERE " + where.join(" AND ");
		sql += " ORDER BY r.date DESC, r.start_time ASC";
		const [rows] = await pool.query(sql, params);
		res.json(rows);
	} catch (err) {
		next(err);
	}
}

async function history(req, res, next) {
	try {
		const { from, to, q, court_id } = req.query;
		const where = [];
		const params = [];
		if (from) {
			where.push("r.date >= ?");
			params.push(from);
		}
		if (to) {
			where.push("r.date <= ?");
			params.push(to);
		}
		if (court_id) {
			where.push("r.court_id = ?");
			params.push(court_id);
		}
		if (q) {
			where.push("(r.customer_name LIKE ? OR r.customer_phone LIKE ?)");
			params.push(`%${q}%`, `%${q}%`);
		}
		let sql =
			"SELECT r.*, c.name AS court_name, (r.price - r.deposit) AS remaining FROM reservations r JOIN courts c ON c.id = r.court_id";
		if (where.length) sql += " WHERE " + where.join(" AND ");
		sql += " ORDER BY r.date DESC, r.start_time DESC";
		const [rows] = await pool.query(sql, params);
		res.json(rows);
	} catch (err) {
		next(err);
	}
}

async function create(req, res, next) {
	try {
		const {
			customer_name,
			customer_phone,
			court_id,
			date,
			start_time,
			end_time,
			price,
			deposit,
			payment_method,
			notes,
			status,
		} = req.body;
		if (!customer_name || !court_id || !date || !start_time || !end_time)
			return res.status(400).json({ message: "Datos inválidos" });
		const [conflictRows] = await pool.query(
			'SELECT id FROM reservations WHERE court_id = ? AND date = ? AND (status IS NULL OR status <> "cancelled") AND start_time < ? AND end_time > ? LIMIT 1',
			[court_id, date, end_time, start_time],
		);
		if (conflictRows.length)
			return res.status(409).json({ message: "Cruce de horarios" });
		const priceParsed = parseAmount(price);
		if (price != null && priceParsed == null)
			return res.status(400).json({ message: "Precio inválido" });
		const depositParsed = parseAmount(deposit);
		if (deposit != null && depositParsed == null)
			return res.status(400).json({ message: "Adelanto inválido" });
		const priceN = priceParsed != null ? priceParsed : 0;
		const depositN = Math.max(0, depositParsed != null ? depositParsed : 0);
		if (depositN > priceN)
			return res
				.status(400)
				.json({ message: "El adelanto no puede ser mayor al precio" });
		const pm =
			payment_method === "cash" ||
			payment_method === "transfer" ||
			payment_method === "yape_plin" ||
			payment_method === "card" ||
			payment_method === "other"
				? payment_method
				: "cash";
		const [result] = await pool.query(
			"INSERT INTO reservations (customer_name, customer_phone, court_id, date, start_time, end_time, price, deposit, payment_method, notes, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
			[
				customer_name,
				customer_phone || null,
				court_id,
				date,
				start_time,
				end_time,
				priceN,
				depositN,
				pm,
				notes || null,
				status || "confirmed",
			],
		);
		const [rows] = await pool.query(
			"SELECT r.*, c.name AS court_name, (r.price - r.deposit) AS remaining FROM reservations r JOIN courts c ON c.id = r.court_id WHERE r.id = ?",
			[result.insertId],
		);
		res.status(201).json(rows[0]);
	} catch (err) {
		next(err);
	}
}

async function update(req, res, next) {
	try {
		const { id } = req.params;
		const {
			customer_name,
			customer_phone,
			court_id,
			date,
			start_time,
			end_time,
			price,
			deposit,
			payment_method,
			notes,
			status,
		} = req.body;
		const priceParsed = parseAmount(price);
		if (price != null && priceParsed == null)
			return res.status(400).json({ message: "Precio inválido" });
		const depositParsed = parseAmount(deposit);
		if (deposit != null && depositParsed == null)
			return res.status(400).json({ message: "Adelanto inválido" });
		if (start_time && end_time && court_id && date) {
			const [conflictRows] = await pool.query(
				'SELECT id FROM reservations WHERE court_id = ? AND date = ? AND id <> ? AND (status IS NULL OR status <> "cancelled") AND start_time < ? AND end_time > ? LIMIT 1',
				[court_id, date, id, end_time, start_time],
			);
			if (conflictRows.length)
				return res.status(409).json({ message: "Cruce de horarios" });
		}
		if (price != null || deposit != null) {
			const [currentRows] = await pool.query(
				"SELECT price, deposit FROM reservations WHERE id = ?",
				[id],
			);
			if (!currentRows.length)
				return res.status(404).json({ message: "No encontrado" });
			const priceN =
				priceParsed != null
					? priceParsed
					: Number(currentRows[0].price);
			const depositN =
				depositParsed != null
					? Math.max(0, depositParsed)
					: Number(currentRows[0].deposit);
			if (depositN > priceN)
				return res.status(400).json({
					message: "El adelanto no puede ser mayor al precio",
				});
		}
		const [result] = await pool.query(
			"UPDATE reservations SET customer_name = COALESCE(?, customer_name), customer_phone = COALESCE(?, customer_phone), court_id = COALESCE(?, court_id), date = COALESCE(?, date), start_time = COALESCE(?, start_time), end_time = COALESCE(?, end_time), price = COALESCE(?, price), deposit = COALESCE(?, deposit), payment_method = COALESCE(?, payment_method), notes = COALESCE(?, notes), status = COALESCE(?, status) WHERE id = ?",
			[
				customer_name || null,
				customer_phone || null,
				court_id || null,
				date || null,
				start_time || null,
				end_time || null,
				priceParsed != null ? priceParsed : null,
				depositParsed != null ? Math.max(0, depositParsed) : null,
				payment_method === "cash" ||
				payment_method === "transfer" ||
				payment_method === "yape_plin" ||
				payment_method === "card" ||
				payment_method === "other"
					? payment_method
					: payment_method != null
						? "cash"
						: null,
				notes || null,
				status || null,
				id,
			],
		);
		if (!result.affectedRows)
			return res.status(404).json({ message: "No encontrado" });
		const [rows] = await pool.query(
			"SELECT r.*, c.name AS court_name, (r.price - r.deposit) AS remaining FROM reservations r JOIN courts c ON c.id = r.court_id WHERE r.id = ?",
			[id],
		);
		res.json(rows[0]);
	} catch (err) {
		next(err);
	}
}

async function remove(req, res, next) {
	try {
		const { id } = req.params;
		const [result] = await pool.query(
			"DELETE FROM reservations WHERE id = ?",
			[id],
		);
		if (!result.affectedRows)
			return res.status(404).json({ message: "No encontrado" });
		res.json({ success: true });
	} catch (err) {
		next(err);
	}
}

module.exports = { list, history, create, update, remove };
