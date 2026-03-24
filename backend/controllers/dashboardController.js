const { pool } = require("../config/db");

async function metrics(req, res, next) {
	try {
		const [incomeRows] = await pool.query(
			"SELECT COALESCE(SUM(total), 0) AS income FROM sales WHERE DATE(created_at) = CURDATE()",
		);
		const [reservationsAggRows] = await pool.query(
			'SELECT COUNT(*) AS count, COALESCE(SUM(price), 0) AS total, COALESCE(SUM(deposit), 0) AS deposit, COALESCE(SUM(price - deposit), 0) AS remaining FROM reservations WHERE date = CURDATE() AND status <> "cancelled"',
		);
		const [nextRows] = await pool.query(
			'SELECT r.*, c.name AS court_name, (r.price - r.deposit) AS remaining FROM reservations r JOIN courts c ON c.id = r.court_id WHERE r.date = CURDATE() AND r.status <> "cancelled" ORDER BY r.start_time ASC LIMIT 1',
		);
		res.json({
			income_today: incomeRows[0].income,
			reservations_today: reservationsAggRows[0].count,
			reservations_total_today: reservationsAggRows[0].total,
			reservations_deposit_today: reservationsAggRows[0].deposit,
			reservations_remaining_today: reservationsAggRows[0].remaining,
			next_reservation: nextRows[0] || null,
		});
	} catch (err) {
		next(err);
	}
}

module.exports = { metrics };
