// Rutas de libros (montadas en /api/libros)
const express = require('express');
const { db } = require('../db');
const { error, obtenerId } = require('../utils');
const { soloBibliotecario } = require('../sesion');

const router = express.Router();

// Listas para autocompletar en los formularios
router.get('/catalogos', (req, res) => {
  res.json({
    categorias: db.prepare('SELECT nombre FROM categoria ORDER BY nombre').all().map(f => f.nombre),
    editoriales: db.prepare('SELECT nombre FROM editorial ORDER BY nombre').all().map(f => f.nombre),
  });
});

// Agrega a un libro sus autores y cuántos ejemplares tiene
function completarLibro(libro) {
  const autores = db.prepare(`
    SELECT a.nombre
    FROM autor a
    JOIN libro_autor la ON la.id_autor = a.id_autor
    WHERE la.id_libro = ?`).all(libro.id_libro);
  libro.autores = autores.map(a => a.nombre).join(', ');

  const conteo = db.prepare(`
    SELECT COUNT(*) AS total, SUM(estado = 'disponible') AS disponibles
    FROM ejemplar
    WHERE id_libro = ?`).get(libro.id_libro);
  libro.total_ejemplares = conteo.total;
  libro.disponibles = conteo.disponibles || 0;
  return libro;
}

const SQL_LIBRO = `
  SELECT l.id_libro, l.isbn, l.titulo, l.año, l.descripcion,
         e.nombre AS editorial, c.nombre AS categoria
  FROM libro l
  JOIN editorial e ON e.id_editorial = l.id_editorial
  JOIN categoria c ON c.id_categoria = l.id_categoria`;

// Búsqueda por título, autor, ISBN, categoría y disponibilidad.
// Se arma el WHERE solo con los filtros que llegaron.
router.get('/', (req, res) => {
  const { campo, texto, categoria, disponibles } = req.query;
  const condiciones = [];
  const valores = [];

  const porTitulo = 'l.titulo LIKE ?';
  const porIsbn = 'l.isbn LIKE ?';
  const porAutor = `l.id_libro IN (SELECT la.id_libro FROM libro_autor la
                                   JOIN autor a ON a.id_autor = la.id_autor
                                   WHERE a.nombre LIKE ?)`;
  if (texto) {
    const t = `%${texto}%`;
    if (campo === 'titulo') { condiciones.push(porTitulo); valores.push(t); }
    else if (campo === 'isbn') { condiciones.push(porIsbn); valores.push(t); }
    else if (campo === 'autor') { condiciones.push(porAutor); valores.push(t); }
    else { condiciones.push(`(${porTitulo} OR ${porIsbn} OR ${porAutor})`); valores.push(t, t, t); }
  }
  if (categoria) {
    condiciones.push('c.nombre = ?');
    valores.push(categoria);
  }
  if (disponibles) {
    condiciones.push("l.id_libro IN (SELECT id_libro FROM ejemplar WHERE estado = 'disponible')");
  }

  const where = condiciones.length ? 'WHERE ' + condiciones.join(' AND ') : '';
  const libros = db.prepare(`${SQL_LIBRO} ${where} ORDER BY l.titulo`).all(...valores);
  res.json(libros.map(completarLibro));
});

// Un libro con sus ejemplares
router.get('/:id', (req, res) => {
  const libro = db.prepare(`${SQL_LIBRO} WHERE l.id_libro = ?`).get(req.params.id);
  if (!libro) throw error(404, 'Libro no encontrado');
  completarLibro(libro);
  libro.ejemplares = db.prepare('SELECT * FROM ejemplar WHERE id_libro = ? ORDER BY codigo_barras').all(req.params.id);
  res.json(libro);
});

// Crea (id = null) o actualiza un libro junto con sus autores
const guardarLibro = db.transaction((id, b) => {
  const autores = String(b.autores || '').split(',').map(a => a.trim()).filter(Boolean);
  if (!b.isbn || !b.titulo || !b.editorial || !b.categoria || autores.length === 0) {
    throw error(400, 'ISBN, título, editorial, categoría y al menos un autor son obligatorios');
  }
  const idEditorial = obtenerId('editorial', b.editorial.trim());
  const idCategoria = obtenerId('categoria', b.categoria.trim());
  const año = b.año || null;
  const descripcion = b.descripcion || null;

  if (id) {
    db.prepare(`
      UPDATE libro
      SET isbn = ?, titulo = ?, año = ?, descripcion = ?, id_editorial = ?, id_categoria = ?
      WHERE id_libro = ?`).run(b.isbn, b.titulo, año, descripcion, idEditorial, idCategoria, id);
  } else {
    id = db.prepare(`
      INSERT INTO libro (isbn, titulo, año, descripcion, id_editorial, id_categoria)
      VALUES (?, ?, ?, ?, ?, ?)`).run(b.isbn, b.titulo, año, descripcion, idEditorial, idCategoria).lastInsertRowid;
  }

  // Se borran los autores anteriores y se vuelven a insertar
  db.prepare('DELETE FROM libro_autor WHERE id_libro = ?').run(id);
  for (const nombre of new Set(autores)) {
    db.prepare('INSERT INTO libro_autor (id_libro, id_autor) VALUES (?, ?)').run(id, obtenerId('autor', nombre));
  }
  return id;
});

router.post('/', soloBibliotecario, (req, res) => {
  res.status(201).json({ id_libro: guardarLibro(null, req.body) });
});

router.put('/:id', soloBibliotecario, (req, res) => {
  guardarLibro(req.params.id, req.body);
  res.json({ ok: true });
});

// Los ejemplares y autores se borran en cascada (ON DELETE CASCADE)
router.delete('/:id', soloBibliotecario, (req, res) => {
  db.prepare('DELETE FROM libro WHERE id_libro = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
