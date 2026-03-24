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

function parseTime(v) {
	if (v == null) return null;
	if (typeof v !== "string") return null;
	const s = String(v).trim();
	if (!s) return null;
	const ok = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(s);
	return ok ? s : null;
}

async function list(req, res, next) {
	try {
		const [rows] = await pool.query("SELECT * FROM courts ORDER BY name");
		res.json(rows);
	} catch (err) {
		next(err);
	}
}

async function publicList(req, res, next) {
	try {
		const [rows] = await pool.query(
			"SELECT id, name, open_time, close_time FROM courts WHERE status <> 'inactive' ORDER BY name",
		);
		res.json(rows);
	} catch (err) {
		next(err);
	}
}

async function create(req, res, next) {
	try {
		const {
			name,
			base_price,
			day_price,
			night_price,
			open_time,
			close_time,
			status,
		} = req.body;
		if (!name) return res.status(400).json({ message: "Nombre requerido" });
		const baseParsed = parseAmount(base_price);
		if (base_price != null && baseParsed == null)
			return res.status(400).json({ message: "Precio inválido" });
		const dayParsed = parseAmount(day_price);
		if (day_price != null && dayParsed == null)
			return res.status(400).json({ message: "Precio día inválido" });
		const nightParsed = parseAmount(night_price);
		if (night_price != null && nightParsed == null)
			return res.status(400).json({ message: "Precio noche inválido" });

		const openParsed = parseTime(open_time);
		if (open_time != null && openParsed == null)
			return res
				.status(400)
				.json({ message: "Horario de apertura inválido" });
		const closeParsed = parseTime(close_time);
		if (close_time != null && closeParsed == null)
			return res
				.status(400)
				.json({ message: "Horario de cierre inválido" });
		if (openParsed && closeParsed && closeParsed <= openParsed)
			return res
				.status(400)
				.json({ message: "El cierre debe ser después de la apertura" });

		const day =
			dayParsed != null ? dayParsed : baseParsed != null ? baseParsed : 0;
		const night = nightParsed != null ? nightParsed : day;
		const price = day;
		const st = status || "active";
		const [result] = await pool.query(
			"INSERT INTO courts (name, base_price, day_price, night_price, open_time, close_time, status) VALUES (?, ?, ?, ?, COALESCE(?, '07:00:00'), COALESCE(?, '22:00:00'), ?)",
			[name, price, day, night, openParsed, closeParsed, st],
		);
		const [rows] = await pool.query("SELECT * FROM courts WHERE id = ?", [
			result.insertId,
		]);
		res.status(201).json(rows[0]);
	} catch (err) {
		next(err);
	}
}

async function update(req, res, next) {
	try {
		const { id } = req.params;
		const {
			name,
			base_price,
			day_price,
			night_price,
			open_time,
			close_time,
			status,
		} = req.body;

		const baseParsed = parseAmount(base_price);
		if (base_price != null && baseParsed == null)
			return res.status(400).json({ message: "Precio inválido" });
		const dayParsed = parseAmount(day_price);
		if (day_price != null && dayParsed == null)
			return res.status(400).json({ message: "Precio día inválido" });
		const nightParsed = parseAmount(night_price);
		if (night_price != null && nightParsed == null)
			return res.status(400).json({ message: "Precio noche inválido" });

		const openParsed = parseTime(open_time);
		if (open_time != null && openParsed == null)
			return res
				.status(400)
				.json({ message: "Horario de apertura inválido" });
		const closeParsed = parseTime(close_time);
		if (close_time != null && closeParsed == null)
			return res
				.status(400)
				.json({ message: "Horario de cierre inválido" });
		if (openParsed && closeParsed && closeParsed <= openParsed)
			return res
				.status(400)
				.json({ message: "El cierre debe ser después de la apertura" });

		const dayUpdate = dayParsed != null ? dayParsed : null;
		const nightUpdate = nightParsed != null ? nightParsed : null;
		const baseUpdate =
			baseParsed != null
				? baseParsed
				: dayUpdate != null
					? dayUpdate
					: null;

		const [result] = await pool.query(
			"UPDATE courts SET name = COALESCE(?, name), base_price = COALESCE(?, base_price), day_price = COALESCE(?, day_price), night_price = COALESCE(?, night_price), open_time = COALESCE(?, open_time), close_time = COALESCE(?, close_time), status = COALESCE(?, status) WHERE id = ?",
			[
				name || null,
				baseUpdate,
				dayUpdate,
				nightUpdate,
				openParsed,
				closeParsed,
				status || null,
				id,
			],
		);
		if (!result.affectedRows)
			return res.status(404).json({ message: "No encontrado" });
		const [rows] = await pool.query("SELECT * FROM courts WHERE id = ?", [
			id,
		]);
		res.json(rows[0]);
	} catch (err) {
		next(err);
	}
}

async function remove(req, res, next) {
	try {
		const { id } = req.params;
		const [pendingRows] = await pool.query(
			"SELECT COUNT(*) AS cnt FROM reservations WHERE court_id = ? AND status <> 'cancelled' AND (date > CURDATE() OR (date = CURDATE() AND end_time > CURTIME()))",
			[id],
		);
		const pendingCount = Number(pendingRows?.[0]?.cnt || 0);
		if (pendingCount > 0) {
			return res.status(409).json({
				message:
					"No se puede eliminar la cancha porque tiene reservas pendientes.",
			});
		}
		const [result] = await pool.query("DELETE FROM courts WHERE id = ?", [
			id,
		]);
		if (!result.affectedRows)
			return res.status(404).json({ message: "No encontrado" });
		res.json({ success: true });
	} catch (err) {
		next(err);
	}
}

module.exports = { list, publicList, create, update, remove };
