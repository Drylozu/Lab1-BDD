const { db } = require('./db');

function error(status, mensaje) {
  const e = new Error(mensaje);
  e.status = status;
  return e;
}

// Fechas en formato 'AAAA-MM-DD', igual que SQLite
function hoy() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

function sumarDias(fecha, dias) {
  const d = new Date(fecha);
  d.setUTCDate(d.getUTCDate() + Number(dias));
  return d.toISOString().slice(0, 10);
}

function diasEntre(desde, hasta) {
  const UN_DIA = 24 * 60 * 60 * 1000;
  return Math.round((new Date(hasta) - new Date(desde)) / UN_DIA);
}

function diasDeRetraso(fechaVencimiento) {
  return Math.max(0, diasEntre(fechaVencimiento, hoy()));
}

function leerConfig(clave) {
  return db.prepare('SELECT valor FROM configuracion WHERE clave = ?').get(clave).valor;
}

// Busca por nombre en categoria, editorial o autor; si no existe lo crea
function obtenerId(tabla, nombre) {
  const fila = db.prepare(`SELECT id_${tabla} AS id FROM ${tabla} WHERE nombre = ?`).get(nombre);
  if (fila) return fila.id;
  return db.prepare(`INSERT INTO ${tabla} (nombre) VALUES (?)`).run(nombre).lastInsertRowid;
}

module.exports = { error, hoy, sumarDias, diasDeRetraso, leerConfig, obtenerId };
