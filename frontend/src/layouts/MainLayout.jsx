import React, { useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
	LuLayoutDashboard,
	LuCalendarDays,
	LuClock,
	LuCircleDollarSign,
	LuSettings,
	LuLogOut,
	LuSun,
	LuMoon,
} from "react-icons/lu";

export default function MainLayout() {
	const navigate = useNavigate();
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

	function logout() {
		localStorage.removeItem("token");
		navigate("/");
	}

	const linkClass = useMemo(
		() =>
			({ isActive }) =>
				isActive
					? "px-3 py-2 rounded-lg bg-blue-600 text-white font-medium flex items-center gap-2 transition-colors shadow-sm"
					: "px-3 py-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium flex items-center gap-2 transition-colors",
		[],
	);

	return (
		<div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 transition-colors duration-200">
			<header className="sticky top-0 z-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-sm">
				<div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
					<div className="font-bold text-xl tracking-tight text-blue-600 dark:text-blue-500">
						Grass
					</div>
					<nav className="hidden md:flex items-center gap-1">
						<NavLink to="/admin" end className={linkClass}>
							<LuLayoutDashboard size={18} />
							Dashboard
						</NavLink>
						<NavLink to="/admin/reservas" className={linkClass}>
							<LuCalendarDays size={18} />
							Reservas
						</NavLink>
						<NavLink to="/admin/historial" className={linkClass}>
							<LuClock size={18} />
							Historial
						</NavLink>
						<NavLink to="/admin/ventas" className={linkClass}>
							<LuCircleDollarSign size={18} />
							Ventas
						</NavLink>
						<NavLink
							to="/admin/configuracion"
							className={linkClass}
						>
							<LuSettings size={18} />
							Configuración
						</NavLink>
					</nav>
					<div className="flex items-center gap-2">
						<button
							type="button"
							className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-center"
							onClick={() =>
								setTheme((t) =>
									t === "dark" ? "light" : "dark",
								)
							}
							aria-label="Cambiar tema"
						>
							{theme === "dark" ? (
								<LuSun size={18} className="text-amber-500" />
							) : (
								<LuMoon size={18} className="text-blue-600" />
							)}
						</button>
						<button
							onClick={logout}
							className="px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 flex items-center gap-2 transition-colors"
						>
							<LuLogOut size={18} />
							<span className="hidden sm:inline">Salir</span>
						</button>
					</div>
				</div>
				<div className="md:hidden px-4 pb-3 overflow-x-auto">
					<nav className="flex items-center gap-2 whitespace-nowrap">
						<NavLink to="/admin" end className={linkClass}>
							<LuLayoutDashboard size={18} />
							Dashboard
						</NavLink>
						<NavLink to="/admin/reservas" className={linkClass}>
							<LuCalendarDays size={18} />
							Reservas
						</NavLink>
						<NavLink to="/admin/historial" className={linkClass}>
							<LuClock size={18} />
							Historial
						</NavLink>
						<NavLink to="/admin/ventas" className={linkClass}>
							<LuCircleDollarSign size={18} />
							Ventas
						</NavLink>
						<NavLink
							to="/admin/configuracion"
							className={linkClass}
						>
							<LuSettings size={18} />
							Configuración
						</NavLink>
					</nav>
				</div>
			</header>
			<main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
				<Outlet />
			</main>
		</div>
	);
}
