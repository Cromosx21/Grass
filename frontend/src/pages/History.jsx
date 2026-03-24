import React, { useEffect, useState } from "react";
import {
	listCourts,
	listReservations,
	listReservationsHistory,
	updateReservation,
	listSales,
	listSalesHistory,
} from "../services/api";
import {
	LuCalendarDays,
	LuFilter,
	LuCircleCheck,
	LuClock,
	LuChevronLeft,
	LuChevronRight,
	LuMapPin,
	LuCalendar,
	LuDollarSign,
	LuCreditCard,
} from "react-icons/lu";

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
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
					Historial
				</h1>
				<p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
					Revisa el registro de reservas y ventas pasadas.
				</p>
			</div>

			<div className="flex bg-slate-100 dark:bg-slate-800/50 p-1 rounded-xl w-fit">
				<button
					className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
						tab === "reservas"
							? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm"
							: "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
					}`}
					onClick={() => {
						setTab("reservas");
						setSales([]);
					}}
				>
					<LuCalendarDays size={16} />
					Reservas
				</button>
				<button
					className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
						tab === "ventas"
							? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm"
							: "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
					}`}
					onClick={() => {
						setTab("ventas");
						setRows([]);
					}}
				>
					<LuDollarSign size={16} />
					Ventas
				</button>
			</div>

			<div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm rounded-xl p-4 sm:p-5 flex flex-wrap gap-4 items-end">
				<div>
					<label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
						Desde
					</label>
					<div className="relative">
						<LuCalendar
							className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
							size={16}
						/>
						<input
							type="date"
							className="pl-9 pr-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
							value={from}
							onChange={(e) => setFrom(e.target.value)}
						/>
					</div>
				</div>
				<div>
					<label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
						Hasta
					</label>
					<div className="relative">
						<LuCalendar
							className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
							size={16}
						/>
						<input
							type="date"
							className="pl-9 pr-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
							value={to}
							onChange={(e) => setTo(e.target.value)}
						/>
					</div>
				</div>
				<div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg h-[42px]">
					<button
						type="button"
						className="p-1.5 rounded-md text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 hover:shadow-sm transition-all"
						onClick={() => {
							const nextFrom = addDays(from, -1);
							const nextTo = addDays(to, -1);
							setFrom(nextFrom);
							setTo(nextTo);
							refresh({ from: nextFrom, to: nextTo });
						}}
						title="Anterior"
					>
						<LuChevronLeft size={16} />
					</button>
					<button
						type="button"
						className="px-3 py-1 rounded-md text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 hover:shadow-sm transition-all"
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
						className="p-1.5 rounded-md text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 hover:shadow-sm transition-all"
						onClick={() => {
							const nextFrom = addDays(from, 1);
							const nextTo = addDays(to, 1);
							setFrom(nextFrom);
							setTo(nextTo);
							refresh({ from: nextFrom, to: nextTo });
						}}
						title="Siguiente"
					>
						<LuChevronRight size={16} />
					</button>
				</div>
				{tab === "reservas" ? (
					<div className="flex-1 min-w-[200px] max-w-[300px]">
						<label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
							Cancha
						</label>
						<div className="relative">
							<LuMapPin
								className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
								size={16}
							/>
							<select
								className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors appearance-none"
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
					</div>
				) : (
					<div className="flex-1" />
				)}
				<button
					className="bg-slate-800 dark:bg-slate-100 hover:bg-slate-900 dark:hover:bg-white transition-colors text-white dark:text-slate-900 px-4 py-2 rounded-lg font-medium h-[42px] flex items-center gap-2"
					onClick={refresh}
				>
					<LuFilter size={16} />
					Filtrar
				</button>
			</div>

			{tab === "reservas" ? (
				<div className="bg-white dark:bg-slate-900 rounded-xl shadow-md border border-slate-200 dark:border-slate-800 overflow-hidden">
					<div className="overflow-x-auto">
						<table className="min-w-full text-sm">
							<thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
								<tr>
									<th className="text-left font-semibold px-4 py-3 whitespace-nowrap">
										Fecha
									</th>
									<th className="text-left font-semibold px-4 py-3 whitespace-nowrap">
										Hora
									</th>
									<th className="text-left font-semibold px-4 py-3 whitespace-nowrap">
										Cancha
									</th>
									<th className="text-left font-semibold px-4 py-3 whitespace-nowrap">
										Cliente
									</th>
									<th className="text-right font-semibold px-4 py-3 whitespace-nowrap">
										Total
									</th>
									<th className="text-right font-semibold px-4 py-3 whitespace-nowrap">
										Pagado
									</th>
									<th className="text-right font-semibold px-4 py-3 whitespace-nowrap">
										Saldo
									</th>
									<th className="text-left font-semibold px-4 py-3 whitespace-nowrap">
										Medio
									</th>
									<th className="text-right font-semibold px-4 py-3 whitespace-nowrap">
										Acciones
									</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-slate-100 dark:divide-slate-800">
								{loading ? (
									<tr>
										<td
											className="px-4 py-8 text-center text-slate-500"
											colSpan={9}
										>
											<div className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-solid border-blue-600 border-r-transparent mb-2"></div>
											<div>Cargando reservas...</div>
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
												className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
											>
												<td className="px-4 py-3 whitespace-nowrap text-slate-700 dark:text-slate-300">
													{toDateShortPE(r.date)}
												</td>
												<td className="px-4 py-3 whitespace-nowrap text-slate-700 dark:text-slate-300">
													{formatTime(r.start_time)} -{" "}
													{formatTime(r.end_time)}
												</td>
												<td className="px-4 py-3 whitespace-nowrap font-medium text-slate-900 dark:text-slate-100">
													{r.court_name || r.court_id}
												</td>
												<td className="px-4 py-3 whitespace-nowrap font-medium text-slate-900 dark:text-slate-100">
													{r.customer_name}
												</td>
												<td className="px-4 py-3 text-right whitespace-nowrap font-medium text-slate-900 dark:text-slate-100">
													{money(r.price)}
												</td>
												<td className="px-4 py-3 text-right whitespace-nowrap text-emerald-600 dark:text-emerald-400">
													{money(r.deposit)}
												</td>
												<td className="px-4 py-3 text-right whitespace-nowrap">
													<span
														className={`font-medium ${canPay ? "text-amber-600 dark:text-amber-500" : "text-slate-500 dark:text-slate-400"}`}
													>
														{money(
															Math.max(
																0,
																remaining,
															),
														)}
													</span>
												</td>
												<td className="px-4 py-3 whitespace-nowrap text-slate-600 dark:text-slate-400">
													{paymentMethodLabel(
														r.payment_method,
													)}
												</td>
												<td className="px-4 py-3 text-right whitespace-nowrap">
													{canPay ? (
														<button
															type="button"
															className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50 transition-colors text-xs font-medium flex items-center gap-1.5 ml-auto"
															onClick={() =>
																openPay(r)
															}
														>
															<LuDollarSign
																size={14}
															/>
															Completar pago
														</button>
													) : (
														<span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400 text-xs font-medium">
															<LuCircleCheck
																size={12}
															/>
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
											className="px-4 py-8 text-center text-slate-500"
											colSpan={9}
										>
											<LuCalendarDays
												size={24}
												className="mx-auto mb-2 opacity-30"
											/>
											Sin resultados para este periodo
										</td>
									</tr>
								)}
							</tbody>
							{!loading && visibleReservationRows.length ? (
								<tfoot className="bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800">
									<tr>
										<td
											className="px-4 py-4 font-semibold text-slate-900 dark:text-white uppercase tracking-wider text-xs"
											colSpan={4}
										>
											Totales del periodo
										</td>
										<td className="px-4 py-4 text-right font-bold text-slate-900 dark:text-white whitespace-nowrap">
											{money(reservationTotals.total)}
										</td>
										<td className="px-4 py-4 text-right font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
											{money(reservationTotals.paid)}
										</td>
										<td className="px-4 py-4 text-right font-bold text-amber-600 dark:text-amber-500 whitespace-nowrap">
											{money(reservationTotals.remaining)}
										</td>
										<td className="px-4 py-4" colSpan={2} />
									</tr>
								</tfoot>
							) : null}
						</table>
					</div>
				</div>
			) : (
				<div className="bg-white dark:bg-slate-900 rounded-xl shadow-md border border-slate-200 dark:border-slate-800 overflow-hidden">
					<div className="overflow-x-auto">
						<table className="min-w-full text-sm">
							<thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
								<tr>
									<th className="text-left font-semibold px-4 py-3 whitespace-nowrap">
										Fecha
									</th>
									<th className="text-left font-semibold px-4 py-3 whitespace-nowrap">
										Hora
									</th>
									<th className="text-left font-semibold px-4 py-3 whitespace-nowrap">
										Producto
									</th>
									<th className="text-right font-semibold px-4 py-3 whitespace-nowrap">
										Cant.
									</th>
									<th className="text-right font-semibold px-4 py-3 whitespace-nowrap">
										Total
									</th>
									<th className="text-left font-semibold px-4 py-3 whitespace-nowrap">
										Medio
									</th>
									<th className="text-left font-semibold px-4 py-3 whitespace-nowrap">
										Vendedor
									</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-slate-100 dark:divide-slate-800">
								{loading ? (
									<tr>
										<td
											className="px-4 py-8 text-center text-slate-500"
											colSpan={7}
										>
											<div className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-solid border-blue-600 border-r-transparent mb-2"></div>
											<div>Cargando ventas...</div>
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
												className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
											>
												<td className="px-4 py-3 whitespace-nowrap text-slate-700 dark:text-slate-300">
													{date}
												</td>
												<td className="px-4 py-3 whitespace-nowrap text-slate-700 dark:text-slate-300">
													{time}
												</td>
												<td className="px-4 py-3 whitespace-nowrap font-medium text-slate-900 dark:text-slate-100">
													{s.product_name || "-"}
												</td>
												<td className="px-4 py-3 text-right whitespace-nowrap text-slate-700 dark:text-slate-300">
													{Number(s.quantity || 0)}
												</td>
												<td className="px-4 py-3 text-right whitespace-nowrap font-medium text-slate-900 dark:text-slate-100">
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
												<td className="px-4 py-3 whitespace-nowrap text-slate-600 dark:text-slate-400">
													{paymentMethodLabel(
														s.payment_method,
													)}
												</td>
												<td className="px-4 py-3 whitespace-nowrap text-slate-600 dark:text-slate-400">
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
											className="px-4 py-8 text-center text-slate-500"
											colSpan={7}
										>
											<LuDollarSign
												size={24}
												className="mx-auto mb-2 opacity-30"
											/>
											Sin resultados para este periodo
										</td>
									</tr>
								)}
							</tbody>
						</table>
					</div>
				</div>
			)}

			{payOpen && payReservation ? (
				<div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
					<div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
						<div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-start">
							<div>
								<h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
									<LuDollarSign className="text-blue-500" />{" "}
									Completar pago
								</h3>
								<p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
									{payReservation.customer_name} ·{" "}
									{toDateShortPE(payReservation.date)} ·{" "}
									{formatTime(payReservation.start_time)}-
									{formatTime(payReservation.end_time)}
								</p>
							</div>
							<button
								type="button"
								onClick={closePay}
								className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
							>
								✕
							</button>
						</div>
						<div className="p-6">
							{payError && (
								<div className="mb-4 text-sm text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-lg p-3 flex items-center gap-2">
									<span className="w-1.5 h-1.5 rounded-full bg-red-500 block"></span>
									{payError}
								</div>
							)}

							<div className="grid grid-cols-3 gap-3 mb-5">
								<div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-xl p-3 text-center">
									<div className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">
										Total
									</div>
									<div className="font-bold text-slate-900 dark:text-white">
										{money(payReservation.price)}
									</div>
								</div>
								<div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30 rounded-xl p-3 text-center">
									<div className="text-xs font-medium text-emerald-600 dark:text-emerald-500 uppercase tracking-wider mb-1">
										Pagado
									</div>
									<div className="font-bold text-emerald-700 dark:text-emerald-400">
										{money(payReservation.deposit)}
									</div>
								</div>
								<div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-xl p-3 text-center">
									<div className="text-xs font-medium text-amber-600 dark:text-amber-500 uppercase tracking-wider mb-1">
										Saldo
									</div>
									<div className="font-bold text-amber-700 dark:text-amber-400">
										{money(
											Math.max(
												0,
												Number(
													payReservation.price || 0,
												) -
													Number(
														payReservation.deposit ||
															0,
													),
											),
										)}
									</div>
								</div>
							</div>

							<div className="space-y-4">
								<div>
									<label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
										Nuevo pagado (total acumulado)
									</label>
									<input
										type="number"
										step="0.01"
										min="0"
										className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
										value={payDeposit}
										onChange={(e) =>
											setPayDeposit(e.target.value)
										}
									/>
									<div className="mt-2 flex items-center gap-2">
										<button
											type="button"
											className="px-3 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors"
											onClick={() =>
												setPayDeposit(
													String(
														Number(
															payReservation.price ||
																0,
														),
													),
												)
											}
										>
											Pagar todo
										</button>
										<button
											type="button"
											className="px-3 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors"
											onClick={() =>
												setPayDeposit(
													String(
														Number(
															payReservation.deposit ||
																0,
														),
													),
												)
											}
										>
											Revertir
										</button>
									</div>
								</div>

								<div>
									<label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
										<LuCreditCard
											size={16}
											className="text-slate-400"
										/>
										Medio de pago
									</label>
									<select
										className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
										value={payMethod}
										onChange={(e) =>
											setPayMethod(e.target.value)
										}
									>
										<option value="cash">Efectivo</option>
										<option value="transfer">
											Transferencia
										</option>
										<option value="yape_plin">
											Yape o Plin
										</option>
										<option value="card">
											Pago con Tarjeta
										</option>
									</select>
								</div>
							</div>

							<div className="flex justify-end gap-3 pt-5 mt-5 border-t border-slate-100 dark:border-slate-800">
								<button
									type="button"
									className="px-4 py-2 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
									onClick={closePay}
									disabled={paySaving}
								>
									Cancelar
								</button>
								<button
									type="button"
									className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50"
									onClick={savePay}
									disabled={paySaving}
								>
									{paySaving ? (
										<div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
									) : (
										<LuCircleCheck size={16} />
									)}
									Guardar
								</button>
							</div>
						</div>
					</div>
				</div>
			) : null}
		</div>
	);
}
