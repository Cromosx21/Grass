import React, { useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";

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
		navigate("/login");
	}

	const linkClass = useMemo(
		() =>
			({ isActive }) =>
				isActive
					? "px-3 py-2 rounded bg-blue-600 text-white"
					: "px-3 py-2 rounded text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800",
		[],
	);

	return (
		<div className="min-h-screen bg-white text-gray-900 dark:bg-gray-950 dark:text-gray-100">
			<header className="sticky top-0 z-10 bg-white/90 dark:bg-gray-900/80 backdrop-blur border-b border-gray-200 dark:border-gray-800">
				<div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
					<div className="font-semibold tracking-tight">Grass</div>
					<nav className="hidden md:flex items-center gap-2">
						<NavLink to="/" end className={linkClass}>
							Dashboard
						</NavLink>
						<NavLink to="/reservas" className={linkClass}>
							Reservas
						</NavLink>
						<NavLink to="/historial" className={linkClass}>
							Historial
						</NavLink>
						<NavLink to="/ventas" className={linkClass}>
							Ventas
						</NavLink>
						<NavLink to="/configuracion" className={linkClass}>
							Configuración
						</NavLink>
					</nav>
					<div className="flex items-center gap-2">
						<button
							type="button"
							className="px-3 py-2 rounded border border-gray-300 dark:border-gray-700 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2"
							onClick={() =>
								setTheme((t) => (t === "dark" ? "light" : "dark"))
							}
						>
							{theme === "dark" ? (
								<svg
									width="18"
									height="18"
									viewBox="0 0 24 24"
									fill="none"
									xmlns="http://www.w3.org/2000/svg"
									aria-hidden="true"
									className="text-yellow-500"
								>
									<path
										d="M12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12Z"
										stroke="currentColor"
										strokeWidth="2"
									/>
									<path
										d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19"
										stroke="currentColor"
										strokeWidth="2"
										strokeLinecap="round"
									/>
								</svg>
							) : (
								<svg
									width="18"
									height="18"
									viewBox="0 0 24 24"
									fill="none"
									xmlns="http://www.w3.org/2000/svg"
									aria-hidden="true"
									className="text-indigo-500"
								>
									<path
										d="M21 13.5A7.5 7.5 0 0 1 10.5 3a6.5 6.5 0 1 0 10.5 10.5Z"
										stroke="currentColor"
										strokeWidth="2"
										strokeLinejoin="round"
									/>
								</svg>
							)}
							{theme === "dark" ? "Modo día" : "Modo noche"}
						</button>
						<button
							onClick={logout}
							className="px-3 py-2 rounded text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 flex items-center gap-2"
						>
							<svg
								width="18"
								height="18"
								viewBox="0 0 24 24"
								fill="none"
								xmlns="http://www.w3.org/2000/svg"
								aria-hidden="true"
							>
								<path
									d="M10 7V5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7a2 2 0 0 1-2-2v-2"
									stroke="currentColor"
									strokeWidth="2"
									strokeLinecap="round"
									strokeLinejoin="round"
								/>
								<path
									d="M14 12H3m0 0 3-3m-3 3 3 3"
									stroke="currentColor"
									strokeWidth="2"
									strokeLinecap="round"
									strokeLinejoin="round"
								/>
							</svg>
							Salir
						</button>
					</div>
				</div>
				<div className="md:hidden px-4 pb-3">
					<nav className="flex flex-wrap gap-2">
						<NavLink to="/" end className={linkClass}>
							Dashboard
						</NavLink>
						<NavLink to="/reservas" className={linkClass}>
							Reservas
						</NavLink>
						<NavLink to="/historial" className={linkClass}>
							Historial
						</NavLink>
						<NavLink to="/ventas" className={linkClass}>
							Ventas
						</NavLink>
						<NavLink to="/configuracion" className={linkClass}>
							Configuración
						</NavLink>
					</nav>
				</div>
			</header>
			<main className="max-w-6xl mx-auto p-4">
				<Outlet />
			</main>
		</div>
	);
}
