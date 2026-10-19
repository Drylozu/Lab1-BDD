const { db } = require('./db');
const { error } = require('./utils');

function login(req, res) {
  const { correo, contraseña } = req.body;
  const usuario = db.prepare(`
    SELECT id_usuario, codigo, nombres, correo, rol, carrera, estado
    FROM usuario
    WHERE correo = ? AND contraseña = ?`).get(correo, contraseña);
  if (!usuario) throw error(401, 'Correo o contraseña incorrectos');
  res.json(usuario);
}

// El frontend envía el id del usuario logueado en el header x-usuario-id
function requiereSesion(req, res, next) {
  const id = req.get('x-usuario-id');
  if (id) {
    req.usuario = db.prepare('SELECT id_usuario, nombres, rol, estado FROM usuario WHERE id_usuario = ?').get(id);
  }
  if (!req.usuario) throw error(401, 'Debe iniciar sesión');
  next();
}

function soloBibliotecario(req, res, next) {
  if (req.usuario.rol !== 'bibliotecario') throw error(403, 'Solo el bibliotecario puede hacer esto');
  next();
}

module.exports = { login, requiereSesion, soloBibliotecario };
