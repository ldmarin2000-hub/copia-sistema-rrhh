-- ============================================================
-- Banco de Horas — Migración
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- 1. Tabla configuración por empresa
CREATE TABLE IF NOT EXISTS banco_horas_config_empresa (
  id            BIGSERIAL PRIMARY KEY,
  empresa_id    BIGINT NOT NULL UNIQUE REFERENCES empresas(id) ON DELETE CASCADE,
  modalidad     TEXT NOT NULL DEFAULT 'nominal'
                  CHECK (modalidad IN ('proporcional', 'nominal')),
  tope_mensual_horas   INTEGER NOT NULL DEFAULT 30,
  tope_anual_horas     INTEGER NOT NULL DEFAULT 200,
  tope_acumulado_banco INTEGER NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabla acuerdos individuales
CREATE TABLE IF NOT EXISTS banco_horas_acuerdos (
  id            BIGSERIAL PRIMARY KEY,
  legajo_id     BIGINT NOT NULL REFERENCES legajos(id) ON DELETE CASCADE,
  empresa_id    BIGINT NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  fecha_inicio  DATE NOT NULL,
  fecha_fin     DATE NULL,
  activo        BOOLEAN NOT NULL DEFAULT TRUE,
  modalidad     TEXT NOT NULL DEFAULT 'hereda_empresa'
                  CHECK (modalidad IN ('proporcional', 'nominal', 'hereda_empresa')),
  observacion   TEXT,
  creado_por    UUID REFERENCES auth.users(id),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Agregar campos a banco_horas_movimientos
ALTER TABLE banco_horas_movimientos
  ADD COLUMN IF NOT EXISTS origen TEXT DEFAULT 'manual'
    CHECK (origen IN ('novedad_diaria', 'manual', 'egreso')),
  ADD COLUMN IF NOT EXISTS recargo_tipo TEXT NULL
    CHECK (recargo_tipo IN ('normal', '50%', '100%')),
  ADD COLUMN IF NOT EXISTS horas_reales DECIMAL(6,2) NULL,
  ADD COLUMN IF NOT EXISTS horas_banco  DECIMAL(6,2) NULL,
  ADD COLUMN IF NOT EXISTS iniciativa_descuento TEXT NULL
    CHECK (iniciativa_descuento IN ('empleado', 'empresa', 'acuerdo')),
  ADD COLUMN IF NOT EXISTS saldo_resultante DECIMAL(8,2) NULL,
  ADD COLUMN IF NOT EXISTS novedad_diaria_id BIGINT NULL
    REFERENCES novedades_diarias(id) ON DELETE SET NULL;

-- Ampliar constraint tipo (incluye 'compensacion' como legado temporalmente)
ALTER TABLE banco_horas_movimientos
  DROP CONSTRAINT IF EXISTS banco_horas_movimientos_tipo_check;
ALTER TABLE banco_horas_movimientos
  ADD CONSTRAINT banco_horas_movimientos_tipo_check
  CHECK (tipo IN ('acreditacion', 'descuento', 'pago_egreso', 'ajuste_manual', 'compensacion'));

-- Migrar registros con tipo 'compensacion' a 'descuento'
UPDATE banco_horas_movimientos SET tipo = 'descuento' WHERE tipo = 'compensacion';

-- Quitar 'compensacion' del constraint ahora que no hay registros con ese valor
ALTER TABLE banco_horas_movimientos
  DROP CONSTRAINT IF EXISTS banco_horas_movimientos_tipo_check;
ALTER TABLE banco_horas_movimientos
  ADD CONSTRAINT banco_horas_movimientos_tipo_check
  CHECK (tipo IN ('acreditacion', 'descuento', 'pago_egreso', 'ajuste_manual'));

-- 4. Insertar tipo de ausencia FRANCO_BH (si no existe)
-- Nota: si id_empresa tiene NOT NULL en tu tabla, ajustá el INSERT
INSERT INTO tipos_ausencia (descripcion, codigo, pierde_presentismo, requiere_certificado, remunerada, cuenta_dias_corridos, activo)
SELECT 'Franco Banco de Horas', 'FRANCO_BH', false, false, true, false, true
WHERE NOT EXISTS (SELECT 1 FROM tipos_ausencia WHERE codigo = 'FRANCO_BH');
