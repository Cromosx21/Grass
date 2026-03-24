import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { register } from "../services/api";

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
			setTimeout(() => navigate("/login"), 400);
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
		<div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
			<form
				onSubmit={onSubmit}
				className="bg-white dark:bg-gray-900 shadow-sm rounded-lg p-6 w-full max-w-sm border border-gray-200 dark:border-gray-800"
			>
				<div className="mb-6">
					<h1 className="text-2xl font-semibold">Crear usuario</h1>
					<p className="text-sm text-gray-500 dark:text-gray-300 mt-1">
						Registrá un nuevo usuario para el sistema.
					</p>
				</div>

				{error ? (
					<div className="text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded p-2 mb-4">
						{error}
					</div>
				) : null}
				{message ? (
					<div className="text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-900/60 rounded p-2 mb-4">
						{message}
					</div>
				) : null}

				<div className="mb-3">
					<label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
						Nombre
					</label>
					<input
						className="border border-gray-300 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 rounded w-full p-2 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
						placeholder="Nombre"
						value={name}
						onChange={(e) => setName(e.target.value)}
					/>
				</div>

				<div className="mb-3">
					<label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
						Email
					</label>
					<input
						className="border border-gray-300 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 rounded w-full p-2 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
						placeholder="usuario@demo.com"
						value={email}
						onChange={(e) => setEmail(e.target.value)}
					/>
				</div>

				<div className="mb-3">
					<label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
						Teléfono (opcional)
					</label>
					<input
						className="border border-gray-300 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 rounded w-full p-2 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
						placeholder="999999999"
						value={phone}
						onChange={(e) => setPhone(e.target.value)}
					/>
				</div>

				<div className="mb-6">
					<label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
						Contraseña
					</label>
					<input
						className="border border-gray-300 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 rounded w-full p-2 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
						type="password"
						placeholder="••••••••"
						value={password}
						onChange={(e) => setPassword(e.target.value)}
					/>
				</div>

				<button
					className="bg-blue-600 hover:bg-blue-700 transition text-white w-full py-2 rounded disabled:opacity-50"
					disabled={loading}
				>
					{loading ? "Creando..." : "Crear usuario"}
				</button>

				<div className="mt-4 text-sm text-gray-600 dark:text-gray-300">
					¿Ya tenés cuenta?{" "}
					<Link className="text-blue-600 hover:underline" to="/login">
						Iniciar sesión
					</Link>
				</div>
			</form>
		</div>
	);
}

