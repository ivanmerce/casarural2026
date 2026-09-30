# Cónclave

Plataforma familiar para organizar una escapada: comidas, lista de la compra, planes, torneo, cuentas y asistencia por día.

- **Web**: `index.html` + `config.js` (GitHub Pages desde la raíz). Sin datos personales en el código: todo llega de Supabase después de entrar.
- **Acceso**: enlace mágico al email o código personal de 6 cifras (lo genera el admin).
- **Permisos**: roles admin / editor / lector aplicados en la base de datos con Row Level Security (`supabase/schema.sql`).
- **Tiempo real**: los cambios de cualquiera aparecen al momento en los móviles de los demás.
- **Código fuente**: `src/`. `node build.js` regenera `index.html` (la demo con datos locales solo se construye si existe `src/seed.js`, que es privado y no está en este repositorio).

La clave de `config.js` es la clave pública (anon) de Supabase: es pública por diseño; la seguridad la dan las políticas RLS.
