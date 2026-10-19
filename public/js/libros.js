async function verCatalogo() {
  const { categorias } = await api('/libros/catalogos');
  $('#contenido').innerHTML = `
    <div class="encabezado">
      <div><h1>Catálogo</h1><p class="muted">Busca por título, autor o ISBN, y filtra por categoría o disponibilidad.</p></div>
      ${esBibliotecario() ? '<button class="btn primary" onclick="formLibro()">+ Nuevo libro</button>' : ''}
    </div>
    <div class="filtros">
      <select id="f-campo" onchange="buscarLibros()">
        <option value="">Buscar en todo</option>
        <option value="titulo">Título</option>
        <option value="autor">Autor</option>
        <option value="isbn">ISBN</option>
      </select>
      <input id="f-texto" type="search" placeholder="Escribe para buscar…" oninput="buscarLibros()">
      <select id="f-categoria" onchange="buscarLibros()">
        <option value="">Todas las categorías</option>
        ${categorias.map((c) => `<option>${esc(c)}</option>`).join('')}
      </select>
      <label class="check"><input type="checkbox" id="f-disponibles" onchange="buscarLibros()"> Solo disponibles</label>
    </div>
    <div id="lista-libros" class="grid"></div>`;
  buscarLibros();
}

async function buscarLibros() {
  const params = new URLSearchParams({
    campo: $('#f-campo').value,
    texto: $('#f-texto').value,
    categoria: $('#f-categoria').value,
    disponibles: $('#f-disponibles').checked ? '1' : '',
  });
  const libros = await api('/libros?' + params);
  const vacio = '<p class="vacio">Ningún libro coincide con la búsqueda. Prueba con otra palabra o quita los filtros.</p>';
  $('#lista-libros').innerHTML = libros.map(tarjetaLibro).join('') || vacio;
}

function tarjetaLibro(l) {
  const acciones = esBibliotecario()
    ? `<button class="btn small" onclick="verEjemplares(${l.id_libro})">Ejemplares</button>
       <button class="btn small" onclick="formLibro(${l.id_libro})">Editar</button>
       <button class="btn small danger" onclick="eliminarLibro(${l.id_libro})">Eliminar</button>`
    : `<button class="btn small primary" ${l.disponibles ? '' : 'disabled'} onclick="solicitarPrestamo(${l.id_libro})">Solicitar préstamo</button>`;
  const disponibilidad = l.disponibles
    ? badge('disponible', `${l.disponibles} de ${l.total_ejemplares} en estante`)
    : badge('agotado', l.total_ejemplares ? 'todos prestados' : 'sin ejemplares');

  return `
    <article class="ficha">
      <div class="ficha-cabecera"><span>${esc(l.categoria)}</span><span>ISBN ${esc(l.isbn)}</span></div>
      <p class="ficha-autor">${esc(l.autores || 'Sin autor')}</p>
      <h3 class="ficha-titulo">${esc(l.titulo)}</h3>
      <p class="ficha-imprenta">${esc(l.editorial)}, ${l.año || 's. f.'}.</p>
      <p class="ficha-desc">${esc(l.descripcion)}</p>
      <div class="ficha-pie">${disponibilidad}<div class="acciones">${acciones}</div></div>
    </article>`;
}

async function formLibro(id) {
  const libro = id ? await api('/libros/' + id) : {};
  const { categorias, editoriales } = await api('/libros/catalogos');
  const opciones = (lista) => lista.map((n) => `<option value="${esc(n)}">`).join('');
  abrirModal(id ? 'Editar libro' : 'Nuevo libro', `
    <form class="form" onsubmit="guardarLibro(event, ${id || 'null'})">
      <div class="fila">
        <label>ISBN <input name="isbn" required value="${esc(libro.isbn)}"></label>
        <label>Año <input name="año" type="number" min="1000" max="2100" value="${esc(libro.año)}"></label>
      </div>
      <label>Título <input name="titulo" required value="${esc(libro.titulo)}"></label>
      <label>Autores <small class="muted">(separados por coma)</small>
        <input name="autores" required value="${esc(libro.autores)}" placeholder="Autor 1, Autor 2"></label>
      <div class="fila">
        <label>Editorial <input name="editorial" list="dl-editoriales" required value="${esc(libro.editorial)}"></label>
        <label>Categoría <input name="categoria" list="dl-categorias" required value="${esc(libro.categoria)}"></label>
      </div>
      <label>Descripción <textarea name="descripcion" rows="3">${esc(libro.descripcion)}</textarea></label>
      <datalist id="dl-editoriales">${opciones(editoriales)}</datalist>
      <datalist id="dl-categorias">${opciones(categorias)}</datalist>
      <div class="form-acciones">
        <button type="button" class="btn" onclick="cerrarModal()">Cancelar</button>
        <button class="btn primary">Guardar</button>
      </div>
    </form>`);
}

async function guardarLibro(e, id) {
  e.preventDefault();
  const datos = datosFormulario(e.target);
  if (id) await api('/libros/' + id, 'PUT', datos);
  else await api('/libros', 'POST', datos);
  cerrarModal();
  aviso('Libro guardado');
  verCatalogo();
}

async function eliminarLibro(id) {
  if (!confirm('¿Eliminar este libro y todos sus ejemplares?')) return;
  await api('/libros/' + id, 'DELETE');
  aviso('Libro eliminado');
  buscarLibros();
}
