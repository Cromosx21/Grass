import React, { useEffect, useState } from "react";
import {
	listCourts,
	listReservations,
	listReservationsHistory,
	updateReservation,
	listSales,
	listSalesHistory,
} from "../services/api";

const fmtDateShortPE = new Intl.DateTimeFormat("es-PE", {
	timeZone: "America/Lima",
	day: "2-digit",
	month: "2-digit",
	year: "2-digit",
});

const fmtTimeShortPE = new Intl.DateTimeFormat("es-PE", {
	timeZone: "America/Lima",
	hour: "2-digit",
	minute: "2-digit",
	hour12: false,
});

const fmtMoney = new Intl.NumberFormat("es-PE", {
	style: "currency",
	currency: "PEN",
	minimumFractionDigits: 2,
	maximumFractionDigits: 2,
});

function money(v) {
	return fmtMoney.format(Number(v || 0));
}

function paymentMethodLabel(v) {
	switch (String(v || "")) {
		case "cash":
			return "Efectivo";
		case "transfer":
			return "Transferencia";
		case "yape_plin":
			return "Yape o Plin";
		case "card":
			return "Pago con tarjeta";
		default:
			return String(v || "-");
	}
}

function toDateShortPE(ymd) {
	const s = String(ymd || "");
	if (!s || s.length < 10) return "-";
	const dt = new Date(`${s.slice(0, 10)}T00:00:00-05:00`);
	if (Number.isNaN(dt.getTime())) return s.slice(0, 10);
	return fmtDateShortPE.format(dt);
}

function formatTime(t) {
	return String(t || "").slice(0, 5);
}

function formatDate(d) {
	const m = String(d.getMonth() + 1).padStart(2, "0");
	const day = String(d.getDate()).padStart(2, "0");
	return `${d.getFullYear()}-${m}-${day}`;
}

function addDays(ymd, deltaDays) {
	const d = new Date(`${ymd}T12:00:00`);
	if (Number.isNaN(d.getTime())) return ymd;
	d.setDate(d.getDate() + deltaDays);
	return formatDate(d);
}

function datesBetween(from, to) {
	const start = new Date(`${from}T00:00:00`);
	const end = new Date(`${to}T00:00:00`);
	if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return [];
	const out = [];
	for (
		let d = start;
		d <= end;
		d = new Date(d.getTime() + 24 * 60 * 60 * 1000)
	) {
		out.push(formatDate(d));
		if (out.length > 60) break;
	}
	return out;
}

export default function History() {
	const [from, setFrom] = useState(
		formatDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)),
	);
	const [to, setTo] = useState(formatDate(new Date()));
	const [courts, setCourts] = useState([]);
	const [courtId, setCourtId] = useState("");
	const [rows, setRows] = useState([]);
	const [sales, setSales] = useState([]);
	const [tab, setTab] = useState("reservas");
	const [loading, setLoading] = useState(false);
	const [payOpen, setPayOpen] = useState(false);
	const [paySaving, setPaySaving] = useState(false);
	const [payError, setPayError] = useState("");
	const [payReservation, setPayReservation] = useState(null);
	const [payDeposit, setPayDeposit] = useState("");
	const [payMethod, setPayMethod] = useState("cash");

	async function refresh(opts = {}) {
		const fromValue = opts.from ?? from;
		const toValue = opts.to ?? to;
		const courtIdValue = opts.courtId ?? courtId;
		const tabValue = opts.tab ?? tab;
		setLoading(true);
		try {
			if (tabValue === "reservas") {
				try {
					const data = await listReservationsHistory({
						from: fromValue,
						to: toValue,
						court_id: courtIdValue || undefined,
					});
					setRows(data);
				} catch (e) {
					if (e?.response?.status !== 404) throw e;
					const days = datesBetween(fromValue, toValue);
					const chunks = await Promise.all(
						days.map((day) =>
							listReservations({
								date: day,
								court_id: courtIdValue || undefined,
							}),
						),
					);
					const merged = chunks.flat();
					merged.sort((a, b) => {
						const da = String(a.date || "");
						const db = String(b.date || "");
						if (da !== db) return db.localeCompare(da);
						return String(b.start_time || "").localeCompare(
							String(a.start_time || ""),
						);
					});
					setRows(merged);
				}
			} else {
				try {
					const data = await listSalesHistory({
						from: fromValue,
						to: toValue,
					});
					setSales(data);
				} catch (e) {
					if (e?.response?.status !== 404) throw e;
					const days = datesBetween(fromValue, toValue);
					const chunks = await Promise.all(
						days.map((day) => listSales({ day })),
					);
					const merged = chunks.flat();
					merged.sort((a, b) =>
						String(b.created_at || "").localeCompare(
							String(a.created_at || ""),
						),
					);
					setSales(merged);
				}
			}
		} finally {
			setLoading(false);
		}
	}

	useEffect(() => {
		refresh();
	}, []);

	useEffect(() => {
		refresh();
	}, [tab]);

	useEffect(() => {
		listCourts()
			.then((cs) => setCourts(cs))
			.catch(() => setCourts([]));
	}, []);

	function openPay(reservation) {
		setPayReservation(reservation);
		setPayDeposit(
			String(reservation?.price != null ? Number(reservation.price) : ""),
		);
		setPayMethod(String(reservation?.payment_method || "cash"));
		setPayError("");
		setPayOpen(true);
	}

	function closePay() {
		setPayOpen(false);
		setPayReservation(null);
		setPayDeposit("");
		setPayMethod("cash");
		setPayError("");
	}

	async function savePay() {
		if (!payReservation) return;
		setPayError("");
		const priceN = Number(payReservation.price || 0);
		const nextDeposit = Math.max(0, Number(payDeposit || 0));
		if (!Number.isFinite(nextDeposit)) {
			setPayError("Monto inválido");
			return;
		}
		if (nextDeposit > priceN) {
			setPayError("El adelanto no puede ser mayor al total");
			return;
		}
		setPaySaving(true);
		try {
			const updated = await updateReservation(payReservation.id, {
				deposit: nextDeposit,
				payment_method: payMethod,
			});
			setRows((prev) =>
				prev.map((r) => (r.id === updated.id ? updated : r)),
			);
			closePay();
			await refresh();
		} catch (e) {
			setPayError(
				e?.response?.data?.message || "No se pudo actualizar el pago",
			);
		} finally {
			setPaySaving(false);
		}
	}

	const visibleReservationRows = courtId
		? rows.filter((r) => String(r.court_id) === String(courtId))
		: rows;
	const reservationTotals = visibleReservationRows.reduce(
		(acc, r) => {
			const total = Number(r.price || 0);
			const paid = Number(r.deposit || 0);
			const remaining =
				r.remaining != null ? Number(r.remaining) : total - paid;
			return {
				total: acc.total + total,
				paid: acc.paid + paid,
				remaining: acc.remaining + remaining,
			};
		},
		{ total: 0, paid: 0, remaining: 0 },
	);

	return (
		<div>
			<div className="flex items-center gap-2 mb-4">
				<button
					className={
						tab === "reservas"
							? "px-3 py-2 rounded bg-blue-600 text-white"
							: "px-3 py-2 rounded border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
					}
					onClick={() => {
						setTab("reservas");
						setSales([]);
					}}
				>
					Reservas
				</button>
				<button
					className={
						tab === "ventas"
							? "px-3 py-2 rounded bg-blue-600 text-white"
							: "px-3 py-2 rounded border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
					}
					onClick={() => {
						setTab("ventas");
						setRows([]);
					}}
				>
					Ventas
				</button>
			</div>
			<div className="flex flex-col md:flex-row md:items-end gap-4 mb-6">
				<div>
					<label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
						Desde
					</label>
					<input
						type="date"
						className="border border-gray-300 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 rounded p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
						value={from}
						onChange={(e) => setFrom(e.target.value)}
					/>
				</div>
				<div>
					<label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
						Hasta
					</label>
					<input
						type="date"
						className="border border-gray-300 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 rounded p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
						value={to}
						onChange={(e) => setTo(e.target.value)}
					/>
				</div>
				<div className="flex items-center gap-2 h-[42px]">
					<button
						type="button"
						className="px-3 py-2 rounded border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
						onClick={() => {
							const nextFrom = addDays(from, -1);
							const nextTo = addDays(to, -1);
							setFrom(nextFrom);
							setTo(nextTo);
							refresh({ from: nextFrom, to: nextTo });
						}}
					>
						Anterior
					</button>
					<button
						type="button"
						className="px-3 py-2 rounded border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
						onClick={() => {
							const today = formatDate(new Date());
							setFrom(today);
							setTo(today);
							refresh({ from: today, to: today });
						}}
					>
						Hoy
					</button>
					<button
						type="button"
						className="px-3 py-2 rounded border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
						onClick={() => {
							const nextFrom = addDays(from, 1);
							const nextTo = addDays(to, 1);
							setFrom(nextFrom);
							setTo(nextTo);
							refresh({ from: nextFrom, to: nextTo });
						}}
					>
						Siguiente
					</button>
				</div>
				{tab === "reservas" ? (
					<div className="w-full sm:w-64">
						<label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
							Cancha
						</label>
						<select
							className="border border-gray-300 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 rounded p-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
							value={courtId}
							onChange={(e) => {
								const next = e.target.value;
								setCourtId(next);
								refresh({ courtId: next });
							}}
						>
							<option value="">Todas</option>
							{courts.map((c) => (
								<option key={c.id} value={c.id}>
									{c.name}
								</option>
							))}
						</select>
					</div>
				) : (
					<div className="flex-1" />
				)}
				<button
					className="bg-blue-600 hover:bg-blue-700 transition text-white px-4 py-2 rounded h-[42px]"
					onClick={refresh}
				>
					Filtrar
				</button>
			</div>

			{tab === "reservas" ? (
				<div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 overflow-x-auto">
					<table className="min-w-full text-sm">
						<thead className="bg-gray-50 dark:bg-gray-950 text-gray-600 dark:text-gray-300">
							<tr>
								<th className="text-left font-medium px-4 py-3">
									Fecha
								</th>
								<th className="text-left font-medium px-4 py-3">
									Hora
								</th>
								<th className="text-left font-medium px-4 py-3">
									Cancha
								</th>
								<th className="text-left font-medium px-4 py-3">
									Cliente
								</th>
								<th className="text-right font-medium px-4 py-3">
									Total
								</th>
								<th className="text-right font-medium px-4 py-3">
									Pagado
								</th>
								<th className="text-right font-medium px-4 py-3">
									Saldo
								</th>
								<th className="text-left font-medium px-4 py-3">
									Medio
								</th>
								<th className="text-right font-medium px-4 py-3">
									Acciones
								</th>
							</tr>
						</thead>
						<tbody>
							{loading ? (
								<tr>
									<td
										className="px-4 py-4 text-gray-600"
										colSpan={9}
									>
										Cargando...
									</td>
								</tr>
							) : visibleReservationRows.length ? (
								visibleReservationRows.map((r) => {
									const remaining = Number(
										r.remaining != null
											? r.remaining
											: Number(r.price || 0) -
													Number(r.deposit || 0),
									);
									const canPay = remaining > 0.00001;
									return (
										<tr
											key={r.id}
											className="border-t border-gray-100 odd:bg-gray-50 dark:odd:bg-gray-950/40 hover:bg-gray-50 dark:hover:bg-gray-800/40"
										>
											<td className="px-4 py-3 whitespace-nowrap">
												{toDateShortPE(r.date)}
											</td>
											<td className="px-4 py-3 whitespace-nowrap">
												{formatTime(r.start_time)} -{" "}
												{formatTime(r.end_time)}
											</td>
											<td className="px-4 py-3 whitespace-nowrap">
												{r.court_name || r.court_id}
											</td>
											<td className="px-4 py-3 whitespace-nowrap">
												{r.customer_name}
											</td>
											<td className="px-4 py-3 text-right whitespace-nowrap">
												{money(r.price)}
											</td>
											<td className="px-4 py-3 text-right whitespace-nowrap">
												{money(r.deposit)}
											</td>
											<td className="px-4 py-3 text-right whitespace-nowrap">
												{money(Math.max(0, remaining))}
											</td>
											<td className="px-4 py-3 whitespace-nowrap">
												{paymentMethodLabel(
													r.payment_method,
												)}
											</td>
											<td className="px-4 py-3 text-right whitespace-nowrap">
												{canPay ? (
													<button
														type="button"
														className="px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-700 transition text-white"
														onClick={() =>
															openPay(r)
														}
													>
														Completar pago
													</button>
												) : (
													<span className="text-xs text-gray-600 dark:text-gray-300">
														Pagado
													</span>
												)}
											</td>
										</tr>
									);
								})
							) : (
								<tr>
									<td
										className="px-4 py-4 text-gray-600"
										colSpan={9}
									>
										Sin resultados
									</td>
								</tr>
							)}
						</tbody>
						{!loading && visibleReservationRows.length ? (
							<tfoot>
								<tr className="bg-gray-50 dark:bg-gray-950 text-gray-700 dark:text-gray-200 border-t border-gray-200 dark:border-gray-800">
									<td
										className="px-4 py-3 font-medium"
										colSpan={4}
									>
										Total ingreso
									</td>
									<td className="px-4 py-3 text-right font-semibold whitespace-nowrap">
										{money(reservationTotals.total)}
									</td>
									<td className="px-4 py-3 text-right font-semibold whitespace-nowrap">
										{money(reservationTotals.paid)}
									</td>
									<td className="px-4 py-3 text-right font-semibold whitespace-nowrap">
										{money(reservationTotals.remaining)}
									</td>
									<td className="px-4 py-3" colSpan={2} />
								</tr>
							</tfoot>
						) : null}
					</table>
				</div>
			) : (
				<div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 overflow-x-auto">
					<table className="min-w-full text-sm">
						<thead className="bg-gray-50 dark:bg-gray-950 text-gray-600 dark:text-gray-300">
							<tr>
								<th className="text-left font-medium px-4 py-3">
									Fecha
								</th>
								<th className="text-left font-medium px-4 py-3">
									Hora
								</th>
								<th className="text-left font-medium px-4 py-3">
									Producto
								</th>
								<th className="text-right font-medium px-4 py-3">
									Cant.
								</th>
								<th className="text-right font-medium px-4 py-3">
									Total
								</th>
								<th className="text-left font-medium px-4 py-3">
									Medio
								</th>
								<th className="text-left font-medium px-4 py-3">
									Vendedor
								</th>
							</tr>
						</thead>
						<tbody>
							{loading ? (
								<tr>
									<td
										className="px-4 py-4 text-gray-600"
										colSpan={7}
									>
										Cargando...
									</td>
								</tr>
							) : sales.length ? (
								sales.map((s) => {
									const saleId = s.sale_id ?? s.id;
									const created = s.created_at
										? new Date(s.created_at)
										: null;
									const date =
										created &&
										!Number.isNaN(created.getTime())
											? fmtDateShortPE.format(created)
											: "-";
									const time =
										created &&
										!Number.isNaN(created.getTime())
											? fmtTimeShortPE.format(created)
											: "-";
									return (
										<tr
											key={`${saleId}-${s.product_name || ""}-${s.quantity || ""}-${String(s.price || "")}`}
											className="border-t border-gray-100 odd:bg-gray-50 dark:odd:bg-gray-950/40 hover:bg-gray-50 dark:hover:bg-gray-800/40"
										>
											<td className="px-4 py-3 whitespace-nowrap">
												{date}
											</td>
											<td className="px-4 py-3 whitespace-nowrap">
												{time}
											</td>
											<td className="px-4 py-3 whitespace-nowrap">
												{s.product_name || "-"}
											</td>
											<td className="px-4 py-3 text-right whitespace-nowrap">
												{Number(s.quantity || 0)}
											</td>
											<td className="px-4 py-3 text-right whitespace-nowrap">
												{money(
													Number(
														s.line_total != null
															? s.line_total
															: Number(
																	s.price ||
																		0,
																) *
																	Number(
																		s.quantity ||
																			0,
																	),
													),
												)}
											</td>
											<td className="px-4 py-3 whitespace-nowrap">
												{paymentMethodLabel(
													s.payment_method,
												)}
											</td>
											<td className="px-4 py-3 whitespace-nowrap">
												{s.seller_name ||
													s.seller_email ||
													"-"}
											</td>
										</tr>
									);
								})
							) : (
								<tr>
									<td
										className="px-4 py-4 text-gray-600"
										colSpan={7}
									>
										Sin resultados
									</td>
								</tr>
							)}
						</tbody>
					</table>
				</div>
			)}

			{payOpen && payReservation ? (
				<div className="fixed inset-0 bg-black/50 flex items-center justify-center px-4">
					<div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm p-5">
						<div className="flex items-start justify-between gap-3">
							<div>
								<div className="text-lg font-semibold">
									Completar pago
								</div>
								<div className="text-sm text-gray-600 dark:text-gray-300">
									{payReservation.customer_name} ·{" "}
									{toDateShortPE(payReservation.date)} ·{" "}
									{formatTime(payReservation.start_time)}-
									{formatTime(payReservation.end_time)}
								</div>
							</div>
							<button
								type="button"
								onClick={closePay}
								className="px-2 py-1 rounded hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300"
							>
								Cerrar
							</button>
						</div>

						{payError ? (
							<div className="mt-3 text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded p-2">
								{payError}
							</div>
						) : null}

						<div className="mt-4 grid grid-cols-3 gap-2">
							<div className="bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded p-2">
								<div className="text-xs text-gray-600 dark:text-gray-300">
									Total
								</div>
								<div className="font-semibold">
									{money(payReservation.price)}
								</div>
							</div>
							<div className="bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded p-2">
								<div className="text-xs text-gray-600 dark:text-gray-300">
									Pagado
								</div>
								<div className="font-semibold">
									{money(payReservation.deposit)}
								</div>
							</div>
							<div className="bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded p-2">
								<div className="text-xs text-gray-600 dark:text-gray-300">
									Saldo
								</div>
								<div className="font-semibold">
									{money(
										Math.max(
											0,
											Number(payReservation.price || 0) -
												Number(
													payReservation.deposit || 0,
												),
										),
									)}
								</div>
							</div>
						</div>

						<div className="mt-4">
							<label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
								Nuevo pagado (total acumulado)
							</label>
							<input
								type="number"
								step="0.01"
								min="0"
								className="border border-gray-300 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 rounded w-full p-2 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
								value={payDeposit}
								onChange={(e) => setPayDeposit(e.target.value)}
							/>
							<div className="mt-2 flex items-center gap-2">
								<button
									type="button"
									className="px-3 py-1.5 rounded border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
									onClick={() =>
										setPayDeposit(
											String(
												Number(
													payReservation.price || 0,
												),
											),
										)
									}
								>
									Pagar todo
								</button>
								<button
									type="button"
									className="px-3 py-1.5 rounded border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
									onClick={() =>
										setPayDeposit(
											String(
												Number(
													payReservation.deposit || 0,
												),
											),
										)
									}
								>
									Revertir
								</button>
							</div>
						</div>

						<div className="mt-4">
							<label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
								Medio de pago
							</label>
							<select
								className="border border-gray-300 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 rounded w-full p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
								value={payMethod}
								onChange={(e) => setPayMethod(e.target.value)}
							>
								<option value="cash">Efectivo</option>
								<option value="transfer">Transferencia</option>
								<option value="yape_plin">Yape o Plin</option>
								<option value="card">Pago con tarjeta</option>
							</select>
						</div>

						<div className="mt-5 flex justify-end gap-2">
							<button
								type="button"
								onClick={closePay}
								className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded hover:bg-gray-50 dark:hover:bg-gray-800"
								disabled={paySaving}
							>
								Cancelar
							</button>
							<button
								type="button"
								onClick={savePay}
								className="px-3 py-2 bg-blue-600 hover:bg-blue-700 transition text-white rounded disabled:opacity-50"
								disabled={paySaving}
							>
								{paySaving ? "Guardando..." : "Guardar"}
							</button>
						</div>
					</div>
				</div>
			) : null}
		</div>
	);
}
