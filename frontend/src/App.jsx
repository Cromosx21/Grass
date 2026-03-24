import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import MainLayout from "./layouts/MainLayout.jsx";
import Home from "./pages/Home.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Reservations from "./pages/Reservations.jsx";
import Sales from "./pages/Sales.jsx";
import Settings from "./pages/Settings.jsx";
import History from "./pages/History.jsx";

function PrivateRoute({ children }) {
	const token = localStorage.getItem("token");
	if (!token) return <Navigate to="/login" replace />;
	return children;
}

export default function App() {
	return (
		<Routes>
			<Route path="/" element={<Home />} />
			<Route path="/login" element={<Login />} />
			<Route path="/register" element={<Register />} />

			<Route path="/reservas" element={<Navigate to="/admin/reservas" replace />} />
			<Route path="/historial" element={<Navigate to="/admin/historial" replace />} />
			<Route path="/ventas" element={<Navigate to="/admin/ventas" replace />} />
			<Route
				path="/configuracion"
				element={<Navigate to="/admin/configuracion" replace />}
			/>

			<Route
				path="/admin"
				element={
					<PrivateRoute>
						<MainLayout />
					</PrivateRoute>
				}
			>
				<Route index element={<Dashboard />} />
				<Route path="reservas" element={<Reservations />} />
				<Route path="historial" element={<History />} />
				<Route path="ventas" element={<Sales />} />
				<Route path="configuracion" element={<Settings />} />
			</Route>
		</Routes>
	);
}
