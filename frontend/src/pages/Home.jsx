import React, { useEffect, useMemo, useState } from "react";
import { listPublicCourts, listPublicReservations } from "../services/api";
import {
	LuCalendarDays,
	LuMessageCircle,
	LuMapPin,
	LuPhone,
	LuSun,
	LuMoon,
	LuChevronLeft,
	LuChevronRight,
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

function addDays(dateStr, deltaDays) {
	const d = new Date(`${dateStr}T12:00:00`);
	if (Number.isNaN(d.getTime())) return dateStr;
	d.setDate(d.getDate() + deltaDays);
	const m = String(d.getMonth() + 1).padStart(2, "0");
	const day = String(d.getDate()).padStart(2, "0");
	return `${d.getFullYear()}-${m}-${day}`;
}

function toMinutes(hhmm) {
	const [h, m] = String(hhmm || "0:0")
		.split(":")
		.map(Number);
	return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
}

function overlaps(aStart, aEnd, bStart, bEnd) {
	return aStart < bEnd && aEnd > bStart;
}

function buildHourlySlots({ startHour, endHour }) {
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

function normalizePhone(v) {
	const raw = String(v || "").trim();
	if (!raw) return { tel: "", wa: "" };
	const tel = raw.replace(/\s+/g, "");
	const digits = tel.replace(/[^\d]/g, "");
	return {
		tel,
		wa: digits ? `https://wa.me/${digits}` : "",
	};
}

export default function Home() {
	const businessName = import.meta.env.VITE_PUBLIC_BUSINESS_NAME || "Grass";
	const phone = import.meta.env.VITE_PUBLIC_PHONE || "";
	const { tel: telPhone, wa: whatsappUrl } = useMemo(
		() => normalizePhone(phone),
		[phone],
	);

	const [theme, setTheme] = useState(() => {
		const saved = localStorage.getItem("theme");
		if (saved === "dark" || saved === "light") return saved;
		if (
			typeof window !== "undefined" &&
			window.matchMedia &&
			window.matchMedia("(prefers-color-scheme: dark)").matches
		)
			return "dark";
		return "light";
	});

	useEffect(() => {
		const isDark = theme === "dark";
		document.documentElement.classList.toggle("dark", isDark);
		document.body.classList.toggle("dark", isDark);
		localStorage.setItem("theme", theme);
	}, [theme]);

	const [date, setDate] = useState(today());
	const [courts, setCourts] = useState([]);
	const [courtId, setCourtId] = useState("");
	const [reservations, setReservations] = useState([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");

	const selectedCourt = courts.find((c) => String(c.id) === String(courtId));
	const slots = useMemo(() => {
		if (!selectedCourt) return [];
		return buildHourlySlots(getCourtHours(selectedCourt));
	}, [selectedCourt]);

	useEffect(() => {
		let cancelled = false;
		setError("");
		listPublicCourts()
			.then((cs) => {
				if (cancelled) return;
				setCourts(Array.isArray(cs) ? cs : []);
				if (Array.isArray(cs) && cs.length)
					setCourtId(String(cs[0].id));
			})
			.catch(() => {
				if (cancelled) return;
				setCourts([]);
				setCourtId("");
				setError("No se pudieron cargar las canchas.");
			});
		return () => {
			cancelled = true;
		};
	}, []);

	useEffect(() => {
		if (!date || !courtId) {
			setReservations([]);
			return;
		}
		let cancelled = false;
		setLoading(true);
		setError("");
		listPublicReservations({ date, court_id: courtId })
			.then((rows) => {
				if (cancelled) return;
				setReservations(Array.isArray(rows) ? rows : []);
			})
			.catch(() => {
				if (cancelled) return;
				setReservations([]);
				setError("No se pudieron cargar las reservas.");
			})
			.finally(() => {
				if (cancelled) return;
				setLoading(false);
			});
		return () => {
			cancelled = true;
		};
	}, [date, courtId]);

	function isSlotBusy(slot) {
		const slotStart = toMinutes(slot.start);
		const slotEnd = toMinutes(slot.end);
		return reservations.some((r) =>
			overlaps(
				slotStart,
				slotEnd,
				toMinutes(formatTime(r.start_time)),
				toMinutes(formatTime(r.end_time)),
			),
		);
	}

	const hasToken = Boolean(localStorage.getItem("token"));

	return (
		<div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 transition-colors duration-200">
			<header className="sticky top-0 z-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-sm">
				<div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
					<div className="font-bold text-xl tracking-tight text-blue-600 dark:text-blue-500">
						{businessName}
					</div>
					<button
						type="button"
						className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-center"
						onClick={() =>
							setTheme((t) => (t === "dark" ? "light" : "dark"))
						}
						aria-label="Cambiar tema"
					>
						{theme === "dark" ? (
							<LuSun size={18} className="text-amber-500" />
						) : (
							<LuMoon size={18} className="text-blue-600" />
						)}
					</button>
				</div>
			</header>

			<main className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
				{/* Hero Section */}
				<div className=" dark:bg-slate-900 rounded-2xl p-6 sm:p-10 relative overflow-hidden">
					{/* <div className="absolute top-0 left-0 w-full h-2 bg-linear-to-r from-blue-500 to-indigo-600"></div> */}
					<div className="text-3xl sm:text-4xl font-bold mb-2 text-center">
						Bienvenido a{" "}
						<strong className="text-blue-500">
							{businessName}
						</strong>
					</div>
					<div className="text-slate-600 dark:text-slate-400 text-lg mb-8 text-center">
						Sigue estos sencillos pasos para asegurar tu cancha.
					</div>

					<div className="grid grid-cols-1 md:grid-cols-3 gap-6 ">
						{/* Paso 1 */}
						<div className="flex flex-col items-center gap-3 p-5 rounded-xl bg-white shadow-md shadow-slate-200 dark:shadow-slate-900 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
							<div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xl shadow-sm">
								<LuCalendarDays />
							</div>
							<div className="text-center">
								<div className="font-semibold text-lg mb-1">
									1. Revisa
								</div>
								<div className="text-sm text-slate-600 dark:text-slate-400">
									Consulta nuestro calendario interactivo y
									verifica la disponibilidad de horarios.
								</div>
							</div>
						</div>

						{/* Paso 2 */}
						<div className="flex flex-col items-center gap-3 p-5 rounded-xl bg-white shadow-md shadow-slate-200 dark:shadow-slate-900 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
							<div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xl shadow-sm">
								<LuMessageCircle />
							</div>
							<div className="text-center">
								<div className="font-semibold text-lg mb-1">
									2. Comunícate
								</div>
								<div className="text-sm text-slate-600 dark:text-slate-400 mb-3">
									Contáctanos por teléfono o WhatsApp para
									confirmar tu reserva.
								</div>
								<div className="flex flex-wrap gap-2 mt-auto justify-center">
									<a
										href={
											telPhone
												? `tel:${telPhone}`
												: undefined
										}
										className={
											telPhone
												? "px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700 hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-sm font-medium flex items-center gap-1.5 shadow-sm"
												: "px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 text-sm font-medium flex items-center gap-1.5 cursor-not-allowed"
										}
									>
										<LuPhone size={16} />
										Llamar
									</a>
									<a
										href={whatsappUrl || undefined}
										target="_blank"
										rel="noreferrer"
										className={
											whatsappUrl
												? "px-3 py-2 rounded-lg bg-[#25D366] hover:bg-[#1DA851] text-white transition-colors text-sm font-medium flex items-center gap-1.5 shadow-sm"
												: "px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 text-sm font-medium flex items-center gap-1.5 cursor-not-allowed"
										}
									>
										<LuMessageCircle size={16} />
										WhatsApp
									</a>
								</div>
							</div>
						</div>

						{/* Paso 3 */}
						<div className="flex flex-col items-center gap-3 p-5 rounded-xl bg-white shadow-md shadow-slate-200 dark:bg-slate-800/50 dark:shadow-slate-900 border border-slate-200 dark:border-slate-800">
							<div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xl shadow-sm">
								<LuMapPin />
							</div>
							<div className="text-center">
								<div className="font-semibold text-lg mb-1">
									3. Asiste
								</div>
								<div className="text-sm text-slate-600 dark:text-slate-400">
									Ven a la hora acordada, ponte los chimpunes
									y ¡disfruta del partido!
								</div>
							</div>
						</div>
					</div>
				</div>

				{/* Calendario Section */}
				<div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md rounded-2xl p-6 sm:p-10">
					<div className="flex flex-col lg:flex-row lg:items-end gap-6 justify-between mb-8">
						<div>
							<h2 className="text-2xl font-bold mb-1">
								Horarios Disponibles
							</h2>
							<p className="text-sm text-slate-600 dark:text-slate-400">
								Explora el calendario. Los bloques verdes están
								libres.
							</p>
						</div>

						<div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
							<div className="min-w-[140px]">
								<label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
									Cancha
								</label>
								<select
									className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
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
							<div className="min-w-[150px]">
								<label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
									Día
								</label>
								<input
									type="date"
									className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
									value={date}
									onChange={(e) => setDate(e.target.value)}
								/>
							</div>
							<div className="flex gap-2 items-end">
								<button
									type="button"
									className="h-[38px] px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-center text-slate-600 dark:text-slate-300 w-full sm:w-auto"
									onClick={() =>
										setDate((d) => addDays(d, -1))
									}
									aria-label="Día anterior"
								>
									<LuChevronLeft size={20} />
								</button>
								<button
									type="button"
									className="h-[38px] px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-center text-slate-600 dark:text-slate-300 w-full sm:w-auto"
									onClick={() =>
										setDate((d) => addDays(d, 1))
									}
									aria-label="Día siguiente"
								>
									<LuChevronRight size={20} />
								</button>
							</div>
						</div>
					</div>

					{error ? (
						<div className="mb-6 text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-lg p-3 text-sm flex items-center gap-2">
							<span className="w-1.5 h-1.5 rounded-full bg-red-500 block"></span>
							{error}
						</div>
					) : null}

					<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
						{loading ? (
							<div className="col-span-full py-12 text-center text-slate-500 dark:text-slate-400">
								<div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-blue-600 border-r-transparent mb-2"></div>
								<div>Cargando horarios...</div>
							</div>
						) : null}
						{!loading && !slots.length ? (
							<div className="col-span-full py-12 text-center text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
								Sin horarios para mostrar en esta fecha.
							</div>
						) : null}
						{!loading
							? slots.map((s) => {
									const busy = isSlotBusy(s);
									return (
										<div
											key={`${s.start}-${s.end}`}
											className={
												busy
													? "rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-3 opacity-70"
													: "rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/50 dark:bg-blue-900/10 p-3 hover:shadow-md transition-all duration-200 hover:border-blue-300 dark:hover:border-blue-800"
											}
										>
											<div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
												{s.start} - {s.end}
											</div>
											<div
												className={
													busy
														? "font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5"
														: "font-semibold text-blue-700 dark:text-blue-400 flex items-center gap-1.5"
												}
											>
												<span
													className={`w-2 h-2 rounded-full ${busy ? "bg-slate-400 dark:bg-slate-500" : "bg-blue-500"}`}
												></span>
												{busy ? "Ocupado" : "Libre"}
											</div>
										</div>
									);
								})
							: null}
					</div>
				</div>
			</main>
		</div>
	);
}
