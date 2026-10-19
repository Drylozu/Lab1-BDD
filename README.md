# Biblioteca Universitaria

Aplicación para gestionar préstamos y devoluciones de libros (Node.js + Express + SQLite).

## Cómo ejecutar

```bash
npm install
npm start          # http://localhost:3000
npm run reset      # (opcional) recrea la base desde ddl.sql con los datos de prueba
```

## Usuarios de prueba

| Rol           | Correo                           | Contraseña |
|---------------|----------------------------------|------------|
| Bibliotecario | valentina.rios@universidad.edu.co   | admin123   |
| Bibliotecario | julian.herrera@universidad.edu.co   | admin123   |
| Estudiante    | sofia.castano@universidad.edu.co    | clave123   |
| Docente       | natalia.quintero@universidad.edu.co | clave123   |
| Bloqueado     | samuel.ortiz@universidad.edu.co     | clave123   |

## Estructura

```
ddl.sql                    Tablas y datos de prueba (sin vistas ni triggers)

src/
  index.js                 Arranca Express y conecta las rutas
  db.js                    Conexión a SQLite (crea las tablas si la base está vacía)
  sesion.js                Login y middlewares (sesión, solo bibliotecario)
  utils.js                 Errores, fechas, configuración, buscar-o-crear
  reset.js                 Reinicia la base de datos
  rutas/
    libros.js              /api/libros        búsqueda y CRUD de libros
    ejemplares.js          /api/ejemplares    CRUD de ejemplares
    usuarios.js            /api/usuarios      CRUD de usuarios
    prestamos.js           /api/prestamos     solicitar, aprobar, rechazar, devolver, historial
    reportes.js            /api/reportes      inventario y rankings
    configuracion.js       /api/configuracion multa por día y días de préstamo

public/
  index.html, styles.css
  js/
    utils.js               api(), avisos, modal y helpers
    libros.js              catálogo y CRUD de libros
    ejemplares.js          CRUD de ejemplares
    prestamos.js           mis préstamos y gestión de préstamos
    usuarios.js            CRUD de usuarios e historial
    reportes.js            reportes
    configuracion.js       configuración
    app.js                 sesión, menú y navegación (se carga al final)
```

## Flujo de un préstamo

1. El estudiante/docente busca un libro en el **Catálogo** y pulsa **Solicitar préstamo**
   (se le asigna el primer ejemplar disponible y queda en estado `solicitado`).
2. El bibliotecario, en **Préstamos → Solicitudes pendientes**, lo **aprueba** (se valida que el
   usuario esté activo y el ejemplar disponible; el ejemplar pasa a `prestado`) o lo **rechaza**.
3. Al **registrar la devolución** se calculan los días de retraso y la multa
   (`días × multa_por_dia` de la tabla `configuracion`), se guardan las observaciones y el
   ejemplar vuelve a `disponible`.

La lógica que cambia varias tablas se hace en el servidor con consultas SQL simples,
sin transacciones ni triggers.
