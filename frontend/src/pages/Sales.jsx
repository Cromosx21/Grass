import React, { useEffect, useState } from "react";
import { listProducts, createSale } from "../services/api";

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
		<div className="md:flex gap-6">
			<div className="flex-1">
				{message && (
					<div className="text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-900/60 rounded p-2 mb-3">
						{message}
					</div>
				)}
				{error && (
					<div className="text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded p-2 mb-3">
						{error}
					</div>
				)}
				<h2 className="text-lg font-semibold mb-3">
					Lista de productos
				</h2>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					{products.map((p) => (
						<div
							key={p.id}
							className="bg-white dark:bg-gray-900 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 flex items-center justify-between"
						>
							<div>
								<div className="font-semibold">{p.name}</div>
								<div className="text-gray-600 dark:text-gray-300">
									{money(p.price)}
								</div>
								<div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
									Stock: {Number(p.stock || 0)}
								</div>
							</div>
							<div className="flex items-center gap-2">
								<div className="w-16">
									<label className="block text-xs text-gray-600 dark:text-gray-300 mb-1">
										Cant.
									</label>
									<input
										type="number"
										min="0"
										className="border border-gray-300 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 rounded p-2 w-full placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
										placeholder="0"
										value={cart[p.id] || ""}
										onChange={(e) =>
											setQty(p.id, e.target.value)
										}
									/>
								</div>
								<button
									type="button"
									className="px-3 py-2 bg-blue-600 hover:bg-blue-700 transition text-white rounded disabled:opacity-50"
									onClick={() => addOne(p)}
									disabled={Number(p.stock || 0) <= 0}
								>
									Agregar
								</button>
							</div>
						</div>
					))}
				</div>
			</div>
			<div className="w-full md:w-[360px] mt-6 md:mt-0">
				<div className="md:sticky md:top-4 bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4">
					<div className="flex items-center justify-between mb-3">
						<h3 className="text-lg font-semibold">Carrito</h3>
						<button
							type="button"
							className="text-sm text-gray-600 dark:text-gray-300 hover:underline disabled:opacity-50"
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
					{cartItems.length ? (
						<div className="space-y-3">
							{cartItems.map((it) => (
								<div
									key={it.product.id}
									className="flex items-start justify-between gap-3"
								>
									<div className="min-w-0">
										<div className="font-medium truncate">
											{it.product.name}
										</div>
										<div className="text-xs text-gray-500 dark:text-gray-400">
											{money(it.product.price)} · Stock{" "}
											{Number(it.product.stock || 0)}
										</div>
									</div>
									<div className="flex items-center gap-2">
										<input
											type="number"
											min="0"
											className="border border-gray-300 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 rounded p-2 w-20 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
											className="text-red-600 text-sm hover:underline"
											onClick={() =>
												setQty(it.product.id, 0)
											}
										>
											Quitar
										</button>
									</div>
								</div>
							))}
							<div className="border-t border-gray-100 dark:border-gray-800 pt-3 flex items-center justify-between">
								<div className="text-gray-600 dark:text-gray-300">
									Total
								</div>
								<div className="text-xl font-semibold">
									{money(total)}
								</div>
							</div>
							<div className="pt-2">
								<label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
									Medio de pago
								</label>
								<select
									className="border border-gray-300 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 rounded w-full p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
									value={paymentMethod}
									onChange={(e) =>
										setPaymentMethod(e.target.value)
									}
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
								className="bg-blue-600 hover:bg-blue-700 transition text-white px-4 py-2 rounded w-full disabled:opacity-50"
								onClick={onSubmit}
								disabled={loading}
							>
								{loading
									? "Validando..."
									: "Validar y registrar"}
							</button>
						</div>
					) : (
						<div className="text-sm text-gray-600 dark:text-gray-300">
							Agregá productos desde la lista para preparar la
							venta.
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
