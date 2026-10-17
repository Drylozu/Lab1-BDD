// Rutas de configuración (montadas en /api/configuracion)
const express = require('express');
const { db } = require('../db');
const { error, hoy, sumarDias, leerConfig } = require('../utils');
const { soloBibliotecario } = require('../sesion');

const router = express.Router();

router.get('/', (req, res) => {
  const dias = leerConfig('dias_prestamo');
  res.json({
    multa_por_dia: leerConfig('multa_por_dia'),
    dias_prestamo: dias,
    vencimiento_sugerido: sumarDias(hoy(), dias),
  });
});

router.put('/', soloBibliotecario, (req, res) => {
  const multa = Number(req.body.multa_por_dia);
  const dias = Number(req.body.dias_prestamo);
  if (!(multa >= 0) || !(dias >= 1)) throw error(400, 'Valores inválidos');
  db.prepare("UPDATE configuracion SET valor = ? WHERE clave = 'multa_por_dia'").run(multa);
  db.prepare("UPDATE configuracion SET valor = ? WHERE clave = 'dias_prestamo'").run(dias);
  res.json({ ok: true });
});

module.exports = router;
