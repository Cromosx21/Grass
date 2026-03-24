import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { register } from "../services/api";
import {
	LuUserPlus,
	LuUser,
	LuMail,
	LuPhone,
	LuLock,
	LuCheck,
	LuCircleAlert,
} from "react-icons/lu";

export default function Register() {
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [phone, setPhone] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");
	const [message, setMessage] = useState("");
	const [loading, setLoading] = useState(false);
	const navigate = useNavigate();

	async function onSubmit(e) {
		e.preventDefault();
		setError("");
		setMessage("");
		const n = String(name || "").trim();
		const em = String(email || "").trim();
		if (!n || !em || !password) {
			setError("Completá nombre, email y contraseña.");
			return;
		}
		setLoading(true);
		try {
			await register({
				name: n,
				email: em,
				phone: String(phone || "").trim() || undefined,
				password,
			});
			setMessage("Usuario creado. Ahora podés iniciar sesión.");
			setTimeout(() => navigate("/login"), 800);
		} catch (e2) {
			setError(
				e2?.response?.data?.message ||
					"No se pudo registrar el usuario.",
			);
		} finally {
			setLoading(false);
		}
	}

	return (
		<div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 py-8">
			<form
				onSubmit={onSubmit}
				className="bg-white dark:bg-slate-900 shadow-xl rounded-2xl p-8 w-full max-w-sm border border-slate-200 dark:border-slate-800 transition-all"
			>
				<div className="mb-8 text-center">
					<div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
						<LuUserPlus size={28} />
					</div>
					<h1 className="text-2xl font-bold text-slate-900 dark:text-white">
						Crear cuenta
					</h1>
					<p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
						Registrá un nuevo usuario para el sistema.
					</p>
				</div>

				{error && (
					<div className="text-sm text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-lg p-3 mb-5 flex items-center gap-2">
						<LuCircleAlert size={16} />
						{error}
					</div>
				)}

				{message && (
					<div className="text-sm text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 rounded-lg p-3 mb-5 flex items-center gap-2">
						<LuCheck size={16} />
						{message}
					</div>
				)}

				<div className="space-y-4 mb-6">
					<div>
						<label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
							Nombre
						</label>
						<div className="relative">
							<LuUser
								className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
								size={18}
							/>
							<input
								className="w-full pl-10 pr-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors placeholder:text-slate-400"
								placeholder="Tu nombre"
								value={name}
								onChange={(e) => setName(e.target.value)}
							/>
						</div>
					</div>

					<div>
						<label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
							Email
						</label>
						<div className="relative">
							<LuMail
								className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
								size={18}
							/>
							<input
								className="w-full pl-10 pr-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors placeholder:text-slate-400"
								placeholder="usuario@demo.com"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
							/>
						</div>
					</div>

					<div>
						<label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
							Teléfono{" "}
							<span className="text-slate-400 font-normal">
								(opcional)
							</span>
						</label>
						<div className="relative">
							<LuPhone
								className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
								size={18}
							/>
							<input
								className="w-full pl-10 pr-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors placeholder:text-slate-400"
								placeholder="999999999"
								value={phone}
								onChange={(e) => setPhone(e.target.value)}
							/>
						</div>
					</div>

					<div>
						<label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
							Contraseña
						</label>
						<div className="relative">
							<LuLock
								className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
								size={18}
							/>
							<input
								className="w-full pl-10 pr-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors placeholder:text-slate-400"
								type="password"
								placeholder="••••••••"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
							/>
						</div>
					</div>
				</div>

				<button
					className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 transition-colors text-white font-medium py-2.5 rounded-xl shadow-sm flex justify-center items-center gap-2 disabled:opacity-70"
					disabled={loading}
				>
					{loading ? (
						<div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
					) : (
						"Crear cuenta"
					)}
				</button>

				<div className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
					¿Ya tienes cuenta?{" "}
					<Link
						className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
						to="/login"
					>
						Iniciar sesión
					</Link>
				</div>
			</form>
		</div>
	);
}
