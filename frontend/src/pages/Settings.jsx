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
	listUsers,
	updateUser,
} from "../services/api";

const fmtMoney = new Intl.NumberFormat("es-PE", {
	style: "currency",
	currency: "PEN",
	minimumFractionDigits: 2,
	maximumFractionDigits: 2,
});

function money(v) {
	return fmtMoney.format(Number(v || 0));
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
			setCMessage("Cancha creada");
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
			setPMessage("Producto creado");
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
			setUError("Seleccioná un usuario para editar.");
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
			setUMessage("Usuario actualizado");
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
		<div>
			<div className="flex items-center gap-2 mb-4">
				<button
					type="button"
					className={
						tab === "canchas"
							? "px-3 py-2 rounded bg-blue-600 text-white"
							: "px-3 py-2 rounded border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
					}
					onClick={() => setTab("canchas")}
				>
					Canchas
				</button>
				<button
					type="button"
					className={
						tab === "productos"
							? "px-3 py-2 rounded bg-blue-600 text-white"
							: "px-3 py-2 rounded border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
					}
					onClick={() => setTab("productos")}
				>
					Productos
				</button>
				<button
					type="button"
					className={
						tab === "usuarios"
							? "px-3 py-2 rounded bg-blue-600 text-white"
							: "px-3 py-2 rounded border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
					}
					onClick={() => setTab("usuarios")}
				>
					Usuarios
				</button>
			</div>

			{tab === "canchas" ? (
				<div className="flex flex-col lg:flex-row gap-6">
					<div className="w-full lg:w-[380px] lg:shrink-0">
						<div className="lg:sticky lg:top-4">
							<div className="text-lg font-semibold mb-3">
								Nueva cancha
							</div>
							<form
								onSubmit={addCourt}
								className="bg-white dark:bg-gray-900 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800"
							>
								{cError ? (
									<div className="text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded p-2 mb-3">
										{cError}
									</div>
								) : null}
								{cMessage ? (
									<div className="text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-900/60 rounded p-2 mb-3">
										{cMessage}
									</div>
								) : null}
								<div className="mb-3">
									<label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
										Nombre
									</label>
									<input
										className="border border-gray-300 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 rounded w-full p-2 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
										placeholder="Cancha 1"
										value={cForm.name}
										onChange={(e) =>
											setCForm({
												...cForm,
												name: e.target.value,
											})
										}
									/>
								</div>
								<div className="mb-4">
									<label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
										Precio día
									</label>
									<input
										className="border border-gray-300 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 rounded w-full p-2 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
										type="number"
										step="0.01"
										placeholder="0.00"
										value={cForm.day_price}
										onChange={(e) =>
											setCForm({
												...cForm,
												day_price: e.target.value,
											})
										}
									/>
								</div>
								<div className="mb-4">
									<label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
										Precio noche
									</label>
									<input
										className="border border-gray-300 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 rounded w-full p-2 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
										type="number"
										step="0.01"
										placeholder="0.00"
										value={cForm.night_price}
										onChange={(e) =>
											setCForm({
												...cForm,
												night_price: e.target.value,
											})
										}
									/>
								</div>
								<div className="mb-4">
									<div className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
										Horario de atención
									</div>
									<div className="grid grid-cols-2 gap-3">
										<div>
											<div className="text-xs text-gray-600 dark:text-gray-300 mb-1">
												Apertura
											</div>
											<select
												className="border border-gray-300 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 rounded w-full p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
												value={cForm.open_time}
												onChange={(e) =>
													setCForm({
														...cForm,
														open_time:
															e.target.value,
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
										<div>
											<div className="text-xs text-gray-600 dark:text-gray-300 mb-1">
												Cierre
											</div>
											<select
												className="border border-gray-300 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 rounded w-full p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
												value={cForm.close_time}
												onChange={(e) =>
													setCForm({
														...cForm,
														close_time:
															e.target.value,
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
								</div>
								<button className="bg-blue-600 hover:bg-blue-700 transition text-white px-3 py-2 rounded w-full">
									Agregar
								</button>
							</form>
						</div>
					</div>
					<div className="flex-1">
						<div className="text-lg font-semibold mb-3">
							Canchas
						</div>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
							{courts.map((c) => (
								<div
									key={c.id}
									className="bg-white dark:bg-gray-900 p-3 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 flex items-center justify-between"
								>
									{cEditId === c.id ? (
										<div className="w-full grid grid-cols-1 md:grid-cols-2 gap-3">
											<div>
												<label className="block text-xs text-gray-600 dark:text-gray-300 mb-1">
													Nombre
												</label>
												<input
													className="border border-gray-300 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 rounded w-full p-2"
													value={cEditForm.name}
													onChange={(e) =>
														setCEditForm((f) => ({
															...f,
															name: e.target
																.value,
														}))
													}
												/>
											</div>
											<div>
												<div className="block text-xs text-gray-600 dark:text-gray-300 mb-1">
													Precio día
												</div>
												<input
													type="number"
													step="0.01"
													className="border border-gray-300 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 rounded w-full p-2"
													value={cEditForm.day_price}
													onChange={(e) =>
														setCEditForm((f) => ({
															...f,
															day_price:
																e.target.value,
														}))
													}
												/>
											</div>
											<div>
												<div className="block text-xs text-gray-600 dark:text-gray-300 mb-1">
													Precio noche
												</div>
												<input
													type="number"
													step="0.01"
													className="border border-gray-300 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 rounded w-full p-2"
													value={
														cEditForm.night_price
													}
													onChange={(e) =>
														setCEditForm((f) => ({
															...f,
															night_price:
																e.target.value,
														}))
													}
												/>
											</div>
											<div>
												<div className="block text-xs text-gray-600 dark:text-gray-300 mb-1">
													Apertura
												</div>
												<select
													className="border border-gray-300 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 rounded w-full p-2"
													value={cEditForm.open_time}
													onChange={(e) =>
														setCEditForm((f) => ({
															...f,
															open_time:
																e.target.value,
														}))
													}
												>
													{hourOptions.map((t) => (
														<option
															key={t}
															value={t}
														>
															{t}
														</option>
													))}
												</select>
											</div>
											<div>
												<div className="block text-xs text-gray-600 dark:text-gray-300 mb-1">
													Cierre
												</div>
												<select
													className="border border-gray-300 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 rounded w-full p-2"
													value={cEditForm.close_time}
													onChange={(e) =>
														setCEditForm((f) => ({
															...f,
															close_time:
																e.target.value,
														}))
													}
												>
													{hourOptions.map((t) => (
														<option
															key={t}
															value={t}
														>
															{t}
														</option>
													))}
												</select>
											</div>
											<div className="flex items-center justify-end gap-2 md:col-span-2">
												<button
													type="button"
													className="px-3 py-2 rounded border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
													onClick={() => {
														setCEditId(null);
														setCEditForm({
															name: "",
															day_price: "",
															night_price: "",
															open_time: "07:00",
															close_time: "22:00",
															status: "active",
														});
													}}
												>
													Cancelar
												</button>
												<button
													type="button"
													className="px-3 py-2 rounded bg-blue-600 hover:bg-blue-700 transition text-white"
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
																!Number.isFinite(
																	openM,
																) ||
																!Number.isFinite(
																	closeM,
																)
															) {
																setCError(
																	"El horario es inválido.",
																);
																return;
															}
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
																	name: String(
																		cEditForm.name ||
																			c.name,
																	).trim(),
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
															setCError("");
															setCEditId(null);
															refresh();
														} catch (err) {
															setCError(
																err?.response
																	?.data
																	?.message ||
																	"No se pudo actualizar la cancha",
															);
														}
													}}
												>
													Guardar
												</button>
											</div>
										</div>
									) : (
										<>
											<div>
												<div className="font-semibold">
													{c.name}
												</div>
												<div className="text-gray-600 dark:text-gray-300 text-sm">
													Día{" "}
													{money(
														c.day_price ??
															c.base_price,
													)}{" "}
													· Noche{" "}
													{money(
														c.night_price ??
															c.day_price ??
															c.base_price,
													)}
												</div>
												<div className="text-gray-600 dark:text-gray-300 text-sm">
													Horario{" "}
													{String(
														c.open_time || "07:00",
													).slice(0, 5)}{" "}
													-{" "}
													{String(
														c.close_time || "22:00",
													).slice(0, 5)}
												</div>
											</div>
											<div className="flex items-center gap-2">
												<button
													className="px-3 py-1.5 rounded border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
													onClick={() => {
														setCEditId(c.id);
														setCEditForm({
															name: c.name || "",
															day_price:
																c.day_price ??
																c.base_price ??
																0,
															night_price:
																c.night_price ??
																c.day_price ??
																c.base_price ??
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
												>
													Editar
												</button>
												<button
													className="px-3 py-1.5 rounded border border-red-300 text-red-700 hover:bg-red-50"
													onClick={() =>
														deleteCourt(c.id).then(
															refresh,
														)
													}
												>
													Eliminar
												</button>
											</div>
										</>
									)}
								</div>
							))}
						</div>
					</div>
				</div>
			) : null}

			{tab === "productos" ? (
				<div className="flex flex-col lg:flex-row gap-6">
					<div className="w-full lg:w-[380px] lg:shrink-0">
						<div className="lg:sticky lg:top-4">
							<div className="text-lg font-semibold mb-3">
								Nuevo producto
							</div>
							<form
								onSubmit={addProduct}
								className="bg-white dark:bg-gray-900 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800"
							>
								{pError ? (
									<div className="text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded p-2 mb-3">
										{pError}
									</div>
								) : null}
								{pMessage ? (
									<div className="text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-900/60 rounded p-2 mb-3">
										{pMessage}
									</div>
								) : null}
								<div className="mb-3">
									<label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
										Nombre
									</label>
									<input
										className="border border-gray-300 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 rounded w-full p-2 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
										placeholder="Pelotas fútbol"
										value={pForm.name}
										onChange={(e) =>
											setPForm({
												...pForm,
												name: e.target.value,
											})
										}
									/>
								</div>
								<div className="mb-3">
									<label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
										Precio
									</label>
									<input
										className="border border-gray-300 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 rounded w-full p-2 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
										type="number"
										step="0.01"
										placeholder="0.00"
										value={pForm.price}
										onChange={(e) =>
											setPForm({
												...pForm,
												price: e.target.value,
											})
										}
									/>
								</div>
								<div className="mb-4">
									<label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
										Stock
									</label>
									<input
										className="border border-gray-300 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 rounded w-full p-2 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
										type="number"
										placeholder="0"
										value={pForm.stock}
										onChange={(e) =>
											setPForm({
												...pForm,
												stock: e.target.value,
											})
										}
									/>
								</div>
								<button className="bg-blue-600 hover:bg-blue-700 transition text-white px-3 py-2 rounded w-full">
									Agregar
								</button>
							</form>
						</div>
					</div>
					<div className="flex-1">
						<div className="flex flex-col sm:flex-row sm:items-end gap-3 mb-3">
							<div className="flex-1">
								<div className="text-lg font-semibold">
									Productos
								</div>
							</div>
							<div className="w-full sm:w-64">
								<label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
									Buscar
								</label>
								<input
									className="border border-gray-300 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 rounded w-full p-2 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
									placeholder="Nombre..."
									value={pQ}
									onChange={(e) => setPQ(e.target.value)}
								/>
							</div>
						</div>
						<div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
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
										className="bg-white dark:bg-gray-900 p-3 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 flex flex-col gap-2"
									>
										{pEditId === p.id ? (
											<>
												<input
													className="border border-gray-300 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 rounded p-2"
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
														className="border border-gray-300 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 rounded p-2"
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
														className="border border-gray-300 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 rounded p-2"
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
												<div className="flex justify-end gap-2">
													<button
														type="button"
														className="px-3 py-1.5 rounded border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
														onClick={() => {
															setPEditId(null);
															setPEditForm({
																name: "",
																price: "",
																stock: "",
																status: "active",
															});
														}}
													>
														Cancelar
													</button>
													<button
														type="button"
														className="px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-700 transition text-white"
														onClick={async () => {
															try {
																await updateProduct(
																	p.id,
																	{
																		name: String(
																			pEditForm.name ||
																				p.name,
																		).trim(),
																		price: pEditForm.price,
																		stock: pEditForm.stock,
																	},
																);
																setPMessage(
																	"Producto actualizado",
																);
																setPError("");
																setPEditId(
																	null,
																);
																refresh();
															} catch (err) {
																setPError(
																	err
																		?.response
																		?.data
																		?.message ||
																		"No se pudo actualizar el producto",
																);
															}
														}}
													>
														Guardar
													</button>
												</div>
											</>
										) : (
											<>
												<div className="flex items-center justify-between gap-2">
													<div className="font-semibold truncate">
														{p.name}
													</div>
													<div className="text-sm font-medium">
														{money(p.price)}
													</div>
												</div>
												<div className="text-xs text-gray-600 dark:text-gray-300">
													Stock {Number(p.stock || 0)}
												</div>
												<div className="flex items-center justify-end gap-2">
													<button
														className="px-3 py-1.5 rounded border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
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
														Editar
													</button>
													<button
														className="px-3 py-1.5 rounded border border-red-300 text-red-700 hover:bg-red-50"
														onClick={() =>
															deleteProduct(
																p.id,
															).then(refresh)
														}
													>
														Eliminar
													</button>
												</div>
											</>
										)}
									</div>
								))}
						</div>
					</div>
				</div>
			) : null}

			{tab === "usuarios" ? (
				<div className="flex flex-col lg:flex-row gap-6">
					<div className="w-full lg:w-[420px] lg:shrink-0">
						<div className="lg:sticky lg:top-4">
							<div className="text-lg font-semibold mb-3">
								Editar usuario
							</div>
							<form
								onSubmit={onUpdateUser}
								className="bg-white dark:bg-gray-900 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800"
							>
								{uError ? (
									<div className="text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded p-2 mb-3">
										{uError}
									</div>
								) : null}
								{uMessage ? (
									<div className="text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-900/60 rounded p-2 mb-3">
										{uMessage}
									</div>
								) : null}

								<div className="mb-3">
									<label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
										Nombre
									</label>
									<input
										className="border border-gray-300 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 rounded w-full p-2 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
										value={uForm.name}
										onChange={(e) =>
											setUForm((f) => ({
												...f,
												name: e.target.value,
											}))
										}
									/>
								</div>

								<div className="mb-3">
									<label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
										Email
									</label>
									<input
										className="border border-gray-300 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 rounded w-full p-2 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
										value={uForm.email}
										onChange={(e) =>
											setUForm((f) => ({
												...f,
												email: e.target.value,
											}))
										}
									/>
								</div>

								<div className="mb-3">
									<label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
										Teléfono
									</label>
									<input
										className="border border-gray-300 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 rounded w-full p-2 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
										value={uForm.phone}
										onChange={(e) =>
											setUForm((f) => ({
												...f,
												phone: e.target.value,
											}))
										}
									/>
								</div>

								<div className="mb-4">
									<label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
										Nueva contraseña (opcional)
									</label>
									<input
										type="password"
										className="border border-gray-300 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 rounded w-full p-2 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
										value={uForm.password}
										onChange={(e) =>
											setUForm((f) => ({
												...f,
												password: e.target.value,
											}))
										}
									/>
								</div>

								<button className="bg-blue-600 hover:bg-blue-700 transition text-white px-3 py-2 rounded w-full">
									Guardar cambios
								</button>
							</form>
						</div>
					</div>
					<div className="flex-1">
						<div className="text-lg font-semibold mb-3">
							Usuarios
						</div>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
							{users.map((u) => (
								<div
									key={u.id}
									className="bg-white dark:bg-gray-900 p-3 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 flex items-center justify-between gap-3"
								>
									<div className="min-w-0">
										<div className="font-semibold truncate">
											{u.name}
										</div>
										<div className="text-gray-600 dark:text-gray-300 text-sm truncate">
											{u.email}
											{u.phone ? ` · ${u.phone}` : ""}
										</div>
									</div>
									<div className="flex items-center gap-2 shrink-0">
										<button
											type="button"
											className="px-3 py-1.5 rounded border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
											onClick={() => onEditUser(u)}
										>
											Editar
										</button>
									</div>
								</div>
							))}
						</div>
						{users.length ? null : (
							<div className="text-sm text-gray-600 dark:text-gray-300">
								Sin usuarios
							</div>
						)}
					</div>
				</div>
			) : null}
		</div>
	);
}
