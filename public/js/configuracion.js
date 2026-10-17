// =========================================================
// Configuración: tarifa de multa por día
// =========================================================

async function verConfiguracion() {
  const c = await api('/configuracion');
  $('#contenido').innerHTML = `
    <div class="encabezado"><div><h1>Configuración</h1><p class="muted">Cambia cuánto dura un préstamo y cuánto cuesta cada día de retraso.</p></div></div>
    <form class="form angosto" onsubmit="guardarConfiguracion(event)">
      <label>Tarifa de multa por día de retraso (COP)
        <input name="multa_por_dia" type="number" min="0" step="100" required value="${c.multa_por_dia}"></label>
      <label>Días de préstamo por defecto
        <input name="dias_prestamo" type="number" min="1" required value="${c.dias_prestamo}"></label>
      <div class="form-acciones"><button class="btn primary">Guardar cambios</button></div>
    </form>`;
}

async function guardarConfiguracion(e) {
  e.preventDefault();
  await api('/configuracion', 'PUT', datosFormulario(e.target));
  aviso('Configuración guardada');
}
