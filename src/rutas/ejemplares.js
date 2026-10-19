const express = require('express');
const { db } = require('../db');
const { error } = require('../utils');
const { soloBibliotecario } = require('../sesion');

const router = express.Router();

// "prestado" solo lo cambian los préstamos; a mano solo se elige disponible o perdido
function estadoValido(estadoActual, estadoNuevo) {
  if (estadoActual === 'prestado') return 'prestado';
  if (estadoNuevo === 'perdido') return 'perdido';
  return 'disponible';
}

router.post('/', soloBibliotecario, (req, res) => {
  const { id_libro, codigo_barras, ubicacion, estado } = req.body;
  const info = db.prepare(`
    INSERT INTO ejemplar (id_libro, codigo_barras, ubicacion, estado)
    VALUES (?, ?, ?, ?)`).run(id_libro, codigo_barras, ubicacion, estadoValido(null, estado));
  res.status(201).json({ id_ejemplar: info.lastInsertRowid });
});

router.put('/:id', soloBibliotecario, (req, res) => {
  const actual = db.prepare('SELECT estado FROM ejemplar WHERE id_ejemplar = ?').get(req.params.id);
  if (!actual) throw error(404, 'Ejemplar no encontrado');

  const { codigo_barras, ubicacion, estado } = req.body;
  db.prepare(`
    UPDATE ejemplar
    SET codigo_barras = ?, ubicacion = ?, estado = ?
    WHERE id_ejemplar = ?`).run(codigo_barras, ubicacion, estadoValido(actual.estado, estado), req.params.id);
  res.json({ ok: true });
});

router.delete('/:id', soloBibliotecario, (req, res) => {
  db.prepare('DELETE FROM ejemplar WHERE id_ejemplar = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
