const express = require('express');
const { db } = require('../db');
const { error, obtenerId } = require('../utils');
const { soloBibliotecario } = require('../sesion');

const router = express.Router();

const SQL_LIBRO = `
  SELECT l.id_libro, l.isbn, l.titulo, l.año, l.descripcion,
         e.nombre AS editorial, c.nombre AS categoria
  FROM libro l
  JOIN editorial e ON e.id_editorial = l.id_editorial
  JOIN categoria c ON c.id_categoria = l.id_categoria`;

const POR_TITULO = 'l.titulo LIKE ?';
const POR_ISBN = 'l.isbn LIKE ?';
const POR_AUTOR = `l.id_libro IN (
  SELECT la.id_libro FROM libro_autor la
  JOIN autor a ON a.id_autor = la.id_autor
  WHERE a.nombre LIKE ?)`;

function completarLibro(libro) {
  const autores = db.prepare(`
    SELECT a.nombre
    FROM autor a
    JOIN libro_autor la ON la.id_autor = a.id_autor
    WHERE la.id_libro = ?`).all(libro.id_libro);

  const conteo = db.prepare(`
    SELECT COUNT(*) AS total, SUM(estado = 'disponible') AS disponibles
    FROM ejemplar
    WHERE id_libro = ?`).get(libro.id_libro);

  libro.autores = autores.map(a => a.nombre).join(', ');
  libro.total_ejemplares = conteo.total;
  libro.disponibles = conteo.disponibles || 0;
  return libro;
}

router.get('/catalogos', (req, res) => {
  const nombres = tabla => db.prepare(`SELECT nombre FROM ${tabla} ORDER BY nombre`).all().map(f => f.nombre);
  res.json({ categorias: nombres('categoria'), editoriales: nombres('editorial') });
});

router.get('/', (req, res) => {
  const { campo, texto, categoria, disponibles } = req.query;
  const condiciones = [];
  const valores = [];

  if (texto) {
    const t = `%${texto}%`;
    if (campo === 'titulo') {
      condiciones.push(POR_TITULO);
      valores.push(t);
    } else if (campo === 'isbn') {
      condiciones.push(POR_ISBN);
      valores.push(t);
    } else if (campo === 'autor') {
      condiciones.push(POR_AUTOR);
      valores.push(t);
    } else {
      condiciones.push(`(${POR_TITULO} OR ${POR_ISBN} OR ${POR_AUTOR})`);
      valores.push(t, t, t);
    }
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

router.get('/:id', (req, res) => {
  const libro = db.prepare(`${SQL_LIBRO} WHERE l.id_libro = ?`).get(req.params.id);
  if (!libro) throw error(404, 'Libro no encontrado');

  completarLibro(libro);
  libro.ejemplares = db.prepare('SELECT * FROM ejemplar WHERE id_libro = ? ORDER BY codigo_barras').all(req.params.id);
  res.json(libro);
});

function leerLibro(body) {
  const autores = String(body.autores || '').split(',').map(a => a.trim()).filter(Boolean);
  if (!body.isbn || !body.titulo || !body.editorial || !body.categoria || autores.length === 0) {
    throw error(400, 'ISBN, título, editorial, categoría y al menos un autor son obligatorios');
  }
  return {
    isbn: body.isbn,
    titulo: body.titulo,
    año: body.año || null,
    descripcion: body.descripcion || null,
    idEditorial: obtenerId('editorial', body.editorial.trim()),
    idCategoria: obtenerId('categoria', body.categoria.trim()),
    autores: [...new Set(autores)],
  };
}

function guardarAutores(idLibro, autores) {
  db.prepare('DELETE FROM libro_autor WHERE id_libro = ?').run(idLibro);
  const insertar = db.prepare('INSERT INTO libro_autor (id_libro, id_autor) VALUES (?, ?)');
  for (const nombre of autores) {
    insertar.run(idLibro, obtenerId('autor', nombre));
  }
}

router.post('/', soloBibliotecario, (req, res) => {
  const l = leerLibro(req.body);
  const info = db.prepare(`
    INSERT INTO libro (isbn, titulo, año, descripcion, id_editorial, id_categoria)
    VALUES (?, ?, ?, ?, ?, ?)`).run(l.isbn, l.titulo, l.año, l.descripcion, l.idEditorial, l.idCategoria);
  guardarAutores(info.lastInsertRowid, l.autores);
  res.status(201).json({ id_libro: info.lastInsertRowid });
});

router.put('/:id', soloBibliotecario, (req, res) => {
  const l = leerLibro(req.body);
  db.prepare(`
    UPDATE libro
    SET isbn = ?, titulo = ?, año = ?, descripcion = ?, id_editorial = ?, id_categoria = ?
    WHERE id_libro = ?`).run(l.isbn, l.titulo, l.año, l.descripcion, l.idEditorial, l.idCategoria, req.params.id);
  guardarAutores(req.params.id, l.autores);
  res.json({ ok: true });
});

// Ejemplares y autores se borran por ON DELETE CASCADE
router.delete('/:id', soloBibliotecario, (req, res) => {
  db.prepare('DELETE FROM libro WHERE id_libro = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
