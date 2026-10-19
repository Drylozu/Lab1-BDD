const express = require('express');
const { db } = require('../db');
const { error, hoy, sumarDias, leerConfig } = require('../utils');
const { soloBibliotecario } = require('../sesion');

const router = express.Router();

router.get('/', (req, res) => {
  const multa = leerConfig('multa_por_dia');
  const dias = leerConfig('dias_prestamo');
  res.json({
    multa_por_dia: multa,
    dias_prestamo: dias,
    vencimiento_sugerido: sumarDias(hoy(), dias),
  });
});

router.put('/', soloBibliotecario, (req, res) => {
  const multa = Number(req.body.multa_por_dia);
  const dias = Number(req.body.dias_prestamo);
  if (!(multa >= 0) || !(dias >= 1)) throw error(400, 'Valores inválidos');

  const actualizar = db.prepare('UPDATE configuracion SET valor = ? WHERE clave = ?');
  actualizar.run(multa, 'multa_por_dia');
  actualizar.run(dias, 'dias_prestamo');
  res.json({ ok: true });
});

module.exports = router;
