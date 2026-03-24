const mysql = require("mysql2/promise");

const pool = mysql.createPool({
	host: process.env.DB_HOST || "localhost",
	user: process.env.DB_USER || "root",
	password: process.env.DB_PASSWORD || "",
	database: process.env.DB_NAME || "grass",
	waitForConnections: true,
	connectionLimit: 10,
	queueLimit: 0,
});

async function ensureSchema(conn) {
	const dbName = process.env.DB_NAME || "grass";
	async function hasTable(table) {
		const [rows] = await conn.query(
			`SELECT 1 AS ok FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? LIMIT 1`,
			[dbName, table],
		);
		return rows.length > 0;
	}

	async function hasColumn(table, column) {
		const [rows] = await conn.query(
			`SELECT 1 AS ok FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ? LIMIT 1`,
			[dbName, table, column],
		);
		return rows.length > 0;
	}

	async function hasConstraint(table, constraintName) {
		const [rows] = await conn.query(
			`SELECT 1 AS ok FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND CONSTRAINT_NAME = ? LIMIT 1`,
			[dbName, table, constraintName],
		);
		return rows.length > 0;
	}

	async function hasIndex(table, indexName) {
		const [rows] = await conn.query(
			`SELECT 1 AS ok FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND INDEX_NAME = ? LIMIT 1`,
			[dbName, table, indexName],
		);
		return rows.length > 0;
	}

	const hasUsers = await hasTable("users");
	if (!hasUsers) {
		await conn.query(`
			CREATE TABLE IF NOT EXISTS users (
				id INT AUTO_INCREMENT PRIMARY KEY,
				name VARCHAR(100) NOT NULL,
				email VARCHAR(150) NOT NULL UNIQUE,
				password_hash VARCHAR(255) NOT NULL,
				phone VARCHAR(20),
				created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
			)
		`);
	}

	const hasCourts = await hasTable("courts");
	if (!hasCourts) {
		await conn.query(`
			CREATE TABLE IF NOT EXISTS courts (
				id INT AUTO_INCREMENT PRIMARY KEY,
				name VARCHAR(100) NOT NULL UNIQUE,
				base_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
				day_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
				night_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
				open_time TIME NOT NULL DEFAULT '07:00:00',
				close_time TIME NOT NULL DEFAULT '22:00:00',
				status ENUM('active','inactive') NOT NULL DEFAULT 'active',
				created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
			)
		`);
	}
	if (hasCourts && !(await hasColumn("courts", "day_price"))) {
		await conn.query(
			`ALTER TABLE courts ADD COLUMN day_price DECIMAL(10,2) NOT NULL DEFAULT 0.00`,
		);
		try {
			await conn.query(`UPDATE courts SET day_price = base_price`);
		} catch (e) {}
	}
	if (hasCourts && !(await hasColumn("courts", "night_price"))) {
		await conn.query(
			`ALTER TABLE courts ADD COLUMN night_price DECIMAL(10,2) NOT NULL DEFAULT 0.00`,
		);
		try {
			await conn.query(
				`UPDATE courts SET night_price = COALESCE(NULLIF(day_price, 0), base_price)`,
			);
		} catch (e) {}
	}
	if (hasCourts && !(await hasColumn("courts", "open_time"))) {
		await conn.query(
			`ALTER TABLE courts ADD COLUMN open_time TIME NOT NULL DEFAULT '07:00:00'`,
		);
	}
	if (hasCourts && !(await hasColumn("courts", "close_time"))) {
		await conn.query(
			`ALTER TABLE courts ADD COLUMN close_time TIME NOT NULL DEFAULT '22:00:00'`,
		);
	}

	const hasReservations = await hasTable("reservations");
	if (!hasReservations) {
		await conn.query(`
			CREATE TABLE IF NOT EXISTS reservations (
				id INT AUTO_INCREMENT PRIMARY KEY,
				customer_name VARCHAR(120) NOT NULL,
				customer_phone VARCHAR(20),
				court_id INT NOT NULL,
				date DATE NOT NULL,
				start_time TIME NOT NULL,
				end_time TIME NOT NULL,
				price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
				deposit DECIMAL(10,2) NOT NULL DEFAULT 0.00,
				remaining DECIMAL(10,2) AS (price - deposit) STORED,
				payment_method ENUM('cash','transfer','yape_plin','card','other') NOT NULL DEFAULT 'cash',
				notes VARCHAR(255),
				status ENUM('pending','confirmed','cancelled') NOT NULL DEFAULT 'confirmed',
				created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				CONSTRAINT fk_reservation_court FOREIGN KEY (court_id) REFERENCES courts(id) ON DELETE CASCADE,
				CONSTRAINT chk_time_order CHECK (start_time < end_time),
				INDEX idx_reservations_court_date (court_id, date),
				INDEX idx_reservations_next (date, start_time)
			)
		`);
	}

	const hasProducts = await hasTable("products");
	if (!hasProducts) {
		await conn.query(`
			CREATE TABLE IF NOT EXISTS products (
				id INT AUTO_INCREMENT PRIMARY KEY,
				name VARCHAR(150) NOT NULL,
				price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
				stock INT NOT NULL DEFAULT 0,
				status ENUM('active','inactive') NOT NULL DEFAULT 'active',
				created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
			)
		`);
	}

	const hasSales = await hasTable("sales");
	if (!hasSales) {
		await conn.query(`
			CREATE TABLE IF NOT EXISTS sales (
				id INT AUTO_INCREMENT PRIMARY KEY,
				user_id INT,
				total DECIMAL(10,2) NOT NULL DEFAULT 0.00,
				payment_method ENUM('cash','transfer','yape_plin','card','other') NOT NULL DEFAULT 'cash',
				created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				INDEX idx_sales_created_at (created_at),
				INDEX idx_sales_user (user_id)
			)
		`);
	}

	const hasSaleItems = await hasTable("sale_items");
	if (!hasSaleItems) {
		await conn.query(`
			CREATE TABLE IF NOT EXISTS sale_items (
				id INT AUTO_INCREMENT PRIMARY KEY,
				sale_id INT NOT NULL,
				product_id INT NOT NULL,
				quantity INT NOT NULL,
				price DECIMAL(10,2) NOT NULL,
				INDEX idx_sale_items_sale (sale_id),
				INDEX idx_sale_items_product (product_id)
			)
		`);
	}

	if (hasSales && !(await hasColumn("sales", "payment_method"))) {
		await conn.query(
			`ALTER TABLE sales ADD COLUMN payment_method ENUM('cash','transfer','yape_plin','card','other') NOT NULL DEFAULT 'cash'`,
		);
	}
	if (hasSales && !(await hasColumn("sales", "user_id"))) {
		await conn.query(`ALTER TABLE sales ADD COLUMN user_id INT NULL`);
	}
	if (hasSales && !(await hasConstraint("sales", "fk_sales_user"))) {
		try {
			await conn.query(
				`ALTER TABLE sales ADD CONSTRAINT fk_sales_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL`,
			);
		} catch (e) {
			if (e && e.code !== "ER_DUP_KEYNAME" && e.code !== "ER_FK_DUP_NAME")
				throw e;
		}
	}

	if (hasReservations && !(await hasColumn("reservations", "deposit"))) {
		await conn.query(
			`ALTER TABLE reservations ADD COLUMN deposit DECIMAL(10,2) NOT NULL DEFAULT 0.00`,
		);
	}
	if (hasReservations && !(await hasColumn("reservations", "remaining"))) {
		try {
			await conn.query(
				`ALTER TABLE reservations ADD COLUMN remaining DECIMAL(10,2) AS (price - deposit) STORED`,
			);
		} catch (e) {}
	}
	if (
		hasReservations &&
		!(await hasColumn("reservations", "payment_method"))
	) {
		await conn.query(
			`ALTER TABLE reservations ADD COLUMN payment_method ENUM('cash','transfer','yape_plin','card','other') NOT NULL DEFAULT 'cash'`,
		);
	}
	if (
		hasReservations &&
		(await hasColumn("reservations", "payment_method"))
	) {
		try {
			await conn.query(
				`ALTER TABLE reservations MODIFY COLUMN payment_method ENUM('cash','transfer','yape_plin','card','other') NOT NULL DEFAULT 'cash'`,
			);
		} catch (e) {}
	}
	if (hasSales && (await hasColumn("sales", "payment_method"))) {
		try {
			await conn.query(
				`ALTER TABLE sales MODIFY COLUMN payment_method ENUM('cash','transfer','yape_plin','card','other') NOT NULL DEFAULT 'cash'`,
			);
		} catch (e) {}
	}
	if (hasReservations && !(await hasColumn("reservations", "status"))) {
		await conn.query(
			`ALTER TABLE reservations ADD COLUMN status ENUM('pending','confirmed','cancelled') NOT NULL DEFAULT 'confirmed'`,
		);
	}

	if (hasSales && !(await hasIndex("sales", "idx_sales_created_at"))) {
		try {
			await conn.query(
				`CREATE INDEX idx_sales_created_at ON sales (created_at)`,
			);
		} catch (e) {}
	}
	if (hasSales && !(await hasIndex("sales", "idx_sales_user"))) {
		try {
			await conn.query(`CREATE INDEX idx_sales_user ON sales (user_id)`);
		} catch (e) {}
	}

	if (
		hasSaleItems &&
		!(await hasIndex("sale_items", "idx_sale_items_sale"))
	) {
		try {
			await conn.query(
				`CREATE INDEX idx_sale_items_sale ON sale_items (sale_id)`,
			);
		} catch (e) {}
	}
	if (
		hasSaleItems &&
		!(await hasIndex("sale_items", "idx_sale_items_product"))
	) {
		try {
			await conn.query(
				`CREATE INDEX idx_sale_items_product ON sale_items (product_id)`,
			);
		} catch (e) {}
	}

	if (
		hasSaleItems &&
		!(await hasConstraint("sale_items", "fk_sale_item_sale"))
	) {
		try {
			await conn.query(
				`ALTER TABLE sale_items ADD CONSTRAINT fk_sale_item_sale FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE`,
			);
		} catch (e) {
			if (e && e.code !== "ER_DUP_KEYNAME" && e.code !== "ER_FK_DUP_NAME")
				throw e;
		}
	}
	if (
		hasSaleItems &&
		!(await hasConstraint("sale_items", "fk_sale_item_product"))
	) {
		try {
			await conn.query(
				`ALTER TABLE sale_items ADD CONSTRAINT fk_sale_item_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT`,
			);
		} catch (e) {
			if (e && e.code !== "ER_DUP_KEYNAME" && e.code !== "ER_FK_DUP_NAME")
				throw e;
		}
	}

	try {
		await conn.query(
			`CREATE VIEW IF NOT EXISTS v_daily_income AS SELECT DATE(created_at) AS day, SUM(total) AS income FROM sales GROUP BY DATE(created_at)`,
		);
	} catch (e) {}
}

async function testConnection() {
	try {
		const conn = await pool.getConnection();
		await conn.ping();
		await ensureSchema(conn);
		conn.release();
	} catch (e) {
		if (e && e.code === "ER_BAD_DB_ERROR") {
			const conn = await mysql.createConnection({
				host: process.env.DB_HOST || "localhost",
				user: process.env.DB_USER || "root",
				password: process.env.DB_PASSWORD || "",
			});
			await conn.query(
				`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME || "grass"}`,
			);
			await conn.end();
			const conn2 = await pool.getConnection();
			await ensureSchema(conn2);
			conn2.release();
		} else {
			throw e;
		}
	}
}

module.exports = { pool, testConnection };
