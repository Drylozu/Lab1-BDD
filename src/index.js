const express = require('express');
const path = require('path');
const { login, requiereSesion } = require('./sesion');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public'))); // el frontend

// Login (no necesita sesión). Todas las demás rutas /api sí la necesitan.
app.post('/api/login', login);
app.use('/api', requiereSesion);

// Cada archivo de src/rutas maneja un recurso
app.use('/api/libros', require('./rutas/libros'));
app.use('/api/ejemplares', require('./rutas/ejemplares'));
app.use('/api/usuarios', require('./rutas/usuarios'));
app.use('/api/prestamos', require('./rutas/prestamos'));
app.use('/api/reportes', require('./rutas/reportes'));
app.use('/api/configuracion', require('./rutas/configuracion'));

// =========================================================
// Manejo de errores: traduce los errores de SQLite a mensajes entendibles
// =========================================================

app.use((err, req, res, next) => {
  if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
    // El mensaje de SQLite es "UNIQUE constraint failed: usuario.correo" → mostramos el campo
    return res.status(400).json({ error: `Ya existe un registro con ese valor (${err.message.split(': ')[1]})` });
  }
  const mensajes = {
    SQLITE_CONSTRAINT_FOREIGNKEY: 'No se puede eliminar: tiene préstamos u otros registros asociados',
    SQLITE_CONSTRAINT_CHECK: 'Algún dato no es válido (revisa fechas, año, rol o estado)',
    SQLITE_CONSTRAINT_NOTNULL: 'Faltan campos obligatorios',
  };
  if (mensajes[err.code]) return res.status(400).json({ error: mensajes[err.code] });
  if (!err.status) console.error(err);
  res.status(err.status || 500).json({ error: err.status ? err.message : 'Error interno del servidor' });
});

app.listen(3000, () => {
  console.log('Biblioteca corriendo en http://localhost:3000');
});
