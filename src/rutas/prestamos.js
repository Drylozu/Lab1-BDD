// Rutas de préstamos y devoluciones (montadas en /api/prestamos)
const express = require('express');
const { db } = require('../db');
const { error, hoy, sumarDias, diasEntre, leerConfig } = require('../utils');
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

// Agrega cuántos días lleva vencido un préstamo activo (0 si está al día)
function conDiasVencido(p) {
  p.dias_vencido = p.estado === 'aprobado' ? Math.max(0, diasEntre(p.fecha_vencimiento, hoy())) : 0;
  return p;
}

// Historial de préstamos de un usuario (el propio usuario o el bibliotecario)
router.get('/usuario/:id', (req, res) => {
  if (req.usuario.rol !== 'bibliotecario' && Number(req.params.id) !== req.usuario.id_usuario) {
    throw error(403, 'No puedes ver el historial de otro usuario');
  }
  const prestamos = db.prepare(`${SQL_PRESTAMOS} WHERE p.id_usuario = ? ORDER BY p.id_prestamo DESC`).all(req.params.id);
  res.json(prestamos.map(conDiasVencido));
});

// Listado para el bibliotecario: solicitudes, activos, vencidos o todos
router.get('/', soloBibliotecario, (req, res) => {
  let prestamos;
  if (req.query.filtro === 'solicitados') {
    prestamos = db.prepare(`${SQL_PRESTAMOS} WHERE p.estado = 'solicitado' ORDER BY p.id_prestamo DESC`).all();
  } else if (req.query.filtro === 'activos') {
    prestamos = db.prepare(`${SQL_PRESTAMOS} WHERE p.estado = 'aprobado' ORDER BY p.fecha_vencimiento`).all();
  } else if (req.query.filtro === 'vencidos') {
    prestamos = db.prepare(`${SQL_PRESTAMOS} WHERE p.estado = 'aprobado' AND p.fecha_vencimiento < ?
                            ORDER BY p.fecha_vencimiento`).all(hoy());
  } else {
    prestamos = db.prepare(`${SQL_PRESTAMOS} ORDER BY p.id_prestamo DESC`).all();
  }
  res.json(prestamos.map(conDiasVencido));
});

// El usuario solicita un libro: se le asigna un ejemplar disponible que no esté ya solicitado
const solicitarPrestamo = db.transaction((idUsuario, idLibro) => {
  const usuario = db.prepare('SELECT estado FROM usuario WHERE id_usuario = ?').get(idUsuario);
  if (usuario.estado !== 'activo') throw error(400, 'Tu usuario está bloqueado, no puedes solicitar préstamos');

  const ejemplar = db.prepare(`
    SELECT id_ejemplar
    FROM ejemplar
    WHERE id_libro = ?
      AND estado = 'disponible'
      AND id_ejemplar NOT IN (SELECT id_ejemplar FROM prestamo WHERE estado = 'solicitado')
    LIMIT 1`).get(idLibro);
  if (!ejemplar) throw error(400, 'No hay ejemplares disponibles de este libro en este momento');

  return db.prepare('INSERT INTO prestamo (id_usuario, id_ejemplar) VALUES (?, ?)')
    .run(idUsuario, ejemplar.id_ejemplar).lastInsertRowid;
});

router.post('/', (req, res) => {
  if (req.usuario.rol === 'bibliotecario') throw error(400, 'El bibliotecario no solicita préstamos');
  res.status(201).json({ id_prestamo: solicitarPrestamo(req.usuario.id_usuario, req.body.id_libro) });
});

// El bibliotecario aprueba: se valida que el usuario esté activo y el ejemplar disponible
const aprobarPrestamo = db.transaction((idPrestamo, idAprobador, fechaVencimiento) => {
  const prestamo = db.prepare('SELECT * FROM prestamo WHERE id_prestamo = ?').get(idPrestamo);
  if (!prestamo || prestamo.estado !== 'solicitado') throw error(400, 'La solicitud ya no está pendiente');

  const usuario = db.prepare('SELECT estado FROM usuario WHERE id_usuario = ?').get(prestamo.id_usuario);
  if (usuario.estado !== 'activo') throw error(400, 'No se puede prestar: el usuario está bloqueado');

  const ejemplar = db.prepare('SELECT estado FROM ejemplar WHERE id_ejemplar = ?').get(prestamo.id_ejemplar);
  if (ejemplar.estado !== 'disponible') throw error(400, 'No se puede prestar: el ejemplar no está disponible');

  const vence = fechaVencimiento || sumarDias(hoy(), leerConfig('dias_prestamo'));
  if (vence < hoy()) throw error(400, 'La fecha de vencimiento no puede ser anterior a hoy');

  db.prepare(`
    UPDATE prestamo
    SET estado = 'aprobado', fecha_prestamo = ?, fecha_vencimiento = ?, id_aprobador = ?
    WHERE id_prestamo = ?`).run(hoy(), vence, idAprobador, idPrestamo);
  db.prepare("UPDATE ejemplar SET estado = 'prestado' WHERE id_ejemplar = ?").run(prestamo.id_ejemplar);
});

router.put('/:id/aprobar', soloBibliotecario, (req, res) => {
  aprobarPrestamo(req.params.id, req.usuario.id_usuario, req.body.fecha_vencimiento);
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

// Devolución: calcula días de retraso y multa, y deja el ejemplar disponible
const devolverPrestamo = db.transaction((idPrestamo, idReceptor, observaciones) => {
  const prestamo = db.prepare('SELECT * FROM prestamo WHERE id_prestamo = ?').get(idPrestamo);
  if (!prestamo || prestamo.estado !== 'aprobado') throw error(400, 'El préstamo no está activo');

  const diasRetraso = Math.max(0, diasEntre(prestamo.fecha_vencimiento, hoy()));
  const multa = diasRetraso * leerConfig('multa_por_dia');

  db.prepare(`
    INSERT INTO devolucion (id_prestamo, fecha_devolucion, dias_retraso, valor_multa, observaciones, id_receptor)
    VALUES (?, ?, ?, ?, ?, ?)`).run(idPrestamo, hoy(), diasRetraso, multa, observaciones || null, idReceptor);
  db.prepare("UPDATE prestamo SET estado = 'devuelto' WHERE id_prestamo = ?").run(idPrestamo);
  db.prepare("UPDATE ejemplar SET estado = 'disponible' WHERE id_ejemplar = ?").run(prestamo.id_ejemplar);
  return { dias_retraso: diasRetraso, valor_multa: multa };
});

router.post('/:id/devolver', soloBibliotecario, (req, res) => {
  res.json(devolverPrestamo(req.params.id, req.usuario.id_usuario, req.body.observaciones));
});

module.exports = router;
