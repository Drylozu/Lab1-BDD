// =========================================================
// Reportes
// =========================================================

async function verReportes() {
  $('#contenido').innerHTML = `
    <div class="encabezado">
      <div><h1>Reportes</h1><p class="muted">Los rankings usan la fecha de préstamo dentro del periodo elegido.</p></div>
      <form class="filtros" onsubmit="event.preventDefault(); cargarReportes()">
        <label>Desde <input type="date" id="r-desde" onchange="cargarReportes()"></label>
        <label>Hasta <input type="date" id="r-hasta" onchange="cargarReportes()"></label>
      </form>
    </div>
    <div id="reportes"></div>`;
  cargarReportes();
}

async function cargarReportes() {
  const params = new URLSearchParams({ desde: $('#r-desde').value, hasta: $('#r-hasta').value });
  const r = await api('/reportes?' + params);
  const inv = r.inventario;

  // Tabla con barras horizontales proporcionales al total
  const ranking = (filas, nombre) => {
    if (filas.length === 0) return '<p class="vacio">No hubo préstamos en este periodo.</p>';
    const max = filas[0].total;
    return filas.map((f) => `
      <div class="barra">
        <span class="barra-nombre">${nombre(f)}</span>
        <span class="barra-fondo"><span style="width:${(f.total / max) * 100}%"></span></span>
        <b>${f.total}</b>
      </div>`).join('');
  };

  $('#reportes').innerHTML = `
    <h2>Inventario por estado</h2>
    <div class="stats">
      <div class="stat"><span>${inv.disponible + inv.prestado + inv.perdido}</span>Ejemplares totales</div>
      <div class="stat verde"><span>${inv.disponible}</span>Disponibles</div>
      <div class="stat azul"><span>${inv.prestado}</span>Prestados</div>
      <div class="stat rojo"><span>${inv.perdido}</span>Perdidos</div>
    </div>
    <h2>Préstamos</h2>
    <div class="stats">
      <div class="stat"><span>${r.prestamos.pendientes}</span>Solicitudes pendientes</div>
      <div class="stat azul"><span>${r.prestamos.activos}</span>Activos</div>
      <div class="stat rojo"><span>${r.prestamos.vencidos}</span>Vencidos</div>
      <div class="stat"><span>${pesos(r.multas)}</span>Multas cobradas</div>
    </div>
    <p><a href="#prestamos" onclick="filtroPrestamos = 'vencidos'">Ver los préstamos vencidos</a></p>
    <div class="dos-columnas">
      <div class="card"><h2>Libros más prestados</h2>${ranking(r.librosMasPrestados, (f) => esc(f.titulo))}</div>
      <div class="card"><h2>Usuarios con más préstamos</h2>${ranking(r.usuariosConMasPrestamos, (f) => `${esc(f.nombres)} <small class="muted">${esc(f.codigo)}</small>`)}</div>
    </div>`;
}
