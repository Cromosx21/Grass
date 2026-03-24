import React, { useEffect, useMemo, useState } from "react";
import {
	listCourts,
	listReservations,
	createReservation,
	deleteReservation,
} from "../services/api";
import {
	LuPlus,
	LuCalendarDays,
	LuClock,
	LuMapPin,
	LuPhone,
	LuUser,
	LuTrash2,
	LuCreditCard,
	LuChevronLeft,
	LuChevronRight,
	LuCalendar,
} from "react-icons/lu";

function today() {
	const d = new Date();
	const m = String(d.getMonth() + 1).padStart(2, "0");
	const day = String(d.getDate()).padStart(2, "0");
	return `${d.getFullYear()}-${m}-${day}`;
}

function formatTime(t) {
	return String(t || "").slice(0, 5);
}

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

function toMinutes(hhmm) {
	const [h, m] = String(hhmm || "0:0")
		.split(":")
		.map(Number);
	return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
}

function formatISODateLocal(d) {
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, "0");
	const day = String(d.getDate()).padStart(2, "0");
	return `${y}-${m}-${day}`;
}

function addDays(dateStr, deltaDays) {
	const d = new Date(`${dateStr}T12:00:00`);
	if (Number.isNaN(d.getTime())) return dateStr;
	d.setDate(d.getDate() + deltaDays);
	return formatISODateLocal(d);
}

function overlaps(aStart, aEnd, bStart, bEnd) {
	return aStart < bEnd && aEnd > bStart;
}

function buildHourlySlots({ startHour = 8, endHour = 23 } = {}) {
	const slots = [];
	for (let h = startHour; h < endHour; h += 1) {
		const start = `${String(h).padStart(2, "0")}:00`;
		const end = `${String(h + 1).padStart(2, "0")}:00`;
		slots.push({ start, end });
	}
	return slots;
}

function getCourtHours(court) {
	const open = formatTime(court?.open_time || "");
	const close = formatTime(court?.close_time || "");
	const openH = Number(open.split(":")[0]);
	const closeH = Number(close.split(":")[0]);
	if (Number.isFinite(openH) && Number.isFinite(closeH) && closeH > openH) {
		return { startHour: openH, endHour: closeH };
	}
	return { startHour: 8, endHour: 23 };
}

function addHours(hhmm, hours) {
	const base = toMinutes(hhmm);
	const next = base + Number(hours || 0) * 60;
	const h = Math.floor(next / 60) % 24;
	const m = next % 60;
	return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

const NIGHT_START_MIN = 18 * 60;
const NIGHT_END_MIN = 6 * 60;

function isNightMinute(min) {
	return min >= NIGHT_START_MIN || min < NIGHT_END_MIN;
}

function computeReservationPrice({ startTime, endTime, dayRate, nightRate }) {
	const start = toMinutes(startTime);
	const end = toMinutes(endTime);
	if (!(end > start)) return 0;
	let total = 0;
	for (let m = start; m < end; m += 1) {
		const rate = isNightMinute(m) ? nightRate : dayRate;
		total += Number(rate || 0) / 60;
	}
	return Number(total.toFixed(2));
}

export default function Reservations() {
	const [date, setDate] = useState(today());
	const [courtId, setCourtId] = useState("");
	const [courts, setCourts] = useState([]);
	const [reservations, setReservations] = useState([]);
	const [show, setShow] = useState(false);
	const [step, setStep] = useState(1);
	const [payMode, setPayMode] = useState("full");
	const [modalReservations, setModalReservations] = useState([]);
	const [form, setForm] = useState({
		customer_name: "",
		customer_phone: "",
		court_id: "",
		date: today(),
		start_time: "08:00",
		end_time: "09:00",
		price: 0,
		deposit: 0,
		payment_method: "cash",
		notes: "",
	});
	const [error, setError] = useState("");
	const [saving, setSaving] = useState(false);
	const [deleteOpen, setDeleteOpen] = useState(false);
	const [deleteReservationId, setDeleteReservationId] = useState(null);
	const [deleteText, setDeleteText] = useState("");
	const [deleteError, setDeleteError] = useState("");
	const [deleteLoading, setDeleteLoading] = useState(false);
	const [selectedSlotIdxs, setSelectedSlotIdxs] = useState([]);
	const [selectionTouched, setSelectionTouched] = useState(false);
	const [nowMinutes, setNowMinutes] = useState(() => {
		const d = new Date();
		return d.getHours() * 60 + d.getMinutes();
	});

	const selectedCourt = courts.find(
		(c) => String(c.id) === String(form.court_id || courtId),
	);
	const dayRate = Number(
		selectedCourt?.day_price ?? selectedCourt?.base_price ?? 0,
	);
	const nightRate = Number(selectedCourt?.night_price ?? dayRate);
	const durationMinutes = Math.max(
		0,
		toMinutes(form.end_time) - toMinutes(form.start_time),
	);
	const durationHours = durationMinutes / 60;
	const calculatedPrice = computeReservationPrice({
		startTime: form.start_time,
		endTime: form.end_time,
		dayRate,
		nightRate,
	});

	const slots = useMemo(
		() => buildHourlySlots(getCourtHours(selectedCourt)),
		[selectedCourt],
	);

	useEffect(() => {
		const id = window.setInterval(() => {
			const d = new Date();
			setNowMinutes(d.getHours() * 60 + d.getMinutes());
		}, 30_000);
		return () => window.clearInterval(id);
	}, []);

	function isSlotBusy(slot) {
		const slotStart = toMinutes(slot.start);
		const slotEnd = toMinutes(slot.end);
		return modalReservations
			.filter((r) => r.status !== "cancelled")
			.some((r) =>
				overlaps(
					slotStart,
					slotEnd,
					toMinutes(formatTime(r.start_time)),
					toMinutes(formatTime(r.end_time)),
				),
			);
	}

	function isSlotPast(slot) {
		if (date !== today()) return false;
		return toMinutes(slot.start) < nowMinutes;
	}

	function isContiguousSelection(idxs) {
		if (!Array.isArray(idxs) || idxs.length <= 1) return true;
		const sorted = [...idxs].sort((a, b) => a - b);
		for (let i = 1; i < sorted.length; i += 1) {
			if (sorted[i] !== sorted[i - 1] + 1) return false;
		}
		return true;
	}

	function applySelection(nextIdxs) {
		const sorted = Array.isArray(nextIdxs)
			? [...nextIdxs].sort((a, b) => a - b)
			: [];
		if (!sorted.length) {
			const start = formatTime(selectedCourt?.open_time || "08:00");
			const end = addHours(start, 1);
			setForm((f) => ({ ...f, start_time: start, end_time: end }));
			return;
		}
		const minIdx = sorted[0];
		const maxIdx = sorted[sorted.length - 1];
		if (!slots[minIdx] || !slots[maxIdx]) return;
		setForm((f) => ({
			...f,
			start_time: slots[minIdx].start,
			end_time: slots[maxIdx].end,
		}));
	}

	useEffect(() => {
		if (!show) setSelectionTouched(false);
	}, [show]);

	useEffect(() => {
		listCourts().then((cs) => {
			setCourts(cs);
			if (cs.length) {
				setCourtId(String(cs[0].id));
				const day = Number(cs[0].day_price ?? cs[0].base_price ?? 0);
				const night = Number(cs[0].night_price ?? day);
				const start = formatTime(cs[0].open_time || "08:00");
				const end = addHours(start, 1);
				const initialPrice = computeReservationPrice({
					startTime: start,
					endTime: end,
					dayRate: day,
					nightRate: night,
				});
				setForm((f) => ({
					...f,
					court_id: cs[0].id,
					start_time: start,
					end_time: end,
					price: initialPrice,
					deposit: initialPrice,
				}));
			}
		});
	}, []);

	useEffect(() => {
		const params = { date };
		if (courtId) params.court_id = courtId;
		listReservations(params).then(setReservations);
	}, [date, courtId]);

	function openModal() {
		setShow(true);
		setError("");
		setStep(1);
		setPayMode("full");
		setSelectedSlotIdxs([]);
		setSelectionTouched(false);
		const court = courts.find(
			(c) => String(c.id) === String(form.court_id || courtId),
		);
		const start = formatTime(court?.open_time || "08:00");
		const end = addHours(start, 1);
		setForm((f) => ({
			...f,
			customer_name: "",
			customer_phone: "",
			date,
			court_id: f.court_id || courtId,
			start_time: start,
			end_time: end,
			payment_method: "cash",
			notes: "",
		}));
	}
	function closeModal() {
		setShow(false);
	}
	function onChange(e) {
		const { name, value } = e.target;
		setForm((prev) => ({ ...prev, [name]: value }));
	}

	useEffect(() => {
		if (!show) return;
		const nextPrice = Number.isFinite(calculatedPrice)
			? calculatedPrice
			: 0;
		setForm((f) => {
			const next = { ...f, price: nextPrice };
			if (payMode === "full") next.deposit = nextPrice;
			if (payMode === "deposit")
				next.deposit = Math.min(Number(next.deposit || 0), nextPrice);
			return next;
		});
	}, [
		show,
		form.court_id,
		courtId,
		form.start_time,
		form.end_time,
		dayRate,
		nightRate,
		calculatedPrice,
		payMode,
	]);

	useEffect(() => {
		if (!show) return;
		const cid = Number(form.court_id || courtId);
		if (!cid) return;
		listReservations({ date, court_id: cid }).then(setModalReservations);
	}, [show, date, courtId, form.court_id]);

	useEffect(() => {
		if (!show) return;
		if (!slots.length) return;
		if (selectionTouched) return;
		if (selectedSlotIdxs.length) return;
		const idx = slots.findIndex((s) => !isSlotBusy(s) && !isSlotPast(s));
		if (idx === -1) return;
		setSelectedSlotIdxs([idx]);
		applySelection([idx]);
	}, [
		show,
		slots,
		modalReservations,
		date,
		nowMinutes,
		selectedSlotIdxs.length,
		selectionTouched,
	]);

	async function confirmReservation() {
		setError("");
		if (!selectedSlotIdxs.length) {
			setError("Seleccioná un horario");
			return;
		}
		if (!isContiguousSelection(selectedSlotIdxs)) {
			setError("Seleccioná horas contiguas para una sola reserva.");
			return;
		}
		if (
			date === today() &&
			toMinutes(formatTime(form.start_time)) < nowMinutes
		) {
			setError("No se puede reservar horas anteriores a la hora actual.");
			return;
		}
		setSaving(true);
		try {
			const priceN = Number(form.price || 0);
			const depositN =
				payMode === "full"
					? priceN
					: Math.max(0, Number(form.deposit || 0));
			const payload = {
				...form,
				court_id: Number(form.court_id || courtId),
				date,
				price: priceN,
				deposit: depositN,
			};
			await createReservation(payload);
			closeModal();
			const params = { date };
			if (courtId) params.court_id = courtId;
			const rows = await listReservations(params);
			setReservations(rows);
		} catch (err) {
			setError(
				err?.response?.data?.message || "No se pudo crear la reserva",
			);
		} finally {
			setSaving(false);
		}
	}
	async function onDelete(id) {
		setDeleteReservationId(id);
		setDeleteText("");
		setDeleteError("");
		setDeleteOpen(true);
	}

	async function confirmDelete() {
		if (!deleteReservationId) return;
		if (deleteText !== "Eliminar Reserva") {
			setDeleteError('Escribí exactamente "Eliminar Reserva".');
			return;
		}
		setDeleteLoading(true);
		setDeleteError("");
		try {
			await deleteReservation(deleteReservationId);
			setReservations((prev) =>
				prev.filter((r) => r.id !== deleteReservationId),
			);
			setDeleteOpen(false);
			setDeleteReservationId(null);
			setDeleteText("");
		} catch (e) {
			setDeleteError(
				e?.response?.data?.message || "No se pudo eliminar la reserva",
			);
		} finally {
			setDeleteLoading(false);
		}
	}

	return (
		<div className="space-y-6">
			<div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
				<div>
					<h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
						Reservas
					</h1>
					<p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
						Gestiona las reservas y horarios de tus canchas.
					</p>
				</div>
				<button
					className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 transition-colors text-white px-4 py-2.5 rounded-lg shadow-sm font-medium flex items-center gap-2"
					onClick={openModal}
				>
					<LuPlus size={18} />
					Nueva reserva
				</button>
			</div>

			<div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm rounded-xl p-4 sm:p-5 flex flex-wrap gap-4 items-end">
				<div>
					<label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
						Fecha
					</label>
					<div className="flex flex-wrap items-center gap-2">
						<div className="relative">
							<LuCalendarDays
								className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
								size={16}
							/>
							<input
								type="date"
								className="pl-9 pr-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
								value={date}
								onChange={(e) => setDate(e.target.value)}
							/>
						</div>
						<div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
							<button
								type="button"
								className="p-1.5 rounded-md text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 hover:shadow-sm transition-all"
								onClick={() => setDate((d) => addDays(d, -1))}
								title="Día anterior"
							>
								<LuChevronLeft size={16} />
							</button>
							<button
								type="button"
								className="px-3 py-1 rounded-md text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 hover:shadow-sm transition-all"
								onClick={() => setDate(today())}
							>
								Hoy
							</button>
							<button
								type="button"
								className="p-1.5 rounded-md text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 hover:shadow-sm transition-all"
								onClick={() => setDate((d) => addDays(d, 1))}
								title="Día siguiente"
							>
								<LuChevronRight size={16} />
							</button>
						</div>
					</div>
				</div>
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
							onChange={(e) => setCourtId(e.target.value)}
						>
							{courts.map((c) => (
								<option key={c.id} value={c.id}>
									{c.name}
								</option>
							))}
						</select>
					</div>
				</div>
			</div>

			{reservations.length === 0 ? (
				<div className="bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl py-12 flex flex-col items-center justify-center text-slate-500 dark:text-slate-400">
					<LuCalendar size={48} className="mb-4 opacity-20" />
					<p className="text-lg font-medium text-slate-600 dark:text-slate-300">
						No hay reservas para este día
					</p>
					<p className="text-sm mt-1">
						Haz click en "Nueva reserva" para agregar una.
					</p>
				</div>
			) : (
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
					{reservations.map((r) => (
						<div
							key={r.id}
							className="bg-white dark:bg-slate-900 rounded-xl shadow-md border border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow overflow-hidden flex flex-col"
						>
							<div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-start">
								<div>
									<div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
										<LuUser
											size={16}
											className="text-blue-500"
										/>
										{r.customer_name}
									</div>
									<div className="text-slate-500 dark:text-slate-400 text-xs mt-1 font-medium flex items-center gap-1.5">
										<LuClock size={14} />
										{formatTime(r.start_time)} -{" "}
										{formatTime(r.end_time)}
									</div>
								</div>
								<div className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-bold px-2 py-1 rounded-md">
									{String(r.date || "").slice(0, 10)}
								</div>
							</div>

							<div className="p-4 flex-1 flex flex-col gap-3">
								<div className="space-y-2">
									<div className="flex items-start gap-2 text-sm">
										<LuPhone
											className="text-slate-400 mt-0.5"
											size={14}
										/>
										<span className="text-slate-700 dark:text-slate-300">
											{r.customer_phone || (
												<span className="text-slate-400 italic">
													Sin teléfono
												</span>
											)}
										</span>
									</div>
									<div className="flex items-start gap-2 text-sm">
										<LuCreditCard
											className="text-slate-400 mt-0.5"
											size={14}
										/>
										<span className="text-slate-700 dark:text-slate-300 font-medium">
											{paymentMethodLabel(
												r.payment_method,
											)}
										</span>
									</div>
									{r.notes && (
										<div className="text-sm bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-md p-2 mt-2 text-amber-800 dark:text-amber-400 italic">
											{r.notes}
										</div>
									)}
								</div>

								<div className="mt-auto pt-3 border-t border-slate-100 dark:border-slate-800">
									<div className="grid grid-cols-3 gap-2 mb-3">
										<div>
											<div className="text-[10px] uppercase tracking-wider text-slate-500 mb-0.5">
												Precio
											</div>
											<div className="font-semibold text-sm text-slate-900 dark:text-white">
												{money(r.price)}
											</div>
										</div>
										<div>
											<div className="text-[10px] uppercase tracking-wider text-slate-500 mb-0.5">
												Adelanto
											</div>
											<div className="font-semibold text-sm text-emerald-600 dark:text-emerald-400">
												{money(r.deposit)}
											</div>
										</div>
										<div>
											<div className="text-[10px] uppercase tracking-wider text-slate-500 mb-0.5">
												Falta
											</div>
											<div className="font-semibold text-sm text-amber-600 dark:text-amber-500">
												{money(
													r.remaining != null
														? r.remaining
														: Number(r.price || 0) -
																Number(
																	r.deposit ||
																		0,
																),
												)}
											</div>
										</div>
									</div>
									<button
										onClick={() => onDelete(r.id)}
										className="w-full py-2 flex items-center justify-center gap-2 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors border border-transparent hover:border-red-200 dark:hover:border-red-800/50"
									>
										<LuTrash2 size={14} />
										Eliminar reserva
									</button>
								</div>
							</div>
						</div>
					))}
				</div>
			)}

			{show && (
				<div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
					<form
						onSubmit={(e) => e.preventDefault()}
						className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-md border border-slate-200 dark:border-slate-800 shadow-xl max-h-[90vh] overflow-y-auto"
					>
						<div className="flex items-start justify-between gap-3 mb-6">
							<div>
								<h2 className="text-xl font-bold text-slate-900 dark:text-white">
									Nueva reserva
								</h2>
								<div className="text-sm font-medium text-blue-600 dark:text-blue-400 mt-1 bg-blue-50 dark:bg-blue-900/30 inline-block px-2 py-0.5 rounded-md">
									Paso {step} de 4
								</div>
							</div>
							<button
								type="button"
								onClick={closeModal}
								className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
							>
								✕
							</button>
						</div>

						{error && (
							<div className="text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded p-2 mb-3">
								{error}
							</div>
						)}

						{step === 1 ? (
							<div className="space-y-3">
								<div>
									<label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
										Nombre
									</label>
									<input
										className="border border-gray-300 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 rounded w-full p-2 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
										name="customer_name"
										placeholder="Juan Pérez"
										value={form.customer_name}
										onChange={onChange}
									/>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
										Teléfono (opcional)
									</label>
									<input
										className="border border-gray-300 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 rounded w-full p-2 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
										name="customer_phone"
										placeholder="+54 9 11 1234-5678"
										value={form.customer_phone}
										onChange={onChange}
									/>
								</div>
							</div>
						) : null}

						{step === 2 ? (
							<div className="space-y-3">
								<div>
									<label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
										Cancha
									</label>
									<select
										className="border border-gray-300 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 rounded w-full p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
										value={form.court_id || courtId}
										onChange={(e) => {
											const nextCourtId = e.target.value;
											const court = courts.find(
												(c) =>
													String(c.id) ===
													String(nextCourtId),
											);
											const start = formatTime(
												court?.open_time || "08:00",
											);
											const end = addHours(start, 1);
											setSelectedSlotIdxs([]);
											setSelectionTouched(false);
											setForm((f) => ({
												...f,
												court_id: nextCourtId,
												start_time: start,
												end_time: end,
											}));
										}}
									>
										{courts
											.filter(
												(c) =>
													(c.status || "active") !==
													"inactive",
											)
											.map((c) => (
												<option key={c.id} value={c.id}>
													{c.name}
												</option>
											))}
									</select>
								</div>

								<div className="bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded p-3">
									<div className="text-sm font-medium mb-2">
										Horarios disponibles
									</div>
									<div className="grid grid-cols-3 gap-2">
										{slots.map((s, idx) => {
											const busy = isSlotBusy(s);
											const past = isSlotPast(s);
											const selected =
												selectedSlotIdxs.includes(idx);
											const className = selected
												? "px-2 py-2 rounded bg-blue-600 text-white"
												: busy || past
													? "px-2 py-2 rounded bg-gray-200 dark:bg-gray-800 text-gray-500 dark:text-gray-400 cursor-not-allowed"
													: "px-2 py-2 rounded bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800";
											return (
												<button
													key={`${s.start}-${s.end}`}
													type="button"
													className={className}
													disabled={busy || past}
													onClick={() => {
														setSelectionTouched(
															true,
														);
														setError("");
														const current =
															selectedSlotIdxs;
														const next =
															current.includes(
																idx,
															)
																? current.filter(
																		(i) =>
																			i !==
																			idx,
																	)
																: [
																		...current,
																		idx,
																	];
														next.sort(
															(a, b) => a - b,
														);
														setSelectedSlotIdxs(
															next,
														);
														if (!next.length) {
															applySelection([]);
															setError("");
															return;
														}
														if (
															!isContiguousSelection(
																next,
															)
														) {
															setError(
																"Seleccioná horas contiguas para una sola reserva.",
															);
															return;
														}
														setError("");
														applySelection(next);
													}}
												>
													{s.start} - {s.end}
												</button>
											);
										})}
									</div>
									<div className="text-xs text-gray-600 dark:text-gray-300 mt-2">
										<div className="flex items-center justify-between gap-2">
											<div>
												Seleccionado:{" "}
												{formatTime(form.start_time)} -{" "}
												{formatTime(form.end_time)}{" "}
												{selectedSlotIdxs.length
													? `(${selectedSlotIdxs.length} h)`
													: null}
											</div>
											<button
												type="button"
												className="px-2 py-1 rounded border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
												onClick={() => {
													setSelectionTouched(true);
													const start = formatTime(
														selectedCourt?.open_time ||
															"08:00",
													);
													const end = addHours(
														start,
														1,
													);
													setSelectedSlotIdxs([]);
													setError("");
													setForm((f) => ({
														...f,
														start_time: start,
														end_time: end,
													}));
												}}
											>
												Limpiar
											</button>
										</div>
									</div>
								</div>

								<div className="bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded p-3">
									<div className="flex items-center justify-between text-sm">
										<div className="text-gray-600 dark:text-gray-300">
											Tarifa por hora
										</div>
										<div className="font-semibold">
											{nightRate !== dayRate
												? `${money(dayRate)} / ${money(nightRate)}`
												: money(dayRate)}
										</div>
									</div>
									<div className="flex items-center justify-between text-sm mt-1">
										<div className="text-gray-600 dark:text-gray-300">
											Duración
										</div>
										<div className="font-semibold">
											{durationMinutes
												? `${durationHours.toFixed(2)} h`
												: "-"}
										</div>
									</div>
									<div className="flex items-center justify-between text-sm mt-1">
										<div className="text-gray-600 dark:text-gray-300">
											Total
										</div>
										<div className="font-semibold">
											{money(form.price)}
										</div>
									</div>
								</div>
							</div>
						) : null}

						{step === 3 ? (
							<div className="space-y-3">
								<div>
									<label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
										Medio de pago
									</label>
									<select
										className="border border-gray-300 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 rounded w-full p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
										name="payment_method"
										value={form.payment_method}
										onChange={onChange}
									>
										<option value="cash">Efectivo</option>
										<option value="transfer">
											Transferencia
										</option>
										<option value="yape_plin">
											Yape o Plin
										</option>
										<option value="card">
											Pago con tarjeta
										</option>
									</select>
								</div>

								<div>
									<label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
										Tipo de pago
									</label>
									<div className="flex gap-2">
										<button
											type="button"
											className={
												payMode === "full"
													? "px-3 py-2 rounded bg-blue-600 text-white"
													: "px-3 py-2 rounded border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
											}
											onClick={() => {
												setPayMode("full");
												setForm((f) => ({
													...f,
													deposit: Number(
														f.price || 0,
													),
												}));
											}}
										>
											Pago total
										</button>
										<button
											type="button"
											className={
												payMode === "deposit"
													? "px-3 py-2 rounded bg-blue-600 text-white"
													: "px-3 py-2 rounded border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
											}
											onClick={() => {
												setPayMode("deposit");
												setForm((f) => ({
													...f,
													deposit: 0,
												}));
											}}
										>
											Adelanto
										</button>
									</div>
								</div>

								<div className="grid grid-cols-2 gap-3">
									<div>
										<label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
											Adelanto
										</label>
										<input
											className="border border-gray-300 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 rounded w-full p-2 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
											name="deposit"
											type="number"
											step="0.01"
											placeholder="0.00"
											value={form.deposit}
											onChange={onChange}
											disabled={payMode === "full"}
										/>
									</div>
									<div className="bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded p-3 flex flex-col justify-center">
										<div className="text-xs text-gray-600 dark:text-gray-300">
											Falta
										</div>
										<div className="text-lg font-semibold">
											{money(
												Math.max(
													0,
													Number(form.price || 0) -
														Number(
															form.deposit || 0,
														),
												),
											)}
										</div>
									</div>
								</div>

								<div>
									<label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
										Nota (opcional)
									</label>
									<textarea
										className="border border-gray-300 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 rounded w-full p-2 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
										name="notes"
										placeholder="Ej: reserva por Instagram, requiere luz, etc."
										rows={3}
										value={form.notes}
										onChange={onChange}
									/>
								</div>
							</div>
						) : null}

						{step === 4 ? (
							<div className="space-y-3">
								<div className="bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded p-3">
									<div className="text-sm font-medium mb-2">
										Resumen de la reserva
									</div>
									<div className="text-sm text-gray-700 dark:text-gray-200 space-y-1">
										<div>
											<span className="text-gray-600 dark:text-gray-300">
												Cliente:
											</span>{" "}
											<span className="font-medium">
												{form.customer_name}
											</span>
										</div>
										<div>
											<span className="text-gray-600 dark:text-gray-300">
												Teléfono:
											</span>{" "}
											<span className="font-medium">
												{form.customer_phone || "-"}
											</span>
										</div>
										<div>
											<span className="text-gray-600 dark:text-gray-300">
												Fecha:
											</span>{" "}
											<span className="font-medium">
												{date}
											</span>
										</div>
										<div>
											<span className="text-gray-600 dark:text-gray-300">
												Cancha:
											</span>{" "}
											<span className="font-medium">
												{selectedCourt?.name ||
													form.court_id}
											</span>
										</div>
										<div>
											<span className="text-gray-600 dark:text-gray-300">
												Horario:
											</span>{" "}
											<span className="font-medium">
												{formatTime(form.start_time)} -{" "}
												{formatTime(form.end_time)}
											</span>
										</div>
										<div className="pt-2 grid grid-cols-3 gap-2">
											<div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded p-2">
												<div className="text-xs text-gray-600 dark:text-gray-300">
													Total
												</div>
												<div className="font-semibold">
													{money(form.price)}
												</div>
											</div>
											<div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded p-2">
												<div className="text-xs text-gray-600 dark:text-gray-300">
													Adelanto
												</div>
												<div className="font-semibold">
													{money(form.deposit)}
												</div>
											</div>
											<div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded p-2">
												<div className="text-xs text-gray-600 dark:text-gray-300">
													Falta
												</div>
												<div className="font-semibold">
													{money(
														Math.max(
															0,
															Number(
																form.price || 0,
															) -
																Number(
																	form.deposit ||
																		0,
																),
														),
													)}
												</div>
											</div>
										</div>
										<div className="pt-2">
											<span className="text-gray-600 dark:text-gray-300">
												Medio:
											</span>{" "}
											<span className="font-medium">
												{form.payment_method}
											</span>
										</div>
										<div>
											<span className="text-gray-600 dark:text-gray-300">
												Nota:
											</span>{" "}
											<span className="font-medium">
												{form.notes || "-"}
											</span>
										</div>
									</div>
								</div>
							</div>
						) : null}

						<div className="flex justify-between gap-2 mt-6">
							<button
								type="button"
								onClick={() => {
									setError("");
									setStep((s) => Math.max(1, s - 1));
								}}
								className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
								disabled={step === 1 || saving}
							>
								Atrás
							</button>

							{step < 4 ? (
								<button
									type="button"
									onClick={() => {
										setError("");
										if (step === 1) {
											if (
												!String(
													form.customer_name || "",
												).trim()
											) {
												setError(
													"El nombre es obligatorio",
												);
												return;
											}
										}
										if (step === 2) {
											if (!selectedSlotIdxs.length) {
												setError(
													"Seleccioná un horario",
												);
												return;
											}
											if (
												!isContiguousSelection(
													selectedSlotIdxs,
												)
											) {
												setError(
													"Seleccioná horas contiguas para una sola reserva.",
												);
												return;
											}
											const s = toMinutes(
												formatTime(form.start_time),
											);
											const e = toMinutes(
												formatTime(form.end_time),
											);
											if (!(e > s)) {
												setError(
													"Seleccioná un horario",
												);
												return;
											}
											if (
												date === today() &&
												s < nowMinutes
											) {
												setError(
													"No se puede reservar horas anteriores a la hora actual.",
												);
												return;
											}
										}
										if (step === 3) {
											const priceN = Number(
												form.price || 0,
											);
											const depositN = Math.max(
												0,
												Number(form.deposit || 0),
											);
											if (depositN > priceN) {
												setError(
													"El adelanto no puede ser mayor al total",
												);
												return;
											}
										}
										setStep((s) => Math.min(4, s + 1));
									}}
									className="px-3 py-2 bg-blue-600 hover:bg-blue-700 transition text-white rounded"
									disabled={saving}
								>
									Siguiente
								</button>
							) : (
								<button
									type="button"
									onClick={confirmReservation}
									className="px-3 py-2 bg-blue-600 hover:bg-blue-700 transition text-white rounded disabled:opacity-50"
									disabled={saving}
								>
									{saving
										? "Reservando..."
										: "Confirmar y reservar"}
								</button>
							)}
						</div>
					</form>
				</div>
			)}
			{deleteOpen ? (
				<div className="fixed inset-0 bg-black/50 flex items-center justify-center px-4">
					<div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm p-5">
						<div className="flex items-start justify-between gap-3">
							<div>
								<div className="text-lg font-semibold">
									Confirmar eliminación
								</div>
								<div className="text-sm text-gray-600 dark:text-gray-300">
									Para eliminar la reserva, escribí{" "}
									<span className="font-semibold">
										Eliminar Reserva
									</span>
									.
								</div>
							</div>
							<button
								type="button"
								onClick={() => {
									if (deleteLoading) return;
									setDeleteOpen(false);
									setDeleteReservationId(null);
									setDeleteText("");
									setDeleteError("");
								}}
								className="px-2 py-1 rounded hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300"
							>
								Cerrar
							</button>
						</div>

						{deleteError ? (
							<div className="mt-3 text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded p-2">
								{deleteError}
							</div>
						) : null}

						<div className="mt-4">
							<label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
								Escribí “Eliminar Reserva”
							</label>
							<input
								className="border border-gray-300 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 rounded w-full p-2 focus:outline-none focus:ring-2 focus:ring-red-500"
								value={deleteText}
								onChange={(e) => setDeleteText(e.target.value)}
								placeholder="Eliminar Reserva"
							/>
						</div>

						<div className="mt-4 flex justify-end gap-2">
							<button
								type="button"
								className="px-3 py-2 rounded border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
								onClick={() => {
									if (deleteLoading) return;
									setDeleteOpen(false);
									setDeleteReservationId(null);
									setDeleteText("");
									setDeleteError("");
								}}
							>
								Cancelar
							</button>
							<button
								type="button"
								className="px-3 py-2 rounded bg-red-600 hover:bg-red-700 transition text-white disabled:opacity-50"
								disabled={
									deleteLoading ||
									deleteText !== "Eliminar Reserva"
								}
								onClick={confirmDelete}
							>
								{deleteLoading ? "Eliminando..." : "Eliminar"}
							</button>
						</div>
					</div>
				</div>
			) : null}
		</div>
	);
}
