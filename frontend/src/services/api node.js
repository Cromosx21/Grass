//node
import axios from "axios";

const api = axios.create({
	baseURL: import.meta.env.VITE_API_URL || "http://localhost:4001",
});

api.interceptors.request.use((config) => {
	const token = localStorage.getItem("token");
	if (token) config.headers.Authorization = `Bearer ${token}`;
	return config;
});

export async function register(data) {
	const res = await api.post("/api/auth/register", data);
	return res.data;
}

export async function login(data) {
	const res = await api.post("/api/auth/login", data);
	return res.data;
}

export async function getDashboard() {
	const res = await api.get("/api/dashboard");
	return res.data;
}

export async function listCourts() {
	const res = await api.get("/api/courts");
	return res.data;
}

export async function listPublicCourts() {
	const res = await api.get("/api/courts/public");
	return res.data;
}

export async function createCourt(data) {
	const res = await api.post("/api/courts", data);
	return res.data;
}

export async function updateCourt(id, data) {
	const res = await api.put(`/api/courts/${id}`, data);
	return res.data;
}

export async function deleteCourt(id) {
	const res = await api.delete(`/api/courts/${id}`);
	return res.data;
}

export async function listReservations(params) {
	const res = await api.get("/api/reservations", { params });
	return res.data;
}

export async function listPublicReservations(params) {
	const res = await api.get("/api/reservations/public", { params });
	return res.data;
}

export async function listReservationsHistory(params) {
	const res = await api.get("/api/reservations/history", { params });
	return res.data;
}

export async function listSalesHistory(params) {
	const res = await api.get("/api/sales/history", { params });
	return res.data;
}

export async function listSales(params) {
	const res = await api.get("/api/sales", { params });
	return res.data;
}

export async function createReservation(data) {
	const res = await api.post("/api/reservations", data);
	return res.data;
}

export async function updateReservation(id, data) {
	const res = await api.put(`/api/reservations/${id}`, data);
	return res.data;
}

export async function deleteReservation(id) {
	const res = await api.delete(`/api/reservations/${id}`);
	return res.data;
}

export async function listProducts() {
	const res = await api.get("/api/products");
	return res.data;
}

export async function createProduct(data) {
	const res = await api.post("/api/products", data);
	return res.data;
}

export async function updateProduct(id, data) {
	const res = await api.put(`/api/products/${id}`, data);
	return res.data;
}

export async function deleteProduct(id) {
	const res = await api.delete(`/api/products/${id}`);
	return res.data;
}

export async function createSale(items, payment_method) {
	const payload = Array.isArray(items) ? { items } : { items: [] };
	if (payment_method) payload.payment_method = payment_method;
	const res = await api.post("/api/sales", payload);
	return res.data;
}

export async function listUsers() {
	const res = await api.get("/api/users");
	return res.data;
}

export async function updateUser(id, data) {
	const res = await api.put(`/api/users/${id}`, data);
	return res.data;
}

export default api;
