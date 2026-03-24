# Grass

Sistema para gestión de reservas de canchas y ventas de productos, con historial y métricas diarias.

## Estructura

- `backend/`: API (Node.js + Express + MySQL)
- `frontend/`: App web (React + Vite + Tailwind CSS)

## Requisitos

- Node.js 18+ (recomendado)
- MySQL 8+ (o MariaDB compatible)

## Base de datos

El esquema base está en `backend/config/schema.sql`.

1. Crear DB y tablas (opción manual):

```sql
SOURCE backend/config/schema.sql;
```

2. Auto-ajustes al iniciar la API:

Al iniciar el backend, la app valida/agrega columnas faltantes (por ejemplo `reservations.deposit`, `sales.payment_method`, etc.). Esto está en `backend/config/db.js` en `ensureSchema()`.

## Backend (API)

```bash
cd backend
npm install
npm run dev
```

### Variables de entorno

Archivo: `backend/.env`

```env
PORT=4000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=grass
JWT_SECRET=tu_secreto_seguro
```

Endpoints principales (requieren token salvo auth):

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/dashboard`
- `GET/POST/PUT/DELETE /api/courts`
- `GET/POST/PUT/DELETE /api/reservations` + `GET /api/reservations/history`
- `GET/POST /api/sales` + `GET /api/sales/history`
- `GET/POST/PUT/DELETE /api/products`

## Frontend (Web)

```bash
cd frontend
npm install
npm run dev
```

### Variables de entorno (opcional)

La app usa por defecto `http://localhost:4000`. Si querés cambiarlo:

```env
VITE_API_URL=http://localhost:4000
```

### Tailwind CSS

El frontend usa Tailwind CSS (v4) con Vite plugin y el import de Tailwind en `src/index.css`.

## Build de producción

Frontend:

```bash
cd frontend
npm run build
npm run preview
```

Backend:

```bash
cd backend
npm run start
```
