-- =========================================================
-- Biblioteca universitaria - versión SQLite
-- =========================================================
PRAGMA foreign_keys = ON;   -- obligatorio en SQLite para que los REFERENCES funcionen

DROP TABLE IF EXISTS devolucion;
DROP TABLE IF EXISTS prestamo;
DROP TABLE IF EXISTS ejemplar;
DROP TABLE IF EXISTS libro_autor;
DROP TABLE IF EXISTS libro;
DROP TABLE IF EXISTS autor;
DROP TABLE IF EXISTS editorial;
DROP TABLE IF EXISTS categoria;
DROP TABLE IF EXISTS usuario;
DROP TABLE IF EXISTS configuracion;

CREATE TABLE usuario (
    id_usuario      INTEGER PRIMARY KEY AUTOINCREMENT,
    codigo          VARCHAR(20)  NOT NULL UNIQUE,
    identificacion  VARCHAR(20)  NOT NULL UNIQUE,
    nombres         VARCHAR(100) NOT NULL,
    correo          VARCHAR(120) NOT NULL UNIQUE,
    contraseña      VARCHAR(255) NOT NULL,
    rol             VARCHAR(15)  NOT NULL
                    CHECK (rol IN ('estudiante','docente','bibliotecario')),
    carrera         VARCHAR(100),
    estado          VARCHAR(10)  NOT NULL DEFAULT 'activo'
                    CHECK (estado IN ('activo','bloqueado'))
);

CREATE TABLE categoria (
    id_categoria INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre       VARCHAR(80) NOT NULL UNIQUE
);

CREATE TABLE editorial (
    id_editorial INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre       VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE autor (
    id_autor INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre   VARCHAR(120) NOT NULL
);

CREATE TABLE libro (
    id_libro     INTEGER PRIMARY KEY AUTOINCREMENT,
    isbn         VARCHAR(20)  NOT NULL UNIQUE,
    titulo       VARCHAR(200) NOT NULL,
    año          INTEGER CHECK (año BETWEEN 1000 AND 2100),
    descripcion  TEXT,
    id_editorial INTEGER NOT NULL REFERENCES editorial(id_editorial),
    id_categoria INTEGER NOT NULL REFERENCES categoria(id_categoria)
);

CREATE TABLE libro_autor (
    id_libro INTEGER NOT NULL REFERENCES libro(id_libro) ON DELETE CASCADE,
    id_autor INTEGER NOT NULL REFERENCES autor(id_autor),
    PRIMARY KEY (id_libro, id_autor)
);

CREATE TABLE ejemplar (
    id_ejemplar   INTEGER PRIMARY KEY AUTOINCREMENT,
    codigo_barras VARCHAR(30) NOT NULL UNIQUE,
    id_libro      INTEGER NOT NULL REFERENCES libro(id_libro) ON DELETE CASCADE,
    ubicacion     VARCHAR(80) NOT NULL,
    estado        VARCHAR(12) NOT NULL DEFAULT 'disponible'
                  CHECK (estado IN ('disponible','prestado','perdido'))
);

CREATE TABLE prestamo (
    id_prestamo       INTEGER PRIMARY KEY AUTOINCREMENT,
    id_usuario        INTEGER NOT NULL REFERENCES usuario(id_usuario),
    id_ejemplar       INTEGER NOT NULL REFERENCES ejemplar(id_ejemplar),
    fecha_solicitud   TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    fecha_prestamo    DATE,
    fecha_vencimiento DATE,
    estado            VARCHAR(12) NOT NULL DEFAULT 'solicitado'
                      CHECK (estado IN ('solicitado','aprobado','rechazado','devuelto')),
    id_aprobador      INTEGER REFERENCES usuario(id_usuario),
    CHECK (fecha_vencimiento IS NULL OR fecha_vencimiento >= fecha_prestamo)
);

-- Un ejemplar no puede tener más de un préstamo abierto
CREATE UNIQUE INDEX uq_prestamo_ejemplar_abierto
    ON prestamo(id_ejemplar) WHERE estado IN ('solicitado','aprobado');

CREATE TABLE devolucion (
    id_devolucion    INTEGER PRIMARY KEY AUTOINCREMENT,
    id_prestamo      INTEGER NOT NULL UNIQUE REFERENCES prestamo(id_prestamo),
    fecha_devolucion DATE NOT NULL DEFAULT (DATE('now','localtime')),
    dias_retraso     INTEGER NOT NULL DEFAULT 0 CHECK (dias_retraso >= 0),
    valor_multa      NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (valor_multa >= 0),
    observaciones    VARCHAR(200),
    id_receptor      INTEGER REFERENCES usuario(id_usuario)
);

CREATE TABLE configuracion (
    clave VARCHAR(40) PRIMARY KEY,
    valor NUMERIC(10,2) NOT NULL
);


-- =========================================================
-- Datos de prueba
-- =========================================================
INSERT INTO configuracion (clave, valor) VALUES
    ('multa_por_dia', 1000),
    ('dias_prestamo', 7);

INSERT INTO usuario (codigo, identificacion, nombres, correo, contraseña, rol, carrera, estado) VALUES
    ('ADM001', '1000000001', 'Administrador Biblioteca', 'admin@universidad.edu.co', 'admin123', 'bibliotecario', NULL, 'activo'),
    ('EST001', '1000000002', 'Laura Pérez',   'laura.perez@universidad.edu.co',  'clave123', 'estudiante', 'Ingeniería de Sistemas', 'activo'),
    ('EST002', '1000000003', 'Carlos Gómez',  'carlos.gomez@universidad.edu.co', 'clave123', 'estudiante', 'Derecho', 'activo'),
    ('EST003', '1000000004', 'Marta Ruiz',    'marta.ruiz@universidad.edu.co',   'clave123', 'estudiante', 'Medicina', 'bloqueado'),
    ('DOC001', '1000000005', 'Dr. Andrés Vega','andres.vega@universidad.edu.co', 'clave123', 'docente', NULL, 'activo');

INSERT INTO categoria (nombre) VALUES
    ('Programación'), ('Bases de Datos'), ('Literatura'), ('Matemáticas'), ('Historia');

INSERT INTO editorial (nombre) VALUES
    ('Pearson'), ('McGraw-Hill'), ('Alfaguara'), ('O''Reilly');

INSERT INTO autor (nombre) VALUES
    ('Abraham Silberschatz'), ('Henry F. Korth'), ('S. Sudarshan'),
    ('Gabriel García Márquez'), ('Ramez Elmasri'), ('Shamkant Navathe'),
    ('Eric Matthes');

INSERT INTO libro (isbn, titulo, año, descripcion, id_editorial, id_categoria) VALUES
    ('9780078022159', 'Fundamentos de Bases de Datos', 2019, 'Texto clásico de bases de datos relacionales.', 2, 2),
    ('9780133970777', 'Fundamentos de Sistemas de Bases de Datos', 2016, 'Modelado, SQL y diseño de bases de datos.', 1, 2),
    ('9788420471839', 'Cien años de soledad', 1967, 'Novela de la saga de los Buendía.', 3, 3),
    ('9781593279288', 'Python Crash Course', 2019, 'Introducción práctica a Python.', 4, 1);

INSERT INTO libro_autor (id_libro, id_autor) VALUES
    (1, 1), (1, 2), (1, 3),
    (2, 5), (2, 6),
    (3, 4),
    (4, 7);

INSERT INTO ejemplar (codigo_barras, id_libro, ubicacion, estado) VALUES
    ('EJ-0001', 1, 'Sala 1 - Estante A1', 'disponible'),
    ('EJ-0002', 1, 'Sala 1 - Estante A1', 'disponible'),
    ('EJ-0003', 2, 'Sala 1 - Estante A2', 'disponible'),
    ('EJ-0004', 3, 'Sala 2 - Estante B1', 'disponible'),
    ('EJ-0005', 3, 'Sala 2 - Estante B1', 'perdido'),
    ('EJ-0006', 4, 'Sala 1 - Estante A3', 'disponible');

-- Préstamo activo (vence en 4 días)
INSERT INTO prestamo (id_usuario, id_ejemplar, fecha_prestamo, fecha_vencimiento, estado, id_aprobador)
VALUES (2, 2, DATE('now','localtime','-3 days'), DATE('now','localtime','+4 days'), 'aprobado', 1);
UPDATE ejemplar SET estado = 'prestado' WHERE id_ejemplar = 2;

-- Préstamo vencido (13 días de retraso)
INSERT INTO prestamo (id_usuario, id_ejemplar, fecha_prestamo, fecha_vencimiento, estado, id_aprobador)
VALUES (3, 4, DATE('now','localtime','-20 days'), DATE('now','localtime','-13 days'), 'aprobado', 1);
UPDATE ejemplar SET estado = 'prestado' WHERE id_ejemplar = 4;

-- Préstamo ya devuelto con 3 días de retraso
INSERT INTO prestamo (id_usuario, id_ejemplar, fecha_prestamo, fecha_vencimiento, estado, id_aprobador)
VALUES (2, 6, DATE('now','localtime','-30 days'), DATE('now','localtime','-23 days'), 'devuelto', 1);
INSERT INTO devolucion (id_prestamo, fecha_devolucion, dias_retraso, valor_multa, observaciones, id_receptor)
VALUES (3, DATE('now','localtime','-20 days'), 3, 3000, 'páginas faltantes', 1);

-- Solicitud pendiente de aprobación
INSERT INTO prestamo (id_usuario, id_ejemplar, estado)
VALUES (5, 1, 'solicitado');