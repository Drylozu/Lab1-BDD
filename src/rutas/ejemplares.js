// Rutas de ejemplares (montadas en /api/ejemplares)
const express = require('express');
const { db } = require('../db');
const { error } = require('../utils');
const { soloBibliotecario } = require('../sesion');

const router = express.Router();

// Manualmente solo se puede marcar disponible o perdido; "prestado" lo maneja el préstamo
function estadoEjemplar(estadoActual, estadoNuevo) {
  if (estadoActual === 'prestado') return 'prestado';
  return estadoNuevo === 'perdido' ? 'perdido' : 'disponible';
}

router.post('/', soloBibliotecario, (req, res) => {
  const { id_libro, codigo_barras, ubicacion, estado } = req.body;
  const info = db.prepare(`
    INSERT INTO ejemplar (id_libro, codigo_barras, ubicacion, estado)
    VALUES (?, ?, ?, ?)`).run(id_libro, codigo_barras, ubicacion, estadoEjemplar(null, estado));
  res.status(201).json({ id_ejemplar: info.lastInsertRowid });
});

router.put('/:id', soloBibliotecario, (req, res) => {
  const actual = db.prepare('SELECT estado FROM ejemplar WHERE id_ejemplar = ?').get(req.params.id);
  if (!actual) throw error(404, 'Ejemplar no encontrado');
  const { codigo_barras, ubicacion, estado } = req.body;
  db.prepare(`
    UPDATE ejemplar
    SET codigo_barras = ?, ubicacion = ?, estado = ?
    WHERE id_ejemplar = ?`).run(codigo_barras, ubicacion, estadoEjemplar(actual.estado, estado), req.params.id);
  res.json({ ok: true });
});

router.delete('/:id', soloBibliotecario, (req, res) => {
  db.prepare('DELETE FROM ejemplar WHERE id_ejemplar = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
