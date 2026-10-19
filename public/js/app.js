function rellenarLogin(correo, clave) {
  const form = $('#login form');
  form.correo.value = correo;
  form['contraseña'].value = clave;
}

async function iniciarSesion(e) {
  e.preventDefault();
  usuario = await api('/login', 'POST', datosFormulario(e.target));
  localStorage.setItem('usuario', JSON.stringify(usuario));
  location.hash = '';
  mostrarApp();
}

function cerrarSesion() {
  usuario = null;
  localStorage.removeItem('usuario');
  $('#app').hidden = true;
  $('#login').hidden = false;
}

const MENU = {
  lector: [['catalogo', 'Catálogo'], ['mis-prestamos', 'Mis préstamos']],
  bibliotecario: [['catalogo', 'Catálogo'], ['prestamos', 'Préstamos'], ['usuarios', 'Usuarios'],
    ['reportes', 'Reportes'], ['configuracion', 'Configuración']],
};

const VISTAS = {
  'catalogo': verCatalogo,
  'mis-prestamos': verMisPrestamos,
  'prestamos': verPrestamos,
  'usuarios': verUsuarios,
  'reportes': verReportes,
  'configuracion': verConfiguracion,
};

function mostrarApp() {
  $('#login').hidden = true;
  $('#app').hidden = false;
  $('#usuario-nombre').innerHTML = `${esc(usuario.nombres)}<small>${esc(usuario.rol)}</small>`;
  const opciones = MENU[esBibliotecario() ? 'bibliotecario' : 'lector'];
  $('#menu').innerHTML = opciones.map(([id, texto]) => `<a href="#${id}">${texto}</a>`).join('');
  navegar();
}

function navegar() {
  if (!usuario) return;
  const vista = location.hash.slice(1) || 'catalogo';
  document.querySelectorAll('#menu a').forEach((a) => {
    a.classList.toggle('activo', a.getAttribute('href') === '#' + vista);
  });
  (VISTAS[vista] || verCatalogo)();
}

window.addEventListener('hashchange', navegar);

if (usuario) mostrarApp();
