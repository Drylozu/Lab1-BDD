let ejemplaresActuales = [];

async function verEjemplares(idLibro) {
  const libro = await api('/libros/' + idLibro);
  ejemplaresActuales = libro.ejemplares;
  const filas = libro.ejemplares.map((x) => `
    <tr>
      <td><code>${esc(x.codigo_barras)}</code></td>
      <td>${esc(x.ubicacion)}</td>
      <td>${badge(x.estado)}</td>
      <td class="acciones">
        <button class="btn small" onclick="editarEjemplar(${x.id_ejemplar})">Editar</button>
        <button class="btn small danger" onclick="eliminarEjemplar(${x.id_ejemplar}, ${idLibro})">Eliminar</button>
      </td>
    </tr>`).join('');

  abrirModal('Ejemplares de ' + libro.titulo, `
    <table>
      <thead><tr><th>Código</th><th>Ubicación</th><th>Estado</th><th></th></tr></thead>
      <tbody>${filas || '<tr><td colspan="4" class="vacio">Este libro todavía no tiene ejemplares. Agrega el primero abajo.</td></tr>'}</tbody>
    </table>
    <h3 id="titulo-form-ejemplar">Agregar ejemplar</h3>
    <form id="form-ejemplar" class="form" onsubmit="guardarEjemplar(event, ${idLibro})">
      <input type="hidden" name="id_ejemplar">
      <div class="fila">
        <label>Código de barras <input name="codigo_barras" required placeholder="BC-1003"></label>
        <label>Ubicación <input name="ubicacion" required placeholder="Piso 2 - Módulo C1"></label>
        <label>Estado
          <select name="estado"><option>disponible</option><option>perdido</option></select>
        </label>
      </div>
      <p class="muted small">Un ejemplar prestado solo vuelve a estar disponible al registrar su devolución.</p>
      <div class="form-acciones">
        <button type="button" class="btn" onclick="verEjemplares(${idLibro})">Limpiar</button>
        <button class="btn primary">Guardar ejemplar</button>
      </div>
    </form>`);
}

function editarEjemplar(id) {
  const x = ejemplaresActuales.find((e) => e.id_ejemplar === id);
  const form = $('#form-ejemplar');
  form.id_ejemplar.value = x.id_ejemplar;
  form.codigo_barras.value = x.codigo_barras;
  form.ubicacion.value = x.ubicacion;
  form.estado.value = x.estado === 'perdido' ? 'perdido' : 'disponible';
  $('#titulo-form-ejemplar').textContent = 'Editar ejemplar ' + x.codigo_barras;
}

async function guardarEjemplar(e, idLibro) {
  e.preventDefault();
  const datos = datosFormulario(e.target);
  if (datos.id_ejemplar) await api('/ejemplares/' + datos.id_ejemplar, 'PUT', datos);
  else await api('/ejemplares', 'POST', { ...datos, id_libro: idLibro });
  aviso('Ejemplar guardado');
  verEjemplares(idLibro);
  buscarLibros();
}

async function eliminarEjemplar(id, idLibro) {
  if (!confirm('¿Eliminar este ejemplar?')) return;
  await api('/ejemplares/' + id, 'DELETE');
  aviso('Ejemplar eliminado');
  verEjemplares(idLibro);
  buscarLibros();
}
