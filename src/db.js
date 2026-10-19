const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const db = new Database(path.join(__dirname, '..', 'biblioteca.db'));
db.pragma('foreign_keys = ON');

function crearTablas() {
  const ddl = fs.readFileSync(path.join(__dirname, '..', 'ddl.sql'), 'utf8');
  db.exec(ddl);
}

const existe = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'usuario'").get();
if (!existe) crearTablas();

module.exports = { db, crearTablas };
