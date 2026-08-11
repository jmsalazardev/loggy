-- Script de inicialización para Vercel Postgres / PostgreSQL
-- Nota: La aplicación ejecuta esta consulta automáticamente al arrancar si detecta la BD.

CREATE TABLE IF NOT EXISTS url_logs (
    id SERIAL PRIMARY KEY,
    params JSONB NOT NULL,
    query_string TEXT,
    ip TEXT,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índice para acelerar búsquedas por fecha
CREATE INDEX IF NOT EXISTS idx_url_logs_created_at ON url_logs(created_at DESC);
