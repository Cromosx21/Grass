import React, { useEffect, useState } from "react";
import { listProducts, createSale } from "../services/api";
import {
	LuShoppingCart,
	LuPlus,
	LuTrash2,
	LuCircleCheck,
	LuCreditCard,
	LuPackage,
	LuCircleAlert,
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

export default function Sales() {
	const [products, setProducts] = useState([]);
	const [cart, setCart] = useState({});
	const [total, setTotal] = useState(0);
	const [paymentMethod, setPaymentMethod] = useState("cash");
	const [message, setMessage] = useState("");
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		listProducts().then(setProducts);
	}, []);

	useEffect(() => {
		let t = 0;
		for (const p of products) {
			const q = Number(cart[p.id] || 0);
			t += q * Number(p.price);
		}
		setTotal(t);
	}, [cart, products]);

	function setQty(productId, value) {
		const q = Math.max(0, Math.floor(Number(value || 0)));
		setCart((prev) => {
			const next = { ...prev, [productId]: q };
			if (!q) delete next[productId];
			return next;
		});
		setMessage("");
		setError("");
	}

	function addOne(p) {
		if (Number(p.stock || 0) <= 0) return;
		const current = Number(cart[p.id] || 0);
		const next = current + 1;
		if (next > Number(p.stock || 0)) return;
		setQty(p.id, next);
	}

	function getCartItems() {
		const map = new Map(products.map((p) => [p.id, p]));
		const items = [];
		for (const [idStr, qtyVal] of Object.entries(cart)) {
			const id = Number(idStr);
			const p = map.get(id);
			if (!p) continue;
			const quantity = Number(qtyVal || 0);
			if (quantity > 0) items.push({ product: p, quantity });
		}
		return items;
	}

	async function onSubmit() {
		setMessage("");
		setError("");
		const cartItems = getCartItems();
		if (!cartItems.length) {
			setError("Agregá al menos un producto al carrito.");
			return;
		}
		for (const it of cartItems) {
			const stock = Number(it.product.stock || 0);
			if (it.quantity > stock) {
				setError(`Stock insuficiente para ${it.product.name}.`);
				return;
			}
		}
		setLoading(true);
		try {
			await createSale(
				cartItems.map((it) => ({
					product_id: it.product.id,
					quantity: it.quantity,
					price: Number(it.product.price),
				})),
				paymentMethod,
			);
			setCart({});
			setPaymentMethod("cash");
			setMessage("Venta registrada");
			const refreshed = await listProducts();
			setProducts(refreshed);
		} catch (e) {
			const msg =
				e?.response?.data?.message ||
				"No se pudo registrar la venta. Revisá el carrito.";
			setError(msg);
		} finally {
			setLoading(false);
		}
	}

	const cartItems = getCartItems();

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
					Punto de Venta
				</h1>
				<p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
					Selecciona productos para añadir al carrito y registra la
					venta.
				</p>
			</div>

			<div className="flex flex-col lg:flex-row gap-6">
				{/* Lista de productos */}
				<div className="flex-1 space-y-4">
					{message && (
						<div className="text-sm text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 rounded-lg p-3 flex items-center gap-2">
							<LuCircleCheck size={16} />
							{message}
						</div>
					)}
					{error && (
						<div className="text-sm text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-lg p-3 flex items-center gap-2">
							<LuCircleAlert size={16} />
							{error}
						</div>
					)}

					<div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm rounded-xl p-5">
						<h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
							<LuPackage className="text-blue-500" />
							Productos disponibles
						</h2>

						<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
							{products.map((p) => {
								const stock = Number(p.stock || 0);
								const outOfStock = stock <= 0;

								return (
									<div
										key={p.id}
										className={`p-4 rounded-xl border ${
											outOfStock
												? "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 opacity-60"
												: "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-md transition-all"
										} flex flex-col justify-between h-full`}
									>
										<div className="flex justify-between items-start mb-3">
											<div>
												<div className="font-semibold text-slate-900 dark:text-white">
													{p.name}
												</div>
												<div className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
													Stock:{" "}
													<span
														className={
															outOfStock
																? "text-red-500 font-medium"
																: ""
														}
													>
														{stock}
													</span>
												</div>
											</div>
											<div className="text-lg font-bold text-blue-600 dark:text-blue-400">
												{money(p.price)}
											</div>
										</div>

										<div className="flex items-center gap-3 mt-auto pt-3 border-t border-slate-100 dark:border-slate-800">
											<div className="w-20 relative">
												<input
													type="number"
													min="0"
													className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg p-2 text-center focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors disabled:opacity-50"
													placeholder="0"
													value={cart[p.id] || ""}
													onChange={(e) =>
														setQty(
															p.id,
															e.target.value,
														)
													}
													disabled={outOfStock}
												/>
											</div>
											<button
												type="button"
												className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/30 dark:hover:text-blue-400 text-slate-700 dark:text-slate-300 font-medium transition-colors rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
												onClick={() => addOne(p)}
												disabled={outOfStock}
											>
												<LuPlus size={16} />
												Agregar
											</button>
										</div>
									</div>
								);
							})}
						</div>
					</div>
				</div>

				{/* Carrito de compras */}
				<div className="w-full lg:w-[380px] shrink-0">
					<div className="lg:sticky lg:top-24 bg-white dark:bg-slate-900 rounded-xl shadow-md border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[calc(100vh-8rem)]">
						<div className="bg-slate-50 dark:bg-slate-800/50 p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
							<h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
								<LuShoppingCart className="text-blue-500" />
								Carrito
								{cartItems.length > 0 && (
									<span className="bg-blue-600 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full ml-1">
										{cartItems.reduce(
											(acc, it) => acc + it.quantity,
											0,
										)}
									</span>
								)}
							</h3>
							<button
								type="button"
								className="text-sm font-medium text-red-500 hover:text-red-700 hover:underline disabled:opacity-50 disabled:no-underline transition-colors"
								onClick={() => {
									setCart({});
									setError("");
									setMessage("");
								}}
								disabled={!cartItems.length}
							>
								Vaciar
							</button>
						</div>

						<div className="p-5 flex-1 overflow-y-auto min-h-[200px]">
							{cartItems.length ? (
								<div className="space-y-4">
									{cartItems.map((it) => (
										<div
											key={it.product.id}
											className="flex items-start justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800 last:border-0 last:pb-0"
										>
											<div className="flex-1 min-w-0">
												<div className="font-semibold text-slate-900 dark:text-white truncate">
													{it.product.name}
												</div>
												<div className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
													{money(it.product.price)}{" "}
													c/u
												</div>
											</div>
											<div className="flex flex-col items-end gap-2">
												<div className="font-bold text-slate-900 dark:text-white">
													{money(
														it.quantity *
															Number(
																it.product
																	.price,
															),
													)}
												</div>
												<div className="flex items-center gap-2">
													<input
														type="number"
														min="0"
														className="w-16 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md p-1 text-center text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
														value={it.quantity}
														onChange={(e) =>
															setQty(
																it.product.id,
																e.target.value,
															)
														}
													/>
													<button
														type="button"
														className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
														onClick={() =>
															setQty(
																it.product.id,
																0,
															)
														}
														title="Quitar"
													>
														<LuTrash2 size={16} />
													</button>
												</div>
											</div>
										</div>
									))}
								</div>
							) : (
								<div className="h-full flex flex-col items-center justify-center text-slate-400 py-8">
									<LuShoppingCart
										size={48}
										className="mb-4 opacity-20"
									/>
									<div className="text-center text-slate-500 dark:text-slate-400">
										El carrito está vacío.
										<br />
										Agrega productos para continuar.
									</div>
								</div>
							)}
						</div>

						<div className="bg-slate-50 dark:bg-slate-800/50 p-5 border-t border-slate-200 dark:border-slate-800">
							<div className="flex items-center justify-between mb-4">
								<div className="text-slate-600 dark:text-slate-300 font-medium">
									Total a cobrar
								</div>
								<div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
									{money(total)}
								</div>
							</div>

							<div className="space-y-4">
								<div>
									<label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
										<LuCreditCard
											size={16}
											className="text-slate-400"
										/>
										Medio de pago
									</label>
									<select
										className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
										value={paymentMethod}
										onChange={(e) =>
											setPaymentMethod(e.target.value)
										}
										disabled={!cartItems.length}
									>
										<option value="cash">Efectivo</option>
										<option value="transfer">
											Transferencia
										</option>
										<option value="yape_plin">
											Yape o Plin
										</option>
										<option value="card">
											Pago con tarjeta
										</option>
									</select>
								</div>

								<button
									className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 transition-colors text-white font-medium py-3 px-4 rounded-xl shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
									onClick={onSubmit}
									disabled={loading || !cartItems.length}
								>
									{loading ? (
										<div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
									) : (
										<LuCircleCheck size={18} />
									)}
									{loading
										? "Procesando..."
										: "Registrar venta"}
								</button>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
