import React, { useEffect, useState } from "react";
import { getDashboard } from "../services/api";

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
				<h1 className="text-xl font-semibold">Dashboard</h1>
				<div className="text-sm text-gray-600 dark:text-gray-300">
					Resumen de hoy
				</div>
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
				<div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
					<div className="text-sm text-gray-600 dark:text-gray-300">
						Ventas (hoy)
					</div>
					<div className="text-2xl font-semibold mt-1">
						{money(data.income_today)}
					</div>
				</div>
				<div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
					<div className="text-sm text-gray-600 dark:text-gray-300">
						Reservas (hoy)
					</div>
					<div className="text-2xl font-semibold mt-1">
						{Number(data.reservations_today || 0)}
					</div>
				</div>
				<div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
					<div className="text-sm text-gray-600 dark:text-gray-300">
						Total reservas (hoy)
					</div>
					<div className="text-2xl font-semibold mt-1">
						{money(data.reservations_total_today)}
					</div>
				</div>
				<div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
					<div className="text-sm text-gray-600 dark:text-gray-300">
						Falta cobrar (hoy)
					</div>
					<div className="text-2xl font-semibold mt-1">
						{money(data.reservations_remaining_today)}
					</div>
				</div>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
				<div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
					<div className="flex items-center justify-between">
						<div className="text-sm text-gray-600 dark:text-gray-300">
							Próxima reserva
						</div>
						{next ? (
							<div className="text-sm font-medium">
								{formatTime(next.start_time)} -{" "}
								{formatTime(next.end_time)}
							</div>
						) : null}
					</div>

					{next ? (
						<div className="mt-3 space-y-2">
							<div className="font-semibold">
								{next.customer_name}
							</div>
							<div className="text-sm text-gray-700 dark:text-gray-200">
								Cancha:{" "}
								<span className="font-medium">
									{next.court_name || next.court_id}
								</span>
							</div>
							<div className="text-sm text-gray-700 dark:text-gray-200">
								Teléfono:{" "}
								<span className="font-medium">
									{next.customer_phone || "-"}
								</span>
							</div>
							<div className="grid grid-cols-3 gap-2 text-sm">
								<div className="bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded p-2">
									<div className="text-gray-600 dark:text-gray-300">
										Total
									</div>
									<div className="font-semibold">
										{money(next.price)}
									</div>
								</div>
								<div className="bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded p-2">
									<div className="text-gray-600 dark:text-gray-300">
										Adelanto
									</div>
									<div className="font-semibold">
										{money(next.deposit)}
									</div>
								</div>
								<div className="bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded p-2">
									<div className="text-gray-600 dark:text-gray-300">
										Falta
									</div>
									<div className="font-semibold">
										{money(next.remaining)}
									</div>
								</div>
							</div>
							<div className="text-sm text-gray-700 dark:text-gray-200">
								Medio:{" "}
								<span className="font-medium">
									{next.payment_method || "-"}
								</span>
							</div>
							{next.notes ? (
								<div className="text-sm text-gray-700 dark:text-gray-200">
									Nota:{" "}
									<span className="font-medium">
										{next.notes}
									</span>
								</div>
							) : null}
						</div>
					) : (
						<div className="mt-3 text-gray-600 dark:text-gray-300">
							Sin reservas para hoy
						</div>
					)}
				</div>

				<div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
					<div className="text-sm text-gray-600 dark:text-gray-300">
						Cobros de reservas (hoy)
					</div>
					<div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
						<div className="bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded p-3">
							<div className="text-sm text-gray-600 dark:text-gray-300">
								Total
							</div>
							<div className="text-xl font-semibold">
								{money(data.reservations_total_today)}
							</div>
						</div>
						<div className="bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded p-3">
							<div className="text-sm text-gray-600 dark:text-gray-300">
								Adelantos
							</div>
							<div className="text-xl font-semibold">
								{money(data.reservations_deposit_today)}
							</div>
						</div>
						<div className="bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded p-3">
							<div className="text-sm text-gray-600 dark:text-gray-300">
								Falta
							</div>
							<div className="text-xl font-semibold">
								{money(data.reservations_remaining_today)}
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
