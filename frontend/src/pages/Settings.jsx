import React, { useEffect, useState } from "react";
import {
	listCourts,
	createCourt,
	updateCourt,
	deleteCourt,
	listProducts,
	createProduct,
	updateProduct,
	deleteProduct,
	listReservationsHistory,
	listUsers,
	updateUser,
} from "../services/api";
import {
	LuPlus,
	LuPencil,
	LuTrash2,
	LuCircleCheck,
	LuCircleAlert,
	LuClock,
	LuDollarSign,
	LuUser,
	LuMail,
	LuPhone,
	LuSave,
	LuX,
	LuPackage,
	LuLayoutDashboard,
	LuUsers,
	LuSearch,
} from "react-icons/lu";

const fmtMoney = new Intl.NumberFormat("es-PE", {
	style: "currency",
	currency: "PEN",
	minimumFractionDigits: 2,
	maximumFractionDigits: 2,
});

function money(v) {
	return fmtMoney.format(Number(v || 0));
}

function formatISODateLocal(d) {
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, "0");
	const day = String(d.getDate()).padStart(2, "0");
	return `${y}-${m}-${day}`;
}

function addDays(dateStr, deltaDays) {
	const d = new Date(`${dateStr}T12:00:00`);
	if (Number.isNaN(d.getTime())) return dateStr;
	d.setDate(d.getDate() + deltaDays);
	return formatISODateLocal(d);
}

function nowTimeHHMMSS() {
	const d = new Date();
	const hh = String(d.getHours()).padStart(2, "0");
	const mm = String(d.getMinutes()).padStart(2, "0");
	const ss = String(d.getSeconds()).padStart(2, "0");
	return `${hh}:${mm}:${ss}`;
}

export default function Settings() {
	const [courts, setCourts] = useState([]);
	const [products, setProducts] = useState([]);
	const [users, setUsers] = useState([]);
	const [cMessage, setCMessage] = useState("");
	const [cError, setCError] = useState("");
	const [pMessage, setPMessage] = useState("");
	const [pError, setPError] = useState("");
	const [cForm, setCForm] = useState({
		name: "",
		day_price: 0,
		night_price: 0,
		open_time: "07:00",
		close_time: "22:00",
	});
	const [pForm, setPForm] = useState({ name: "", price: 0, stock: 0 });
	const [pQ, setPQ] = useState("");
	const [cEditId, setCEditId] = useState(null);
	const [cEditForm, setCEditForm] = useState({
		name: "",
		day_price: "",
		night_price: "",
		open_time: "07:00",
		close_time: "22:00",
		status: "active",
	});
	const [pEditId, setPEditId] = useState(null);
	const [pEditForm, setPEditForm] = useState({
		name: "",
		price: "",
		stock: "",
		status: "active",
	});
	const [uForm, setUForm] = useState({
		id: "",
		name: "",
		email: "",
		phone: "",
		password: "",
	});
	const [uMessage, setUMessage] = useState("");
	const [uError, setUError] = useState("");
	const [tab, setTab] = useState("canchas");
	const [deleteOpen, setDeleteOpen] = useState(false);
	const [deleteKind, setDeleteKind] = useState(null);
	const [deleteItem, setDeleteItem] = useState(null);
	const [deleteText, setDeleteText] = useState("");
	const [deleteError, setDeleteError] = useState("");
	const [deleteLoading, setDeleteLoading] = useState(false);
	const [deleteChecking, setDeleteChecking] = useState(false);
	const [deleteBlocked, setDeleteBlocked] = useState(false);
	const [deleteBlockedReason, setDeleteBlockedReason] = useState("");

	const deletePhrase =
		deleteKind === "court"
			? "Eliminar Cancha"
			: deleteKind === "product"
				? "Eliminar Producto"
				: "";

	async function refresh() {
		const [cs, ps, us] = await Promise.all([
			listCourts(),
			listProducts(),
			listUsers().catch(() => []),
		]);
		setCourts(cs);
		setProducts(ps);
		setUsers(us);
	}

	useEffect(() => {
		refresh();
	}, []);

	function closeDelete() {
		if (deleteLoading) return;
		setDeleteOpen(false);
		setDeleteKind(null);
		setDeleteItem(null);
		setDeleteText("");
		setDeleteError("");
		setDeleteChecking(false);
		setDeleteBlocked(false);
		setDeleteBlockedReason("");
	}

	async function checkCourtDeletable(courtId) {
		setDeleteChecking(true);
		setDeleteBlocked(false);
		setDeleteBlockedReason("");
		try {
			const from = formatISODateLocal(new Date());
			const to = addDays(from, 365);
			const rows = await listReservationsHistory({
				from,
				to,
				court_id: courtId,
			});
			const today = formatISODateLocal(new Date());
			const nowTime = nowTimeHHMMSS();
			const pending = (Array.isArray(rows) ? rows : []).some((r) => {
				if (String(r?.status || "") === "cancelled") return false;
				const date = String(r?.date || "");
				if (date > today) return true;
				if (date < today) return false;
				return String(r?.end_time || "00:00:00") > nowTime;
			});
			if (pending) {
				setDeleteBlocked(true);
				setDeleteBlockedReason(
					"No se puede eliminar la cancha porque tiene reservas pendientes.",
				);
			}
		} catch {
		} finally {
			setDeleteChecking(false);
		}
	}

	function openDeleteCourt(c) {
		setDeleteKind("court");
		setDeleteItem({ id: c.id, name: c.name || "" });
		setDeleteText("");
		setDeleteError("");
		setDeleteBlocked(false);
		setDeleteBlockedReason("");
		setDeleteOpen(true);
		checkCourtDeletable(c.id);
	}

	function openDeleteProduct(p) {
		setDeleteKind("product");
		setDeleteItem({ id: p.id, name: p.name || "" });
		setDeleteText("");
		setDeleteError("");
		setDeleteBlocked(false);
		setDeleteBlockedReason("");
		setDeleteOpen(true);
	}

	async function confirmDelete() {
		if (!deleteKind || !deleteItem?.id) return;
		if (deleteText !== deletePhrase) {
			setDeleteError(`Escribí exactamente "${deletePhrase}".`);
			return;
		}
		if (deleteBlocked) {
			setDeleteError(deleteBlockedReason);
			return;
		}
		setDeleteLoading(true);
		setDeleteError("");
		try {
			if (deleteKind === "court") {
				await deleteCourt(deleteItem.id);
				setCMessage("Cancha eliminada correctamente.");
				setCError("");
				if (String(cEditId) === String(deleteItem.id)) setCEditId(null);
			} else if (deleteKind === "product") {
				await deleteProduct(deleteItem.id);
				setPMessage("Producto eliminado correctamente.");
				setPError("");
				if (String(pEditId) === String(deleteItem.id)) setPEditId(null);
			}
			closeDelete();
			await refresh();
		} catch (e) {
			setDeleteError(
				e?.response?.data?.message ||
					"No se pudo eliminar el registro.",
			);
		} finally {
			setDeleteLoading(false);
		}
	}

	const hourOptions = Array.from(
		{ length: 24 },
		(_, h) => `${String(h).padStart(2, "0")}:00`,
	);

	function timeToMinutes(t) {
		const s = String(t || "");
		const [hh, mm] = s.split(":");
		const h = Number(hh);
		const m = Number(mm);
		if (!Number.isFinite(h) || !Number.isFinite(m)) return NaN;
		return h * 60 + m;
	}

	async function addCourt(e) {
		e.preventDefault();
		setCMessage("");
		setCError("");
		if (!String(cForm.name || "").trim()) {
			setCError("El nombre es requerido.");
			return;
		}
		const openM = timeToMinutes(cForm.open_time);
		const closeM = timeToMinutes(cForm.close_time);
		if (!Number.isFinite(openM) || !Number.isFinite(closeM)) {
			setCError("El horario es inválido.");
			return;
		}
		if (closeM <= openM) {
			setCError("El cierre debe ser después de la apertura.");
			return;
		}
		try {
			await createCourt({
				name: String(cForm.name).trim(),
				day_price: cForm.day_price,
				night_price: cForm.night_price,
				open_time: cForm.open_time,
				close_time: cForm.close_time,
			});
			setCMessage("Cancha creada correctamente.");
			setCForm({
				name: "",
				day_price: 0,
				night_price: 0,
				open_time: "07:00",
				close_time: "22:00",
			});
			refresh();
		} catch (err) {
			setCError(
				err?.response?.data?.message || "No se pudo crear la cancha",
			);
		}
	}

	async function addProduct(e) {
		e.preventDefault();
		setPMessage("");
		setPError("");
		if (!String(pForm.name || "").trim()) {
			setPError("El nombre es requerido.");
			return;
		}
		try {
			await createProduct({
				name: String(pForm.name).trim(),
				price: pForm.price,
				stock: pForm.stock,
			});
			setPMessage("Producto creado correctamente.");
			setPForm({ name: "", price: 0, stock: 0 });
			refresh();
		} catch (err) {
			setPError(
				err?.response?.data?.message || "No se pudo crear el producto",
			);
		}
	}

	async function onEditUser(u) {
		setUMessage("");
		setUError("");
		setUForm({
			id: u.id,
			name: u.name || "",
			email: u.email || "",
			phone: u.phone || "",
			password: "",
		});
	}

	async function onUpdateUser(e) {
		e.preventDefault();
		setUMessage("");
		setUError("");
		const id = Number(uForm.id);
		if (!id) {
			setUError("Selecciona un usuario para editar.");
			return;
		}
		const payload = {
			name: String(uForm.name || "").trim() || undefined,
			email: String(uForm.email || "").trim() || undefined,
			phone: String(uForm.phone || "").trim() || undefined,
		};
		if (String(uForm.password || "").trim())
			payload.password = uForm.password;
		try {
			await updateUser(id, payload);
			setUMessage("Usuario actualizado correctamente.");
			setUForm((f) => ({ ...f, password: "" }));
			refresh();
		} catch (err) {
			setUError(
				err?.response?.data?.message ||
					"No se pudo actualizar el usuario",
			);
		}
	}

	return (
		<div className="space-y-6">
			{/* Cabecera */}
			<div>
				<h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
					Configuración
				</h1>
				<p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
					Administra las canchas, productos y usuarios del sistema.
				</p>
			</div>

			{/* Navegación de pestañas */}
			<div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-fit">
				{[
					{
						id: "canchas",
						label: "Canchas",
						icon: LuLayoutDashboard,
					},
					{ id: "productos", label: "Productos", icon: LuPackage },
					{ id: "usuarios", label: "Usuarios", icon: LuUsers },
				].map((t) => (
					<button
						key={t.id}
						type="button"
						className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
							tab === t.id
								? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm"
								: "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
						}`}
						onClick={() => setTab(t.id)}
					>
						<t.icon size={18} />
						{t.label}
					</button>
				))}
			</div>

			{/* Contenido Canchas */}
			{tab === "canchas" && (
				<div className="flex flex-col lg:flex-row gap-6">
					<div className="w-full lg:w-[400px] shrink-0">
						<div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
							<div className="bg-slate-50 dark:bg-slate-800/50 px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 font-semibold text-slate-800 dark:text-slate-200">
								<LuPlus className="text-blue-500" /> Nueva
								Cancha
							</div>
							<form onSubmit={addCourt} className="p-5 space-y-4">
								{cError && (
									<div className="text-sm text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-lg p-3 flex items-center gap-2">
										<LuCircleAlert size={16} /> {cError}
									</div>
								)}
								{cMessage && (
									<div className="text-sm text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 rounded-lg p-3 flex items-center gap-2">
										<LuCircleCheck size={16} /> {cMessage}
									</div>
								)}

								<div>
									<label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
										Nombre
									</label>
									<input
										className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
										placeholder="Ej: Cancha 1"
										value={cForm.name}
										onChange={(e) =>
											setCForm({
												...cForm,
												name: e.target.value,
											})
										}
									/>
								</div>

								<div className="grid grid-cols-2 gap-4">
									<div>
										<label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
											Precio Día
										</label>
										<div className="relative">
											<LuDollarSign
												className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
												size={16}
											/>
											<input
												type="number"
												step="0.01"
												className="w-full pl-9 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
												value={cForm.day_price}
												onChange={(e) =>
													setCForm({
														...cForm,
														day_price:
															e.target.value,
													})
												}
											/>
										</div>
									</div>
									<div>
										<label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
											Precio Noche
										</label>
										<div className="relative">
											<LuDollarSign
												className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
												size={16}
											/>
											<input
												type="number"
												step="0.01"
												className="w-full pl-9 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
												value={cForm.night_price}
												onChange={(e) =>
													setCForm({
														...cForm,
														night_price:
															e.target.value,
													})
												}
											/>
										</div>
									</div>
								</div>

								<div>
									<label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
										<LuClock size={16} /> Horario de
										Atención
									</label>
									<div className="grid grid-cols-2 gap-3">
										<select
											className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
											value={cForm.open_time}
											onChange={(e) =>
												setCForm({
													...cForm,
													open_time: e.target.value,
												})
											}
										>
											{hourOptions.map((t) => (
												<option key={t} value={t}>
													{t}
												</option>
											))}
										</select>
										<select
											className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
											value={cForm.close_time}
											onChange={(e) =>
												setCForm({
													...cForm,
													close_time: e.target.value,
												})
											}
										>
											{hourOptions.map((t) => (
												<option key={t} value={t}>
													{t}
												</option>
											))}
										</select>
									</div>
								</div>

								<button className="w-full bg-blue-600 hover:bg-blue-700 transition-colors text-white font-medium py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-sm">
									<LuPlus size={18} /> Agregar Cancha
								</button>
							</form>
						</div>
					</div>

					<div className="flex-1 space-y-4">
						<h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
							<LuLayoutDashboard className="text-blue-500" />{" "}
							Lista de Canchas
						</h3>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							{courts.map((c) => (
								<div
									key={c.id}
									className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm p-5 transition-all hover:shadow-md"
								>
									{cEditId === c.id ? (
										<div className="space-y-4">
											<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
												<div className="sm:col-span-2">
													<label className="block text-xs font-medium text-slate-500 mb-1">
														Nombre
													</label>
													<input
														className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-sm"
														value={cEditForm.name}
														onChange={(e) =>
															setCEditForm(
																(f) => ({
																	...f,
																	name: e
																		.target
																		.value,
																}),
															)
														}
													/>
												</div>
												<div>
													<label className="block text-xs font-medium text-slate-500 mb-1">
														P. Día
													</label>
													<input
														type="number"
														className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-sm"
														value={
															cEditForm.day_price
														}
														onChange={(e) =>
															setCEditForm(
																(f) => ({
																	...f,
																	day_price:
																		e.target
																			.value,
																}),
															)
														}
													/>
												</div>
												<div>
													<label className="block text-xs font-medium text-slate-500 mb-1">
														P. Noche
													</label>
													<input
														type="number"
														className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-sm"
														value={
															cEditForm.night_price
														}
														onChange={(e) =>
															setCEditForm(
																(f) => ({
																	...f,
																	night_price:
																		e.target
																			.value,
																}),
															)
														}
													/>
												</div>
												<div>
													<label className="block text-xs font-medium text-slate-500 mb-1">
														Abre
													</label>
													<select
														className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-sm"
														value={
															cEditForm.open_time
														}
														onChange={(e) =>
															setCEditForm(
																(f) => ({
																	...f,
																	open_time:
																		e.target
																			.value,
																}),
															)
														}
													>
														{hourOptions.map(
															(t) => (
																<option
																	key={t}
																	value={t}
																>
																	{t}
																</option>
															),
														)}
													</select>
												</div>
												<div>
													<label className="block text-xs font-medium text-slate-500 mb-1">
														Cierra
													</label>
													<select
														className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-sm"
														value={
															cEditForm.close_time
														}
														onChange={(e) =>
															setCEditForm(
																(f) => ({
																	...f,
																	close_time:
																		e.target
																			.value,
																}),
															)
														}
													>
														{hourOptions.map(
															(t) => (
																<option
																	key={t}
																	value={t}
																>
																	{t}
																</option>
															),
														)}
													</select>
												</div>
											</div>
											<div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
												<button
													className="px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 flex items-center gap-1"
													onClick={() =>
														setCEditId(null)
													}
												>
													<LuX size={16} /> Cancelar
												</button>
												<button
													className="px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg shadow-sm hover:bg-blue-700 flex items-center gap-1"
													onClick={async () => {
														try {
															const openM =
																timeToMinutes(
																	cEditForm.open_time,
																);
															const closeM =
																timeToMinutes(
																	cEditForm.close_time,
																);
															if (
																closeM <= openM
															) {
																setCError(
																	"El cierre debe ser después de la apertura.",
																);
																return;
															}
															await updateCourt(
																c.id,
																{
																	name: cEditForm.name.trim(),
																	day_price:
																		cEditForm.day_price,
																	night_price:
																		cEditForm.night_price,
																	open_time:
																		cEditForm.open_time,
																	close_time:
																		cEditForm.close_time,
																},
															);
															setCMessage(
																"Cancha actualizada",
															);
															setCEditId(null);
															refresh();
														} catch (err) {
															setCError(
																"Error al actualizar",
															);
														}
													}}
												>
													<LuSave size={16} /> Guardar
												</button>
											</div>
										</div>
									) : (
										<div className="flex flex-col h-full justify-between">
											<div>
												<div className="flex items-center justify-between mb-2">
													<div className="font-bold text-slate-900 dark:text-white text-lg">
														{c.name}
													</div>
													<div className="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold px-2 py-1 rounded-full uppercase">
														Activa
													</div>
												</div>
												<div className="space-y-1.5">
													<div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
														<LuDollarSign
															size={14}
															className="text-slate-400"
														/>
														<span>
															Día:{" "}
															<span className="font-semibold text-slate-900 dark:text-slate-200">
																{money(
																	c.day_price,
																)}
															</span>
														</span>
														<span className="text-slate-300">
															|
														</span>
														<span>
															Noche:{" "}
															<span className="font-semibold text-slate-900 dark:text-slate-200">
																{money(
																	c.night_price,
																)}
															</span>
														</span>
													</div>
													<div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
														<LuClock
															size={14}
															className="text-slate-400"
														/>
														<span>
															Horario:{" "}
															<span className="font-medium text-slate-900 dark:text-slate-200">
																{String(
																	c.open_time ||
																		"07:00",
																).slice(
																	0,
																	5,
																)}{" "}
																-{" "}
																{String(
																	c.close_time ||
																		"22:00",
																).slice(0, 5)}
															</span>
														</span>
													</div>
												</div>
											</div>
											<div className="flex items-center justify-end gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
												<button
													className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
													onClick={() => {
														setCEditId(c.id);
														setCEditForm({
															name: c.name || "",
															day_price:
																c.day_price ??
																0,
															night_price:
																c.night_price ??
																0,
															open_time: String(
																c.open_time ||
																	"07:00",
															).slice(0, 5),
															close_time: String(
																c.close_time ||
																	"22:00",
															).slice(0, 5),
															status:
																c.status ||
																"active",
														});
													}}
													title="Editar"
												>
													<LuPencil size={18} />
												</button>
												<button
													className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
													onClick={() =>
														openDeleteCourt(c)
													}
													title="Eliminar"
												>
													<LuTrash2 size={18} />
												</button>
											</div>
										</div>
									)}
								</div>
							))}
						</div>
					</div>
				</div>
			)}

			{/* Contenido Productos */}
			{tab === "productos" && (
				<div className="flex flex-col lg:flex-row gap-6">
					<div className="w-full lg:w-[400px] shrink-0">
						<div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
							<div className="bg-slate-50 dark:bg-slate-800/50 px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 font-semibold text-slate-800 dark:text-slate-200">
								<LuPlus className="text-blue-500" /> Nuevo
								Producto
							</div>
							<form
								onSubmit={addProduct}
								className="p-5 space-y-4"
							>
								{pError && (
									<div className="text-sm text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-lg p-3 flex items-center gap-2">
										<LuCircleAlert size={16} /> {pError}
									</div>
								)}
								{pMessage && (
									<div className="text-sm text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 rounded-lg p-3 flex items-center gap-2">
										<LuCircleCheck size={16} /> {pMessage}
									</div>
								)}

								<div>
									<label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
										Nombre
									</label>
									<input
										className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
										placeholder="Ej: Gaseosa 500ml"
										value={pForm.name}
										onChange={(e) =>
											setPForm({
												...pForm,
												name: e.target.value,
											})
										}
									/>
								</div>

								<div className="grid grid-cols-2 gap-4">
									<div>
										<label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
											Precio
										</label>
										<div className="relative">
											<LuDollarSign
												className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
												size={16}
											/>
											<input
												type="number"
												step="0.01"
												className="w-full pl-9 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
												value={pForm.price}
												onChange={(e) =>
													setPForm({
														...pForm,
														price: e.target.value,
													})
												}
											/>
										</div>
									</div>
									<div>
										<label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
											Stock Inicial
										</label>
										<input
											type="number"
											className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
											value={pForm.stock}
											onChange={(e) =>
												setPForm({
													...pForm,
													stock: e.target.value,
												})
											}
										/>
									</div>
								</div>

								<button className="w-full bg-blue-600 hover:bg-blue-700 transition-colors text-white font-medium py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-sm">
									<LuPlus size={18} /> Agregar Producto
								</button>
							</form>
						</div>
					</div>

					<div className="flex-1 space-y-4">
						<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
							<h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
								<LuPackage className="text-blue-500" />{" "}
								Inventario
							</h3>
							<div className="relative w-full sm:w-64">
								<LuSearch
									className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
									size={16}
								/>
								<input
									className="w-full pl-9 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
									placeholder="Buscar producto..."
									value={pQ}
									onChange={(e) => setPQ(e.target.value)}
								/>
							</div>
						</div>

						<div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
							{products
								.filter((p) =>
									String(p.name || "")
										.toLowerCase()
										.includes(
											String(pQ || "").toLowerCase(),
										),
								)
								.map((p) => (
									<div
										key={p.id}
										className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm p-4 transition-all hover:shadow-md"
									>
										{pEditId === p.id ? (
											<div className="space-y-3">
												<input
													className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-sm"
													value={pEditForm.name}
													onChange={(e) =>
														setPEditForm((f) => ({
															...f,
															name: e.target
																.value,
														}))
													}
												/>
												<div className="grid grid-cols-2 gap-2">
													<input
														type="number"
														step="0.01"
														className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-sm"
														value={pEditForm.price}
														onChange={(e) =>
															setPEditForm(
																(f) => ({
																	...f,
																	price: e
																		.target
																		.value,
																}),
															)
														}
													/>
													<input
														type="number"
														className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-sm"
														value={pEditForm.stock}
														onChange={(e) =>
															setPEditForm(
																(f) => ({
																	...f,
																	stock: e
																		.target
																		.value,
																}),
															)
														}
													/>
												</div>
												<div className="flex justify-end gap-2 pt-2">
													<button
														className="text-xs font-medium text-slate-500 hover:text-slate-700"
														onClick={() =>
															setPEditId(null)
														}
													>
														Cancelar
													</button>
													<button
														className="bg-blue-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm"
														onClick={async () => {
															try {
																await updateProduct(
																	p.id,
																	{
																		name: pEditForm.name.trim(),
																		price: pEditForm.price,
																		stock: pEditForm.stock,
																	},
																);
																setPMessage(
																	"Producto actualizado",
																);
																setPEditId(
																	null,
																);
																refresh();
															} catch (err) {
																setPError(
																	"Error al actualizar",
																);
															}
														}}
													>
														Guardar
													</button>
												</div>
											</div>
										) : (
											<div className="flex flex-col h-full justify-between">
												<div>
													<div className="flex justify-between items-start mb-2">
														<div className="font-bold text-slate-900 dark:text-white truncate pr-2">
															{p.name}
														</div>
														<div className="text-blue-600 dark:text-blue-400 font-bold">
															{money(p.price)}
														</div>
													</div>
													<div className="flex items-center gap-1.5 text-sm">
														<span className="text-slate-500">
															Stock:
														</span>
														<span
															className={`font-bold ${Number(p.stock || 0) <= 5 ? "text-red-500" : "text-emerald-500"}`}
														>
															{Number(
																p.stock || 0,
															)}
														</span>
													</div>
												</div>
												<div className="flex items-center justify-end gap-1 mt-4">
													<button
														className="p-2 text-slate-400 hover:text-blue-600 transition-colors"
														onClick={() => {
															setPEditId(p.id);
															setPEditForm({
																name:
																	p.name ||
																	"",
																price:
																	p.price ??
																	0,
																stock:
																	p.stock ??
																	0,
																status:
																	p.status ||
																	"active",
															});
														}}
													>
														<LuPencil size={16} />
													</button>
													<button
														className="p-2 text-slate-400 hover:text-red-600 transition-colors"
														onClick={() =>
															openDeleteProduct(p)
														}
													>
														<LuTrash2 size={16} />
													</button>
												</div>
											</div>
										)}
									</div>
								))}
						</div>
					</div>
				</div>
			)}

			{/* Contenido Usuarios */}
			{tab === "usuarios" && (
				<div className="flex flex-col lg:flex-row gap-6">
					<div className="w-full lg:w-[400px] shrink-0">
						<div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
							<div className="bg-slate-50 dark:bg-slate-800/50 px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 font-semibold text-slate-800 dark:text-slate-200">
								<LuPencil className="text-blue-500" /> Editar
								Perfil
							</div>
							<form
								onSubmit={onUpdateUser}
								className="p-5 space-y-4"
							>
								{uError && (
									<div className="text-sm text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-lg p-3 flex items-center gap-2">
										<LuCircleAlert size={16} /> {uError}
									</div>
								)}
								{uMessage && (
									<div className="text-sm text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 rounded-lg p-3 flex items-center gap-2">
										<LuCircleCheck size={16} /> {uMessage}
									</div>
								)}

								<div>
									<label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
										<LuUser
											size={16}
											className="text-slate-400"
										/>{" "}
										Nombre
									</label>
									<input
										className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
										value={uForm.name}
										onChange={(e) =>
											setUForm((f) => ({
												...f,
												name: e.target.value,
											}))
										}
									/>
								</div>

								<div>
									<label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
										<LuMail
											size={16}
											className="text-slate-400"
										/>{" "}
										Email
									</label>
									<input
										className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
										value={uForm.email}
										onChange={(e) =>
											setUForm((f) => ({
												...f,
												email: e.target.value,
											}))
										}
									/>
								</div>

								<div>
									<label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
										<LuPhone
											size={16}
											className="text-slate-400"
										/>{" "}
										Teléfono
									</label>
									<input
										className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
										value={uForm.phone}
										onChange={(e) =>
											setUForm((f) => ({
												...f,
												phone: e.target.value,
											}))
										}
									/>
								</div>

								<div className="pt-2">
									<label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
										Nueva Contraseña
									</label>
									<input
										type="password"
										placeholder="Dejar en blanco para no cambiar"
										className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
										value={uForm.password}
										onChange={(e) =>
											setUForm((f) => ({
												...f,
												password: e.target.value,
											}))
										}
									/>
								</div>

								<button className="w-full bg-blue-600 hover:bg-blue-700 transition-colors text-white font-medium py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-sm">
									<LuSave size={18} /> Guardar Cambios
								</button>
							</form>
						</div>
					</div>

					<div className="flex-1 space-y-4">
						<h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
							<LuUsers className="text-blue-500" /> Usuarios del
							Sistema
						</h3>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							{users.map((u) => (
								<div
									key={u.id}
									className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm p-4 flex items-center justify-between transition-all hover:shadow-md"
								>
									<div className="flex items-center gap-3 min-w-0">
										<div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 shrink-0">
											<LuUser size={20} />
										</div>
										<div className="min-w-0">
											<div className="font-bold text-slate-900 dark:text-white truncate">
												{u.name}
											</div>
											<div className="text-xs text-slate-500 dark:text-slate-400 truncate">
												{u.email}
											</div>
										</div>
									</div>
									<button
										type="button"
										className="px-3 py-1.5 text-xs font-bold text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors border border-blue-100 dark:border-blue-900/30"
										onClick={() => onEditUser(u)}
									>
										Editar
									</button>
								</div>
							))}
							{!users.length && (
								<div className="col-span-full py-12 text-center text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
									No hay otros usuarios registrados
								</div>
							)}
						</div>
					</div>
				</div>
			)}
			{deleteOpen ? (
				<div className="fixed inset-0 bg-black/50 flex items-center justify-center px-4 z-50">
					<div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl p-5">
						<div className="flex items-start justify-between gap-3">
							<div className="min-w-0">
								<div className="text-lg font-semibold text-slate-900 dark:text-slate-100">
									Confirmar eliminación
								</div>
								<div className="text-sm text-slate-600 dark:text-slate-300">
									Para eliminar{" "}
									{deleteKind === "court"
										? "la cancha"
										: "el producto"}
									{deleteItem?.name
										? ` “${deleteItem.name}”`
										: ""}
									, escribí{" "}
									<span className="font-semibold">
										{deletePhrase}
									</span>
									.
								</div>
							</div>
							<button
								type="button"
								onClick={closeDelete}
								className="p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
								title="Cerrar"
							>
								<LuX size={18} />
							</button>
						</div>

						{deleteKind === "court" && deleteChecking ? (
							<div className="mt-3 text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-lg p-3">
								Validando reservas pendientes...
							</div>
						) : null}

						{deleteBlocked ? (
							<div className="mt-3 text-sm text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-lg p-3">
								{deleteBlockedReason}
							</div>
						) : null}

						{deleteError ? (
							<div className="mt-3 text-sm text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-lg p-3">
								{deleteError}
							</div>
						) : null}

						<div className="mt-4">
							<label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
								Escribí “{deletePhrase}”
							</label>
							<input
								className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors"
								value={deleteText}
								onChange={(e) => setDeleteText(e.target.value)}
								placeholder={deletePhrase}
								disabled={deleteLoading}
							/>
						</div>

						<div className="mt-4 flex justify-end gap-2">
							<button
								type="button"
								className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors"
								onClick={closeDelete}
								disabled={deleteLoading}
							>
								Cancelar
							</button>
							<button
								type="button"
								className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 active:bg-red-800 transition-colors text-white font-medium disabled:opacity-50"
								disabled={
									deleteLoading ||
									deleteChecking ||
									deleteBlocked ||
									deleteText !== deletePhrase
								}
								onClick={confirmDelete}
							>
								{deleteLoading ? "Eliminando..." : "Eliminar"}
							</button>
						</div>
					</div>
				</div>
			) : null}
		</div>
	);
}
