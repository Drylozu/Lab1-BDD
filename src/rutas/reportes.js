const express = require('express');
const { db } = require('../db');
const { hoy } = require('../utils');
const { soloBibliotecario } = require('../sesion');

const router = express.Router();

function contar(sql, ...valores) {
  return db.prepare(sql).get(...valores).total;
}

function inventarioPorEstado() {
  const inventario = { disponible: 0, prestado: 0, perdido: 0 };
  const filas = db.prepare('SELECT estado, COUNT(*) AS total FROM ejemplar GROUP BY estado').all();
  for (const fila of filas) inventario[fila.estado] = fila.total;
  return inventario;
}

router.get('/', soloBibliotecario, (req, res) => {
  const desde = req.query.desde || '0000-01-01';
  const hasta = req.query.hasta || '9999-12-31';

  const prestamos = {
    pendientes: contar("SELECT COUNT(*) AS total FROM prestamo WHERE estado = 'solicitado'"),
    activos: contar("SELECT COUNT(*) AS total FROM prestamo WHERE estado = 'aprobado'"),
    vencidos: contar("SELECT COUNT(*) AS total FROM prestamo WHERE estado = 'aprobado' AND fecha_vencimiento < ?", hoy()),
  };
  const multas = contar('SELECT COALESCE(SUM(valor_multa), 0) AS total FROM devolucion');

  const librosMasPrestados = db.prepare(`
    SELECT l.titulo, COUNT(*) AS total
    FROM prestamo p
    JOIN ejemplar x ON x.id_ejemplar = p.id_ejemplar
    JOIN libro l    ON l.id_libro    = x.id_libro
    WHERE p.fecha_prestamo BETWEEN ? AND ?
    GROUP BY l.id_libro
    ORDER BY total DESC
    LIMIT 10`).all(desde, hasta);

  const usuariosConMasPrestamos = db.prepare(`
    SELECT u.nombres, u.codigo, COUNT(*) AS total
    FROM prestamo p
    JOIN usuario u ON u.id_usuario = p.id_usuario
    WHERE p.fecha_prestamo BETWEEN ? AND ?
    GROUP BY u.id_usuario
    ORDER BY total DESC
    LIMIT 10`).all(desde, hasta);

  res.json({
    inventario: inventarioPorEstado(),
    prestamos,
    multas,
    librosMasPrestados,
    usuariosConMasPrestamos,
  });
});

module.exports = router;
