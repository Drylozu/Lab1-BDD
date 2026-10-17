// Rutas de usuarios (montadas en /api/usuarios)
const express = require('express');
const { db } = require('../db');
const { error } = require('../utils');
const { soloBibliotecario } = require('../sesion');

const router = express.Router();

router.get('/', soloBibliotecario, (req, res) => {
  const usuarios = db.prepare(`
    SELECT u.id_usuario, u.codigo, u.identificacion, u.nombres, u.correo, u.rol, u.carrera, u.estado,
           COUNT(p.id_prestamo) AS prestamos_activos
    FROM usuario u
    LEFT JOIN prestamo p ON p.id_usuario = u.id_usuario AND p.estado = 'aprobado'
    GROUP BY u.id_usuario
    ORDER BY u.nombres`).all();
  res.json(usuarios);
});

router.post('/', soloBibliotecario, (req, res) => {
  const u = req.body;
  if (!u.contraseña) throw error(400, 'La contraseña es obligatoria');
  const info = db.prepare(`
    INSERT INTO usuario (codigo, identificacion, nombres, correo, contraseña, rol, carrera, estado)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(u.codigo, u.identificacion, u.nombres, u.correo, u.contraseña, u.rol, u.carrera || null, u.estado || 'activo');
  res.status(201).json({ id_usuario: info.lastInsertRowid });
});

router.put('/:id', soloBibliotecario, (req, res) => {
  const u = req.body;
  db.prepare(`
    UPDATE usuario
    SET codigo = ?, identificacion = ?, nombres = ?, correo = ?, rol = ?, carrera = ?, estado = ?
    WHERE id_usuario = ?`)
    .run(u.codigo, u.identificacion, u.nombres, u.correo, u.rol, u.carrera || null, u.estado, req.params.id);

  // La contraseña solo se cambia si escribieron una nueva
  if (u.contraseña) {
    db.prepare('UPDATE usuario SET contraseña = ? WHERE id_usuario = ?').run(u.contraseña, req.params.id);
  }
  res.json({ ok: true });
});

router.delete('/:id', soloBibliotecario, (req, res) => {
  if (Number(req.params.id) === req.usuario.id_usuario) throw error(400, 'No puedes eliminar tu propio usuario');
  db.prepare('DELETE FROM usuario WHERE id_usuario = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
