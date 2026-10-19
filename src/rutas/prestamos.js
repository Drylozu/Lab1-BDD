const express = require('express');
const { db } = require('../db');
const { error, hoy, sumarDias, diasDeRetraso, leerConfig } = require('../utils');
const { soloBibliotecario } = require('../sesion');

const router = express.Router();

const SQL_PRESTAMOS = `
  SELECT p.id_prestamo, p.estado, p.fecha_solicitud, p.fecha_prestamo, p.fecha_vencimiento,
         u.nombres AS usuario, u.codigo AS codigo_usuario,
         l.titulo, x.codigo_barras,
         d.fecha_devolucion, d.dias_retraso, d.valor_multa, d.observaciones
  FROM prestamo p
  JOIN usuario u  ON u.id_usuario  = p.id_usuario
  JOIN ejemplar x ON x.id_ejemplar = p.id_ejemplar
  JOIN libro l    ON l.id_libro    = x.id_libro
  LEFT JOIN devolucion d ON d.id_prestamo = p.id_prestamo`;

const FILTROS = {
  solicitados: "WHERE p.estado = 'solicitado' ORDER BY p.id_prestamo DESC",
  activos: "WHERE p.estado = 'aprobado' ORDER BY p.fecha_vencimiento",
  vencidos: "WHERE p.estado = 'aprobado' AND p.fecha_vencimiento < ? ORDER BY p.fecha_vencimiento",
  todos: 'ORDER BY p.id_prestamo DESC',
};

function conDiasVencido(p) {
  p.dias_vencido = p.estado === 'aprobado' ? diasDeRetraso(p.fecha_vencimiento) : 0;
  return p;
}

function buscarPrestamo(id) {
  return db.prepare('SELECT * FROM prestamo WHERE id_prestamo = ?').get(id);
}

function usuarioActivo(idUsuario) {
  return db.prepare('SELECT estado FROM usuario WHERE id_usuario = ?').get(idUsuario).estado === 'activo';
}

router.get('/usuario/:id', (req, res) => {
  const esElMismo = Number(req.params.id) === req.usuario.id_usuario;
  if (req.usuario.rol !== 'bibliotecario' && !esElMismo) {
    throw error(403, 'No puedes ver el historial de otro usuario');
  }
  const prestamos = db.prepare(`${SQL_PRESTAMOS} WHERE p.id_usuario = ? ORDER BY p.id_prestamo DESC`).all(req.params.id);
  res.json(prestamos.map(conDiasVencido));
});

router.get('/', soloBibliotecario, (req, res) => {
  const filtro = FILTROS[req.query.filtro] ? req.query.filtro : 'todos';
  const valores = filtro === 'vencidos' ? [hoy()] : [];
  const prestamos = db.prepare(`${SQL_PRESTAMOS} ${FILTROS[filtro]}`).all(...valores);
  res.json(prestamos.map(conDiasVencido));
});

// Solicitud: se asigna un ejemplar disponible que nadie haya solicitado ya
router.post('/', (req, res) => {
  if (req.usuario.rol === 'bibliotecario') throw error(400, 'El bibliotecario no solicita préstamos');
  if (!usuarioActivo(req.usuario.id_usuario)) {
    throw error(400, 'Tu usuario está bloqueado, no puedes solicitar préstamos');
  }

  const ejemplar = db.prepare(`
    SELECT id_ejemplar
    FROM ejemplar
    WHERE id_libro = ?
      AND estado = 'disponible'
      AND id_ejemplar NOT IN (SELECT id_ejemplar FROM prestamo WHERE estado = 'solicitado')
    LIMIT 1`).get(req.body.id_libro);
  if (!ejemplar) throw error(400, 'No hay ejemplares disponibles de este libro en este momento');

  const info = db.prepare('INSERT INTO prestamo (id_usuario, id_ejemplar) VALUES (?, ?)')
    .run(req.usuario.id_usuario, ejemplar.id_ejemplar);
  res.status(201).json({ id_prestamo: info.lastInsertRowid });
});

router.put('/:id/aprobar', soloBibliotecario, (req, res) => {
  const prestamo = buscarPrestamo(req.params.id);
  if (!prestamo || prestamo.estado !== 'solicitado') throw error(400, 'La solicitud ya no está pendiente');
  if (!usuarioActivo(prestamo.id_usuario)) throw error(400, 'No se puede prestar: el usuario está bloqueado');

  const ejemplar = db.prepare('SELECT estado FROM ejemplar WHERE id_ejemplar = ?').get(prestamo.id_ejemplar);
  if (ejemplar.estado !== 'disponible') throw error(400, 'No se puede prestar: el ejemplar no está disponible');

  const vence = req.body.fecha_vencimiento || sumarDias(hoy(), leerConfig('dias_prestamo'));
  if (vence < hoy()) throw error(400, 'La fecha de vencimiento no puede ser anterior a hoy');

  db.prepare(`
    UPDATE prestamo
    SET estado = 'aprobado', fecha_prestamo = ?, fecha_vencimiento = ?, id_aprobador = ?
    WHERE id_prestamo = ?`).run(hoy(), vence, req.usuario.id_usuario, prestamo.id_prestamo);
  db.prepare("UPDATE ejemplar SET estado = 'prestado' WHERE id_ejemplar = ?").run(prestamo.id_ejemplar);
  res.json({ ok: true });
});

router.put('/:id/rechazar', soloBibliotecario, (req, res) => {
  const info = db.prepare(`
    UPDATE prestamo
    SET estado = 'rechazado', id_aprobador = ?
    WHERE id_prestamo = ? AND estado = 'solicitado'`).run(req.usuario.id_usuario, req.params.id);
  if (info.changes === 0) throw error(400, 'La solicitud ya no está pendiente');
  res.json({ ok: true });
});

router.post('/:id/devolver', soloBibliotecario, (req, res) => {
  const prestamo = buscarPrestamo(req.params.id);
  if (!prestamo || prestamo.estado !== 'aprobado') throw error(400, 'El préstamo no está activo');

  const diasRetraso = diasDeRetraso(prestamo.fecha_vencimiento);
  const multa = diasRetraso * leerConfig('multa_por_dia');
  const observaciones = req.body.observaciones || null;

  db.prepare(`
    INSERT INTO devolucion (id_prestamo, fecha_devolucion, dias_retraso, valor_multa, observaciones, id_receptor)
    VALUES (?, ?, ?, ?, ?, ?)`)
    .run(prestamo.id_prestamo, hoy(), diasRetraso, multa, observaciones, req.usuario.id_usuario);
  db.prepare("UPDATE prestamo SET estado = 'devuelto' WHERE id_prestamo = ?").run(prestamo.id_prestamo);
  db.prepare("UPDATE ejemplar SET estado = 'disponible' WHERE id_ejemplar = ?").run(prestamo.id_ejemplar);
  res.json({ dias_retraso: diasRetraso, valor_multa: multa });
});

module.exports = router;
