# Vercel URL Parameter Logger (API sin UI)

Este proyecto es una API ligera construida en **Next.js** lista para desplegar en **Vercel**. Registra automáticamente cualquier parámetro recibido por URL (ej. `?data=123`) en una Base de Datos y responde con **`HTTP 200 OK`**.

---

## 🚀 Despliegue en Vercel (Paso a Paso)

### Opción 1: Mediante Vercel CLI
```bash
npx vercel
```

### Opción 2: Conectar repositorio en Vercel Dashboard
1. Sube este proyecto a tu repositorio de **GitHub / GitLab / Bitbucket**.
2. Ve a [Vercel Dashboard](https://vercel.com/dashboard) -> **Add New Project**.
3. Selecciona tu repositorio y haz clic en **Deploy**.

---

## 🗄️ Opciones de Base de Datos en Vercel

Vercel soporta varias bases de datos serverless. Puedes conectar cualquiera en 1-clic desde la pestaña **Storage** de tu proyecto en Vercel:

### 1. Vercel Postgres (Recomendado)
- Ve a tu proyecto en Vercel -> pestaña **Storage** -> **Create Database** -> **Postgres (Neon)**.
- Vercel inyectará automáticamente la variable de entorno `POSTGRES_URL`.
- La aplicación **creará automáticamente la tabla `url_logs`** en la primera petición.

### 2. Vercel KV (Redis)
- En la pestaña **Storage** -> **Create Database** -> **KV (Upstash Redis)**.
- Vercel inyectará `KV_REST_API_URL` y `KV_REST_API_TOKEN`.

*Si no conectas ninguna BD en producción o estás en desarrollo local, el sistema guardará los datos en memoria sin fallar.*

---

## 📡 Uso de la API

### 1. Registrar Parámetros (Responde HTTP 200 OK)
Cualquier petición a la raíz `/` con parámetros de consulta (`?data=123`) guardará los datos y devolverá `200 OK`:

```bash
curl -i "https://tu-proyecto.vercel.app/?data=123&user=45"
```

**Respuesta (HTTP status 200):**
```json
{
  "status": 200,
  "message": "OK",
  "id": 1,
  "receivedParams": {
    "data": "123",
    "user": "45"
  }
}
```

### 2. Consultar Registros Almacenados
Para ver los registros guardados en la BD:

```bash
curl "https://tu-proyecto.vercel.app/api/logs"
```

**Respuesta:**
```json
{
  "total": 1,
  "logs": [
    {
      "id": 1,
      "params": {
        "data": "123",
        "user": "45"
      },
      "queryString": "?data=123&user=45",
      "ip": "190.x.x.x",
      "userAgent": "curl/7.81.0",
      "createdAt": "2026-08-11T14:10:00.000Z"
    }
  ]
}
```
