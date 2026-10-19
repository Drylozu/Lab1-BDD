PRAGMA foreign_keys = ON;

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

-- Datos de prueba
INSERT INTO configuracion (clave, valor) VALUES
    ('multa_por_dia', 1500),
    ('dias_prestamo', 10);

INSERT INTO usuario (codigo, identificacion, nombres, correo, contraseña, rol, carrera, estado) VALUES
    ('BIB001', '1020304050', 'Valentina Ríos',        'valentina.rios@universidad.edu.co',   'admin123', 'bibliotecario', NULL, 'activo'),
    ('BIB002', '1020304051', 'Julián Herrera',        'julian.herrera@universidad.edu.co',   'admin123', 'bibliotecario', NULL, 'activo'),
    ('EST101', '1098765401', 'Sofía Castaño',         'sofia.castano@universidad.edu.co',    'clave123', 'estudiante', 'Ingeniería de Datos', 'activo'),
    ('EST102', '1098765402', 'Mateo Londoño',         'mateo.londono@universidad.edu.co',    'clave123', 'estudiante', 'Diseño Digital', 'activo'),
    ('EST103', '1098765403', 'Isabella Duarte',       'isabella.duarte@universidad.edu.co',  'clave123', 'estudiante', 'Biotecnología', 'activo'),
    ('EST104', '1098765404', 'Samuel Ortiz',          'samuel.ortiz@universidad.edu.co',     'clave123', 'estudiante', 'Ciencia Política', 'bloqueado'),
    ('EST105', '1098765405', 'Camila Restrepo',       'camila.restrepo@universidad.edu.co',  'clave123', 'estudiante', 'Ingeniería Mecatrónica', 'activo'),
    ('DOC101', '5201234567', 'Dra. Natalia Quintero', 'natalia.quintero@universidad.edu.co', 'clave123', 'docente', NULL, 'activo'),
    ('DOC102', '5201234568', 'Prof. Tomás Arango',    'tomas.arango@universidad.edu.co',     'clave123', 'docente', NULL, 'activo');

INSERT INTO categoria (nombre) VALUES
    ('Ciencia Ficción'), ('Novela Contemporánea'), ('Ensayo'), ('Inteligencia Artificial'), ('Ingeniería de Datos');

INSERT INTO editorial (nombre) VALUES
    ('Anagrama'), ('Nova'), ('Salamandra'), ('Siruela'), ('Debate'), ('O''Reilly'), ('Random House');

INSERT INTO autor (nombre) VALUES
    ('Kazuo Ishiguro'), ('Andy Weir'), ('Gabrielle Zevin'), ('David Uclés'),
    ('Yuval Noah Harari'), ('Mustafa Suleyman'), ('Michael Bhaskar'), ('Chip Huyen'),
    ('Martin Kleppmann'), ('Chris Riccomini'), ('Gabriela Cabezón Cámara'), ('Samantha Harvey');

INSERT INTO libro (isbn, titulo, año, descripcion, id_editorial, id_categoria) VALUES
    ('9788433980861', 'Klara y el Sol', 2021, 'Una amiga artificial observa el mundo humano desde un escaparate.', 1, 1),
    ('9788418037177', 'Proyecto Hail Mary', 2021, 'Un profesor despierta solo en una nave con la misión de salvar la Tierra.', 2, 1),
    ('9788419346230', 'Mañana, y mañana, y mañana', 2023, 'Dos amigos crean videojuegos durante treinta años.', 3, 2),
    ('9788419942807', 'La península de las casas vacías', 2024, 'La Guerra Civil española contada con realismo mágico.', 4, 2),
    ('9788419399878', 'Nexus', 2024, 'Historia de las redes de información, de la Edad de Piedra a la IA.', 5, 3),
    ('9788419642103', 'La ola que viene', 2023, 'Los riesgos y oportunidades de la inteligencia artificial y la biotecnología.', 5, 4),
    ('9781098166304', 'AI Engineering', 2025, 'Cómo construir aplicaciones con modelos fundacionales.', 6, 4),
    ('9781098119065', 'Designing Data-Intensive Applications (2.ª ed.)', 2025, 'Sistemas de datos confiables, escalables y mantenibles.', 6, 5),
    ('9788439742524', 'Las niñas del naranjel', 2023, 'La monja alférez huye a la selva sudamericana.', 7, 2),
    ('9788433922502', 'Orbital', 2024, 'Un día en la Estación Espacial Internacional: dieciséis amaneceres.', 1, 1);

INSERT INTO libro_autor (id_libro, id_autor) VALUES
    (1, 1), (2, 2), (3, 3), (4, 4), (5, 5),
    (6, 6), (6, 7),
    (7, 8),
    (8, 9), (8, 10),
    (9, 11), (10, 12);

INSERT INTO ejemplar (codigo_barras, id_libro, ubicacion, estado) VALUES
    ('BC-1001',  1,  'Piso 2 - Módulo C1', 'disponible'),
    ('BC-1002',  1,  'Piso 2 - Módulo C1', 'prestado'),
    ('BC-2001',  2,  'Piso 2 - Módulo C1', 'prestado'),
    ('BC-2002',  2,  'Piso 2 - Módulo C1', 'disponible'),
    ('BC-2003',  2,  'Piso 2 - Módulo C1', 'disponible'),
    ('BC-3001',  3,  'Piso 2 - Módulo C2', 'disponible'),
    ('BC-4001',  4,  'Piso 2 - Módulo C2', 'disponible'),
    ('BC-4002',  4,  'Piso 2 - Módulo C2', 'perdido'),
    ('BC-5001',  5,  'Piso 3 - Módulo E1', 'prestado'),
    ('BC-5002',  5,  'Piso 3 - Módulo E1', 'disponible'),
    ('BC-6001',  6,  'Piso 3 - Módulo T4', 'disponible'),
    ('BC-7001',  7,  'Piso 3 - Módulo T4', 'prestado'),
    ('BC-7002',  7,  'Piso 3 - Módulo T4', 'disponible'),
    ('BC-8001',  8,  'Piso 3 - Módulo T5', 'disponible'),
    ('BC-8002',  8,  'Piso 3 - Módulo T5', 'disponible'),
    ('BC-9001',  9,  'Piso 2 - Módulo C2', 'disponible'),
    ('BC-10001', 10, 'Piso 2 - Módulo C1', 'disponible'),
    ('BC-10002', 10, 'Piso 2 - Módulo C1', 'perdido');

INSERT INTO prestamo (id_usuario, id_ejemplar, fecha_solicitud, fecha_prestamo, fecha_vencimiento, estado, id_aprobador) VALUES
    (3, 2,  DATETIME('now','localtime','-3 days'),  DATE('now','localtime','-2 days'),  DATE('now','localtime','+8 days'),  'aprobado', 1),
    (4, 3,  DATETIME('now','localtime','-16 days'), DATE('now','localtime','-15 days'), DATE('now','localtime','-5 days'),  'aprobado', 2),
    (9, 9,  DATETIME('now','localtime','-1 days'),  DATE('now','localtime','-1 days'),  DATE('now','localtime','+9 days'),  'aprobado', 1),
    (7, 12, DATETIME('now','localtime','-13 days'), DATE('now','localtime','-12 days'), DATE('now','localtime','-2 days'),  'aprobado', 1),
    (3, 7,  DATETIME('now','localtime','-41 days'), DATE('now','localtime','-40 days'), DATE('now','localtime','-30 days'), 'devuelto', 1),
    (5, 14, DATETIME('now','localtime','-26 days'), DATE('now','localtime','-25 days'), DATE('now','localtime','-15 days'), 'devuelto', 2),
    (6, 16, DATETIME('now','localtime','-61 days'), DATE('now','localtime','-60 days'), DATE('now','localtime','-50 days'), 'devuelto', 1),
    (8, 1,  DATETIME('now','localtime','-21 days'), DATE('now','localtime','-20 days'), DATE('now','localtime','-10 days'), 'devuelto', 2),
    (9, 17, DATETIME('now','localtime','-10 days'), DATE('now','localtime','-9 days'),  DATE('now','localtime','+1 days'),  'devuelto', 1),
    (4, 11, DATETIME('now','localtime','-6 days'),  NULL, NULL, 'rechazado', 2),
    (8, 6,  DATETIME('now','localtime','-1 days'),  NULL, NULL, 'solicitado', NULL),
    (5, 13, DATETIME('now','localtime'),            NULL, NULL, 'solicitado', NULL);

INSERT INTO devolucion (id_prestamo, fecha_devolucion, dias_retraso, valor_multa, observaciones, id_receptor) VALUES
    (5, DATE('now','localtime','-27 days'), 3,  4500,  NULL, 1),
    (6, DATE('now','localtime','-16 days'), 0,  0,     NULL, 2),
    (7, DATE('now','localtime','-38 days'), 12, 18000, 'portada dañada', 1),
    (8, DATE('now','localtime','-12 days'), 0,  0,     NULL, 2),
    (9, DATE('now','localtime','-3 days'),  0,  0,     'subrayado a lápiz', 1);
