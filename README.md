# Casa Rural 2026

Plataforma familiar para organizar una escapada en una casa rural. Incluye:

- asistencia por día;
- comidas;
- lista de la compra repartida entre familias;
- planes;
- juegos con ranking y premios;
- álbum de fotos;
- cuentas.

## Cómo funciona

- **Web**: `index.html` + `config.js`, servidos por GitHub Pages desde la raíz. El código no lleva datos personales: todo llega de Supabase después de entrar.
- **Acceso**: email (o usuario) + código de 6 cifras.
  - La primera vez se usa el código de la familia.
  - Justo después, cada persona elige el suyo, que se guarda cifrado.
- **Permisos**: roles admin, editor y lector, aplicados en la base de datos con Row Level Security (`supabase/schema.sql`).
- **Tiempo real**: los cambios de cualquiera aparecen al momento en los móviles de los demás.
- **Código fuente**: `src/`. `node build.js` regenera `index.html`.
  - La demo con datos locales solo se construye si existe `src/seed.js`.
  - `src/seed.js` es privado y no está en este repositorio.

La clave de `config.js` es la clave pública (anon) de Supabase. Es pública por diseño: la seguridad la dan las políticas RLS.
