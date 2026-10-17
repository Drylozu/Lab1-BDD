const { db } = require('./db');

// Crea un error con código HTTP y mensaje para mostrar al usuario
function error(status, mensaje) {
  const e = new Error(mensaje);
  e.status = status;
  return e;
}

// Fechas como texto 'AAAA-MM-DD' (el mismo formato que guarda SQLite)
function hoy() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); // hora local
  return d.toISOString().slice(0, 10);
}

function sumarDias(fecha, dias) {
  const d = new Date(fecha);
  d.setUTCDate(d.getUTCDate() + Number(dias));
  return d.toISOString().slice(0, 10);
}

function diasEntre(desde, hasta) {
  return Math.round((new Date(hasta) - new Date(desde)) / (24 * 60 * 60 * 1000));
}

function leerConfig(clave) {
  return db.prepare('SELECT valor FROM configuracion WHERE clave = ?').get(clave).valor;
}

// Busca una categoría/editorial/autor por nombre; si no existe la crea. Devuelve su id.
function obtenerId(tabla, nombre) {
  const fila = db.prepare(`SELECT id_${tabla} AS id FROM ${tabla} WHERE nombre = ?`).get(nombre);
  if (fila) return fila.id;
  return db.prepare(`INSERT INTO ${tabla} (nombre) VALUES (?)`).run(nombre).lastInsertRowid;
}

module.exports = { error, hoy, sumarDias, diasEntre, leerConfig, obtenerId };
