ENUNCIADO

La Biblioteca de la universidad necesita modernizar y digitalizar el proceso de préstamo y devolución de libros, ya que actualmente se realiza de forma manual (o con herramientas dispersas). Se requiere desarrollar una aplicación que permita:

1. Gestión del catálogo de Libros

Se debe administrar:

· Libros (títulos): ISBN, título, autor(es), editorial, año, categoría/temas, descripción.

· Ejemplares físicos por libro: código de barras/ID, ubicación (sala/estante), estado (disponible, prestado, perdido).

· Búsqueda por: título, autor, ISBN, categoría y disponibilidad.


2. Gestión de usuarios

La aplicación debe permitir:

· Registrar usuarios con datos mínimos: código, identificación, nombres, correo, rol (estudiante/docente), carrera (opcional), estado (activo/bloqueado).

· Consultar historial de préstamos por usuario.


3. Gestión de Prestamos

La aplicación debe permitir:

· Registrar un préstamo asociando: usuario + ejemplar + fecha de préstamo + fecha de vencimiento.

· Validar antes de prestar:

· que el usuario esté activo

· que el ejemplar esté disponible


4. Gestión de Devolución

La aplicación debe permitir:

· Registrar la devolución de un ejemplar y actualizar su estado a disponible.

· Si existe retraso, calcular automáticamente sanción/multa.

· Registrar observaciones del ejemplar al devolver: “dañado”, “páginas faltantes”.


5. Reportes y consultas

El personal bibliotecario debe poder ver:

· Préstamos activos y vencidos.

· Libros más prestados por periodo.

· Usuarios con más préstamos.

· Inventario por estado (disponibles, prestados, perdidos).


Restricciones

· Un libro puede tener varios ejemplares y puede tener varios autores.

· El ejemplar debe indicar si está disponible, prestado o perdidos.

· Un usuario puede prestar varios libros.

· Definir una tarifa de multa por día.

· Crear las operaciones CRUD para los libros.

· Crear las operaciones CRUD para los ejemplares.

· Crear las operaciones CRUD para los usuarios.

· Debe existir un usuario administrador o bibliotecario que se encargara de realizar la aprobación del préstamo y la devolución del libro.

· El usuario busca el libro y solicita el préstamo el cual debe ser aprobado por el administrador.