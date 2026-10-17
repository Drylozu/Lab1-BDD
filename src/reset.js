// Uso: npm run reset  → deja la base de datos como recién creada desde ddl.sql
const { crearTablas } = require('./db');

crearTablas();
console.log('Base de datos reiniciada con los datos de prueba de ddl.sql');
