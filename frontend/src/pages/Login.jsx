import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { login } from "../services/api";

export default function Login() {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");
	const navigate = useNavigate();

	async function onSubmit(e) {
		e.preventDefault();
		setError("");
		try {
			const { token } = await login({ email, password });
			localStorage.setItem("token", token);
			navigate("/");
		} catch (e) {
			setError("Credenciales inválidas");
		}
	}

	return (
		<div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
			<form
				onSubmit={onSubmit}
				className="bg-white dark:bg-gray-900 shadow-sm rounded-lg p-6 w-full max-w-sm border border-gray-200 dark:border-gray-800"
			>
				<div className="mb-6">
					<h1 className="text-2xl font-semibold">Ingresar</h1>
					<p className="text-sm text-gray-500 dark:text-gray-300 mt-1">
						Accede con tu cuenta para gestionar reservas y ventas.
					</p>
				</div>
				{error && (
					<div className="text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded p-2 mb-4">
						{error}
					</div>
				)}
				<div className="mb-4">
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
				<button className="bg-blue-600 hover:bg-blue-700 transition text-white w-full py-2 rounded">
					Entrar
				</button>
				<div className="mt-4 text-sm text-gray-600 dark:text-gray-300">
					¿No tenés usuario?{" "}
					<Link
						className="text-blue-600 hover:underline"
						to="/register"
					>
						Crear usuario
					</Link>
				</div>
			</form>
		</div>
	);
}
