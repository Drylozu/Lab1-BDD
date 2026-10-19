const express = require('express');
const path = require('path');
const { login, requiereSesion } = require('./sesion');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

app.post('/api/login', login);
app.use('/api', requiereSesion);

app.use('/api/libros', require('./rutas/libros'));
app.use('/api/ejemplares', require('./rutas/ejemplares'));
app.use('/api/usuarios', require('./rutas/usuarios'));
app.use('/api/prestamos', require('./rutas/prestamos'));
app.use('/api/reportes', require('./rutas/reportes'));
app.use('/api/configuracion', require('./rutas/configuracion'));

const MENSAJES_SQLITE = {
  SQLITE_CONSTRAINT_FOREIGNKEY: 'No se puede eliminar: tiene préstamos u otros registros asociados',
  SQLITE_CONSTRAINT_CHECK: 'Algún dato no es válido (revisa fechas, año, rol o estado)',
  SQLITE_CONSTRAINT_NOTNULL: 'Faltan campos obligatorios',
};

app.use((err, req, res, next) => {
  if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
    const campo = err.message.split(': ')[1];
    return res.status(400).json({ error: `Ya existe un registro con ese valor (${campo})` });
  }
  if (MENSAJES_SQLITE[err.code]) {
    return res.status(400).json({ error: MENSAJES_SQLITE[err.code] });
  }
  if (err.status) {
    return res.status(err.status).json({ error: err.message });
  }
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

app.listen(3000, () => {
  console.log('Biblioteca corriendo en http://localhost:3000');
});
