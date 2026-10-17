// =========================================================
// Préstamos (lector): solicitar y ver historial propio
// =========================================================

async function solicitarPrestamo(idLibro) {
  await api('/prestamos', 'POST', { id_libro: idLibro });
  aviso('Solicitud enviada. El bibliotecario debe aprobarla.');
  buscarLibros();
}


async function verMisPrestamos() {
  const prestamos = await api(`/prestamos/usuario/${usuario.id_usuario}`);
  const activos = prestamos.filter((p) => p.estado === 'aprobado').length;
  const pendientes = prestamos.filter((p) => p.estado === 'solicitado').length;
  const multas = prestamos.reduce((suma, p) => suma + (p.valor_multa || 0), 0);

  $('#contenido').innerHTML = `
    <div class="encabezado"><div><h1>Mis préstamos</h1><p class="muted">Tus solicitudes, préstamos y devoluciones.</p></div></div>
    ${usuario.estado === 'bloqueado' ? '<div class="alerta">Tu usuario está bloqueado. Acércate a la biblioteca.</div>' : ''}
    <div class="stats">
      <div class="stat"><span>${pendientes}</span>Solicitudes pendientes</div>
      <div class="stat"><span>${activos}</span>Préstamos activos</div>
      <div class="stat"><span>${pesos(multas)}</span>Multas acumuladas</div>
    </div>
    ${tablaPrestamos(prestamos, { conUsuario: false })}`;
}

// Tabla de préstamos reutilizada por el lector, el bibliotecario y el historial de usuario
function tablaPrestamos(prestamos, { conUsuario = true, conAcciones = false } = {}) {
  if (prestamos.length === 0) return '<p class="vacio">No hay préstamos aquí.</p>';
  const filas = prestamos.map((p) => `
    <tr class="${p.dias_vencido > 0 ? 'fila-vencida' : ''}">
      <td class="fecha">${p.id_prestamo}</td>
      ${conUsuario ? `<td>${esc(p.usuario)}<br><small class="muted">${esc(p.codigo_usuario)}</small></td>` : ''}
      <td>${esc(p.titulo)}<br><small class="muted">${esc(p.codigo_barras)}</small></td>
      <td class="fecha">${fecha(p.fecha_solicitud)}</td>
      <td class="fecha">${fecha(p.fecha_prestamo)}</td>
      <td class="fecha">${fecha(p.fecha_vencimiento)}</td>
      <td>${estadoPrestamo(p)}</td>
      <td>${p.fecha_devolucion
        ? `<span class="fecha">${fecha(p.fecha_devolucion)}</span><br><small class="muted">${p.dias_retraso ? `${p.dias_retraso} días tarde, multa ${pesos(p.valor_multa)}` : 'A tiempo'}${p.observaciones ? `<br>Observación: ${esc(p.observaciones)}` : ''}</small>`
        : '—'}</td>
      ${conAcciones ? `<td class="acciones">${accionesPrestamo(p)}</td>` : ''}
    </tr>`).join('');
  return `
    <div class="tabla">
      <table>
        <thead><tr>
          <th>N.º</th>${conUsuario ? '<th>Usuario</th>' : ''}<th>Libro / ejemplar</th><th>Solicitud</th>
          <th>Préstamo</th><th>Vence</th><th>Estado</th><th>Devolución / multa</th>${conAcciones ? '<th></th>' : ''}
        </tr></thead>
        <tbody>${filas}</tbody>
      </table>
    </div>`;
}

// =========================================================
// Préstamos (bibliotecario): aprobar, rechazar y devolver
// =========================================================

let filtroPrestamos = 'solicitados';

function accionesPrestamo(p) {
  if (p.estado === 'solicitado') {
    return `<button class="btn small primary" onclick="formAprobar(${p.id_prestamo})">Aprobar</button>
            <button class="btn small danger" onclick="rechazarPrestamo(${p.id_prestamo})">Rechazar</button>`;
  }
  if (p.estado === 'aprobado') {
    return `<button class="btn small primary" onclick="formDevolver(${p.id_prestamo}, ${p.dias_vencido})">Registrar devolución</button>`;
  }
  return '';
}

async function verPrestamos(filtro = filtroPrestamos) {
  filtroPrestamos = filtro;
  const prestamos = await api('/prestamos?filtro=' + filtro);
  const pestanas = [['solicitados', 'Solicitudes pendientes'], ['activos', 'Activos'], ['vencidos', 'Vencidos'], ['todos', 'Todos']];
  $('#contenido').innerHTML = `
    <div class="encabezado"><div><h1>Préstamos</h1><p class="muted">Aprueba las solicitudes y registra las devoluciones en el mostrador.</p></div></div>
    <div class="pestanas">
      ${pestanas.map(([id, texto]) => `<button class="${id === filtro ? 'activo' : ''}" onclick="verPrestamos('${id}')">${texto}</button>`).join('')}
    </div>
    ${tablaPrestamos(prestamos, { conAcciones: true })}`;
}

async function formAprobar(id) {
  const config = await api('/configuracion');
  abrirModal('Aprobar préstamo #' + id, `
    <form class="form" onsubmit="aprobarPrestamo(event, ${id})">
      <p>Se validará que el usuario esté <b>activo</b> y el ejemplar <b>disponible</b>. La fecha de préstamo será hoy.</p>
      <label>Fecha de vencimiento
        <input type="date" name="fecha_vencimiento" required value="${config.vencimiento_sugerido}"></label>
      <p class="muted small">Sugerida: ${config.dias_prestamo} días a partir de hoy.</p>
      <div class="form-acciones">
        <button type="button" class="btn" onclick="cerrarModal()">Cancelar</button>
        <button class="btn primary">Aprobar préstamo</button>
      </div>
    </form>`);
}

async function aprobarPrestamo(e, id) {
  e.preventDefault();
  await api(`/prestamos/${id}/aprobar`, 'PUT', datosFormulario(e.target));
  cerrarModal();
  aviso('Préstamo aprobado');
  verPrestamos();
}

async function rechazarPrestamo(id) {
  if (!confirm('¿Rechazar esta solicitud?')) return;
  await api(`/prestamos/${id}/rechazar`, 'PUT');
  aviso('Solicitud rechazada');
  verPrestamos();
}

async function formDevolver(id, diasRetraso) {
  const config = await api('/configuracion');
  const multa = diasRetraso * config.multa_por_dia;
  abrirModal('Registrar devolución #' + id, `
    <form class="form" onsubmit="devolverPrestamo(event, ${id})">
      <div class="${diasRetraso > 0 ? 'alerta' : 'info'}">
        ${diasRetraso > 0
          ? `Retraso de <b>${diasRetraso} días</b> → multa de <b>${pesos(multa)}</b> (${pesos(config.multa_por_dia)} por día)`
          : 'Devolución a tiempo, sin multa.'}
      </div>
      <label>Observaciones del ejemplar
        <input name="observaciones" list="dl-observaciones" placeholder="Opcional: dañado, páginas faltantes…"></label>
      <datalist id="dl-observaciones"><option value="dañado"><option value="páginas faltantes"></datalist>
      <div class="form-acciones">
        <button type="button" class="btn" onclick="cerrarModal()">Cancelar</button>
        <button class="btn primary">Registrar devolución</button>
      </div>
    </form>`);
}

async function devolverPrestamo(e, id) {
  e.preventDefault();
  const r = await api(`/prestamos/${id}/devolver`, 'POST', datosFormulario(e.target));
  cerrarModal();
  aviso(r.valor_multa > 0 ? `Devolución registrada. Multa: ${pesos(r.valor_multa)}` : 'Devolución registrada sin multa');
  verPrestamos();
}
