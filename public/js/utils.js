// =========================================================
// Utilidades generales
// =========================================================

let usuario = JSON.parse(localStorage.getItem('usuario') || 'null');
const $ = (selector) => document.querySelector(selector);
const esBibliotecario = () => usuario.rol === 'bibliotecario';

// Llama a la API del servidor. Si hay error, lanza una excepción con el mensaje del servidor.
async function api(url, metodo = 'GET', datos) {
  const res = await fetch('/api' + url, {
    method: metodo,
    headers: { 'Content-Type': 'application/json', 'x-usuario-id': usuario ? usuario.id_usuario : '' },
    body: datos ? JSON.stringify(datos) : undefined,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Error inesperado');
  return json;
}

// Cualquier error no capturado (por ejemplo de la API) se muestra como aviso rojo
window.addEventListener('unhandledrejection', (e) => aviso(e.reason.message, true));

function aviso(mensaje, esError = false) {
  const div = $('#aviso');
  // Si hay una ventana modal abierta, el aviso se pone dentro para que quede visible encima
  ($('#modal').open ? $('#modal') : document.body).appendChild(div);
  div.textContent = mensaje;
  div.className = 'visible ' + (esError ? 'error' : 'ok');
  clearTimeout(div.timer);
  div.timer = setTimeout(() => (div.className = ''), 3500);
}

// Evita que textos con < > se interpreten como HTML
function esc(texto) {
  return String(texto ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

const pesos = (n) => '$' + Number(n || 0).toLocaleString('es-CO');
const fecha = (f) => (f ? f.slice(0, 10) : '—');
const badge = (estado, texto) => `<span class="badge ${estado}">${esc(texto || estado)}</span>`;
const datosFormulario = (form) => Object.fromEntries(new FormData(form));

// Estado de un préstamo, marcando en rojo si está vencido
function estadoPrestamo(p) {
  if (p.dias_vencido > 0) return badge('vencido', `vencido (${p.dias_vencido} d)`);
  return badge(p.estado);
}

function abrirModal(titulo, html) {
  $('#modal-titulo').textContent = titulo;
  $('#modal-cuerpo').innerHTML = html;
  $('#modal').showModal();
}

function cerrarModal() {
  $('#modal').close();
}
