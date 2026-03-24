import React, { useEffect, useState } from "react";
import { getDashboard } from "../services/api";
import {
	LuTrendingUp,
	LuCalendarDays,
	LuDollarSign,
	LuCreditCard,
	LuClock,
	LuUser,
	LuMapPin,
	LuPhone,
	LuFileText,
} from "react-icons/lu";

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

export default function Dashboard() {
	const [data, setData] = useState(null);
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		setLoading(true);
		getDashboard()
			.then(setData)
			.finally(() => setLoading(false));
	}, []);

	if (!data)
		return (
			<div className="text-gray-700 dark:text-gray-200">
				{loading ? "Cargando..." : "Sin datos"}
			</div>
		);

	const next = data.next_reservation;

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
					Dashboard
				</h1>
				<div className="text-sm text-slate-500 dark:text-slate-400 mt-1">
					Resumen general de hoy
				</div>
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
				{/* Card Ventas */}
				<div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md rounded-xl p-5 hover:shadow-lg transition-shadow">
					<div className="flex items-center justify-between">
						<div>
							<div className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">
								Ventas (hoy)
							</div>
							<div className="text-2xl font-bold text-slate-900 dark:text-white">
								{money(data.income_today)}
							</div>
						</div>
						<div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xl">
							<LuTrendingUp />
						</div>
					</div>
				</div>

				{/* Card Reservas */}
				<div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md rounded-xl p-5 hover:shadow-lg transition-shadow">
					<div className="flex items-center justify-between">
						<div>
							<div className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">
								Reservas (hoy)
							</div>
							<div className="text-2xl font-bold text-slate-900 dark:text-white">
								{Number(data.reservations_today || 0)}
							</div>
						</div>
						<div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xl">
							<LuCalendarDays />
						</div>
					</div>
				</div>

				{/* Card Total Reservas */}
				<div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md rounded-xl p-5 hover:shadow-lg transition-shadow">
					<div className="flex items-center justify-between">
						<div>
							<div className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">
								Total reservas (hoy)
							</div>
							<div className="text-2xl font-bold text-slate-900 dark:text-white">
								{money(data.reservations_total_today)}
							</div>
						</div>
						<div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xl">
							<LuDollarSign />
						</div>
					</div>
				</div>

				{/* Card Falta Cobrar */}
				<div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md rounded-xl p-5 hover:shadow-lg transition-shadow">
					<div className="flex items-center justify-between">
						<div>
							<div className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">
								Falta cobrar (hoy)
							</div>
							<div className="text-2xl font-bold text-amber-600 dark:text-amber-500">
								{money(data.reservations_remaining_today)}
							</div>
						</div>
						<div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center text-xl">
							<LuCreditCard />
						</div>
					</div>
				</div>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
				{/* Próxima Reserva Card */}
				<div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md rounded-xl overflow-hidden flex flex-col">
					<div className="bg-slate-50 dark:bg-slate-800/50 px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
						<h3 className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
							<LuClock className="text-blue-500" /> Próxima
							reserva
						</h3>
						{next ? (
							<div className="text-sm font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-3 py-1 rounded-full">
								{formatTime(next.start_time)} -{" "}
								{formatTime(next.end_time)}
							</div>
						) : null}
					</div>

					<div className="p-5 flex-1">
						{next ? (
							<div className="space-y-4">
								<div className="flex items-start gap-4">
									<div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400">
										<LuUser size={20} />
									</div>
									<div>
										<div className="font-bold text-lg text-slate-900 dark:text-white">
											{next.customer_name}
										</div>
										<div className="flex items-center gap-4 mt-1 text-sm text-slate-600 dark:text-slate-400">
											<span className="flex items-center gap-1.5">
												<LuPhone size={14} />
												{next.customer_phone || "-"}
											</span>
											<span className="flex items-center gap-1.5">
												<LuMapPin size={14} />
												{next.court_name ||
													next.court_id}
											</span>
										</div>
									</div>
								</div>

								<div className="grid grid-cols-3 gap-3 pt-2">
									<div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-lg p-3 text-center">
										<div className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">
											Total
										</div>
										<div className="font-bold text-slate-900 dark:text-white">
											{money(next.price)}
										</div>
									</div>
									<div className="bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30 rounded-lg p-3 text-center">
										<div className="text-xs font-medium text-emerald-600 dark:text-emerald-500 uppercase tracking-wider mb-1">
											Adelanto
										</div>
										<div className="font-bold text-emerald-700 dark:text-emerald-400">
											{money(next.deposit)}
										</div>
									</div>
									<div className="bg-amber-50/50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-lg p-3 text-center">
										<div className="text-xs font-medium text-amber-600 dark:text-amber-500 uppercase tracking-wider mb-1">
											Falta
										</div>
										<div className="font-bold text-amber-700 dark:text-amber-400">
											{money(next.remaining)}
										</div>
									</div>
								</div>

								<div className="flex flex-col sm:flex-row gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
									<div className="flex-1">
										<div className="text-xs font-medium text-slate-500 mb-1 flex items-center gap-1.5">
											<LuCreditCard size={14} /> Medio de
											pago
										</div>
										<div className="text-sm font-medium text-slate-800 dark:text-slate-200">
											{next.payment_method || "-"}
										</div>
									</div>
									{next.notes && (
										<div className="flex-1">
											<div className="text-xs font-medium text-slate-500 mb-1 flex items-center gap-1.5">
												<LuFileText size={14} /> Notas
											</div>
											<div className="text-sm text-slate-700 dark:text-slate-300 italic">
												"{next.notes}"
											</div>
										</div>
									)}
								</div>
							</div>
						) : (
							<div className="h-full flex flex-col items-center justify-center text-slate-400 py-8">
								<LuCalendarDays
									size={48}
									className="mb-3 opacity-20"
								/>
								<div className="text-center">
									Sin reservas próximas para hoy
								</div>
							</div>
						)}
					</div>
				</div>

				{/* Cobros de reservas Card */}
				<div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md rounded-xl overflow-hidden flex flex-col">
					<div className="bg-slate-50 dark:bg-slate-800/50 px-5 py-4 border-b border-slate-200 dark:border-slate-800">
						<h3 className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
							<LuDollarSign className="text-emerald-500" /> Cobros
							de reservas (hoy)
						</h3>
					</div>

					<div className="p-5 flex-1 flex flex-col justify-center">
						<div className="grid grid-cols-1 gap-3">
							<div className="flex items-center justify-between p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
								<div className="flex items-center gap-3">
									<div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
										<LuDollarSign size={20} />
									</div>
									<div className="font-medium text-slate-700 dark:text-slate-300">
										Total
									</div>
								</div>
								<div className="text-xl font-bold text-slate-900 dark:text-white">
									{money(data.reservations_total_today)}
								</div>
							</div>

							<div className="flex items-center justify-between p-4 rounded-lg bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30">
								<div className="flex items-center gap-3">
									<div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
										<LuCreditCard size={20} />
									</div>
									<div className="font-medium text-emerald-700 dark:text-emerald-400">
										Adelantos
									</div>
								</div>
								<div className="text-xl font-bold text-emerald-700 dark:text-emerald-400">
									{money(data.reservations_deposit_today)}
								</div>
							</div>

							<div className="flex items-center justify-between p-4 rounded-lg bg-amber-50/50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30">
								<div className="flex items-center gap-3">
									<div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center">
										<LuClock size={20} />
									</div>
									<div className="font-medium text-amber-700 dark:text-amber-500">
										Falta cobrar
									</div>
								</div>
								<div className="text-xl font-bold text-amber-600 dark:text-amber-500">
									{money(data.reservations_remaining_today)}
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
