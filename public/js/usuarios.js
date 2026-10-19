let usuariosActuales = [];

async function verUsuarios() {
  usuariosActuales = await api('/usuarios');
  $('#contenido').innerHTML = `
    <div class="encabezado">
      <div><h1>Usuarios</h1><p class="muted">Estudiantes, docentes y bibliotecarios con carné.</p></div>
      <button class="btn primary" onclick="formUsuario()">+ Nuevo usuario</button>
    </div>
    <div class="filtros"><input type="search" placeholder="Filtrar por nombre, código o correo…" oninput="pintarUsuarios(this.value)"></div>
    <div class="tabla">
      <table>
        <thead><tr><th>Código</th><th>Nombre</th><th>Identificación</th><th>Correo</th><th>Rol</th><th>Carrera</th><th>Estado</th><th>Activos</th><th></th></tr></thead>
        <tbody id="filas-usuarios"></tbody>
      </table>
    </div>`;
  pintarUsuarios('');
}

function pintarUsuarios(filtro) {
  const f = filtro.toLowerCase();
  const lista = usuariosActuales.filter((u) => `${u.nombres} ${u.codigo} ${u.correo}`.toLowerCase().includes(f));
  $('#filas-usuarios').innerHTML = lista.map((u) => `
    <tr>
      <td><code>${esc(u.codigo)}</code></td>
      <td>${esc(u.nombres)}</td>
      <td>${esc(u.identificacion)}</td>
      <td>${esc(u.correo)}</td>
      <td>${esc(u.rol)}</td>
      <td>${esc(u.carrera || '—')}</td>
      <td>${badge(u.estado)}</td>
      <td>${u.prestamos_activos}</td>
      <td class="acciones">
        <button class="btn small" onclick="verHistorial(${u.id_usuario})">Historial</button>
        <button class="btn small" onclick="formUsuario(${u.id_usuario})">Editar</button>
        <button class="btn small danger" onclick="eliminarUsuario(${u.id_usuario})">Eliminar</button>
      </td>
    </tr>`).join('') || '<tr><td colspan="9" class="vacio">Nadie coincide con ese filtro.</td></tr>';
}

function formUsuario(id) {
  const u = usuariosActuales.find((x) => x.id_usuario === id) || { rol: 'estudiante', estado: 'activo' };
  const opcion = (valor, actual) => `<option ${valor === actual ? 'selected' : ''}>${valor}</option>`;
  abrirModal(id ? 'Editar usuario' : 'Nuevo usuario', `
    <form class="form" onsubmit="guardarUsuario(event, ${id || 'null'})">
      <div class="fila">
        <label>Código <input name="codigo" required value="${esc(u.codigo)}"></label>
        <label>Identificación <input name="identificacion" required value="${esc(u.identificacion)}"></label>
      </div>
      <label>Nombres <input name="nombres" required value="${esc(u.nombres)}"></label>
      <div class="fila">
        <label>Correo <input name="correo" type="email" required value="${esc(u.correo)}"></label>
        <label>Contraseña <input name="contraseña" type="password" ${id ? 'placeholder="(sin cambios)"' : 'required'}></label>
      </div>
      <div class="fila">
        <label>Rol <select name="rol">${['estudiante', 'docente', 'bibliotecario'].map((r) => opcion(r, u.rol)).join('')}</select></label>
        <label>Estado <select name="estado">${['activo', 'bloqueado'].map((e) => opcion(e, u.estado)).join('')}</select></label>
      </div>
      <label>Carrera <small class="muted">(opcional)</small> <input name="carrera" value="${esc(u.carrera)}"></label>
      <div class="form-acciones">
        <button type="button" class="btn" onclick="cerrarModal()">Cancelar</button>
        <button class="btn primary">Guardar</button>
      </div>
    </form>`);
}

async function guardarUsuario(e, id) {
  e.preventDefault();
  const datos = datosFormulario(e.target);
  if (id) await api('/usuarios/' + id, 'PUT', datos);
  else await api('/usuarios', 'POST', datos);
  cerrarModal();
  aviso('Usuario guardado');
  verUsuarios();
}

async function eliminarUsuario(id) {
  if (!confirm('¿Eliminar este usuario?')) return;
  await api('/usuarios/' + id, 'DELETE');
  aviso('Usuario eliminado');
  verUsuarios();
}

async function verHistorial(id) {
  const u = usuariosActuales.find((x) => x.id_usuario === id);
  const prestamos = await api(`/prestamos/usuario/${id}`);
  abrirModal('Historial de ' + u.nombres, tablaPrestamos(prestamos, { conUsuario: false }));
}
