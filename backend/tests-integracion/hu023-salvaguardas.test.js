import {
  beforeAll,
  beforeEach,
  afterAll,
  describe,
  it,
  expect,
  vi,
} from 'vitest';
import jwt from 'jsonwebtoken';

// Solo sustituimos la conexión. El SQL de los repositorios es real.
// No se carga .env ni se usan las credenciales del backend habitual.
vi.mock('../src/config/db.js', async () => {
  const { default: pg } = await import('pg');
  const esquema = `hu023_${process.pid}_${Date.now()}`;

  const pool = new pg.Pool({
    host: '127.0.0.1',
    port: 55432,
    user: 'hu023_test',
    password: 'hu023_local_test',
    database: 'walking_dictionary_hu023_test',
    ssl: false,
    max: 5,
    connectionTimeoutMillis: 5000,
    statement_timeout: 10000,
    options: `-c search_path=${esquema}`,
  });

  return { pool, esquema };
});

import { pool, esquema } from '../src/config/db.js';
import { UsuarioRepository } from '../src/repositories/UsuarioRepository.js';
import { AdminUsuarioService } from '../src/services/AdminUsuarioService.js';

const admin = (id_usuario) => ({
  id_usuario,
  rol: 'administrador',
});

async function usuariosActuales() {
  const { rows } = await pool.query(
    'SELECT * FROM usuario ORDER BY id_usuario'
  );
  return rows;
}

async function comprobarRechazoSinCambios(operacion, status, code) {
  const antes = await usuariosActuales();

  await expect(operacion()).rejects.toMatchObject({ status, code });

  expect(await usuariosActuales()).toEqual(antes);
}

let servidorHttp;
let urlHttp;

const secretoHttp = 'hu023-secreto-exclusivo-de-pruebas-http';

async function solicitarCambio(id, recurso, datos, actor = 1) {
  const token = jwt.sign(
    { id_usuario: actor, rol: 'administrador' },
    secretoHttp,
    { algorithm: 'HS256', expiresIn: '5m' }
  );

  const respuesta = await fetch(
    `${urlHttp}/api/v1/admin/users/${id}/${recurso}`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(datos),
    }
  );

  return {
    status: respuesta.status,
    body: await respuesta.json(),
  };
}

beforeAll(async () => {
  const { rows } = await pool.query('SELECT current_database() AS nombre');

  if (rows[0].nombre !== 'walking_dictionary_hu023_test') {
    throw new Error('Estas pruebas requieren la base exclusiva de HU-023');
  }

  // Esquema propio de esta ejecución: no utiliza tablas preexistentes.
  await pool.query(`CREATE SCHEMA ${esquema}`);

  await pool.query(`
    CREATE TABLE usuario (
      id_usuario SERIAL PRIMARY KEY,
      nombre_completo VARCHAR(150) NOT NULL,
      email VARCHAR(150) NOT NULL UNIQUE,
      password_hash VARCHAR(255),
      rol VARCHAR(30) NOT NULL,
      activo BOOLEAN NOT NULL DEFAULT true,
      fecha_registro TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE curso (
      id_curso SERIAL PRIMARY KEY,
      docente_id INTEGER NOT NULL REFERENCES usuario(id_usuario)
    );
  `);
});

vi.stubEnv('JWT_SECRET', secretoHttp);
vi.stubEnv('DISABLE_AUTH', 'false');
vi.stubEnv('NODE_ENV', 'test');
// La carrera repetida hace decenas de peticiones desde la misma IP: se sube el límite de
// administración para que un 429 no se confunda con un fallo de la salvaguarda.
vi.stubEnv('RATE_LIMIT_ADMIN_MAX', '1000');

const promesaNativa = globalThis.Promise;

let app;

try {
  ({ default: app } = await import('../src/app.js'));
} finally {
  // Una dependencia de la aplicación sustituye Promise.
  // Vitest necesita la implementación nativa con finally().
  globalThis.Promise = promesaNativa;
}

// Conserva la implementación nativa que necesita Vitest.
globalThis.Promise = promesaNativa;

servidorHttp = await new Promise((resolve, reject) => {
  const servidor = app.listen(0, '127.0.0.1', () => resolve(servidor));
  servidor.once('error', reject);
});

urlHttp = `http://127.0.0.1:${servidorHttp.address().port}`;

beforeEach(async () => {
  vi.spyOn(console, 'info').mockImplementation(() => {});

  await pool.query(
    'TRUNCATE TABLE curso, usuario RESTART IDENTITY'
  );

  await pool.query(`
    INSERT INTO usuario (nombre_completo, email, rol)
    VALUES
      ('Admin A', 'admin.a@example.test', 'administrador'),
      ('Admin B', 'admin.b@example.test', 'administrador'),
      ('Docente', 'docente@example.test', 'docente'),
      ('Estudiante', 'estudiante@example.test', 'estudiante');

    INSERT INTO curso (docente_id) VALUES (3);
  `);
});

afterAll(async () => {
  try {
    if (servidorHttp) {
      await new Promise((resolve, reject) => {
        servidorHttp.close((error) => {
          if (error) reject(error);
          else resolve();
        });
      });
    }
  } finally {
    try {
      await pool.query(`DROP SCHEMA IF EXISTS ${esquema} CASCADE`);
    } finally {
      await pool.end();
      vi.unstubAllEnvs();
    }
  }
});

describe('CA-23.4 — Salvaguardas con PostgreSQL real', () => {
  it('revierte una escritura si la transacción falla', async () => {
    const antes = await usuariosActuales();

    await expect(
      UsuarioRepository.enTransaccionAdministracion(async (db) => {
        await UsuarioRepository.cambiarRol(4, 'docente', db);
        throw new Error('Fallo intencional');
      })
    ).rejects.toThrow('Fallo intencional');

    expect(await usuariosActuales()).toEqual(antes);
  });

  it.each([
    ['cambiarRol', 'docente'],
    ['cambiarEstado', false],
  ])('rechaza autoedición con %s sin cambios', async (metodo, valor) => {
    await comprobarRechazoSinCambios(
      () => AdminUsuarioService[metodo](admin(1), 1, valor),
      409,
      'ADMIN_SELF_CHANGE'
    );
  });

  it.each([
    ['cambiarRol', 'estudiante'],
    ['cambiarEstado', false],
  ])('protege al último administrador con %s', async (metodo, valor) => {
    await pool.query(
      "UPDATE usuario SET rol = 'estudiante' WHERE id_usuario = 2"
    );

    // Actor distinto al objetivo para ejercitar la salvaguarda del último
    // administrador independientemente del rechazo por autoedición.
    // La autenticación HTTP ya se prueba en CA-23.3.
    await comprobarRechazoSinCambios(
      () => AdminUsuarioService[metodo](admin(99), 1, valor),
      409,
      'ADMIN_LAST_ADMIN'
    );
  });

  it('rechaza degradar al docente con cursos sin cambios', async () => {
    const cursosAntes = await pool.query('SELECT * FROM curso');

    await comprobarRechazoSinCambios(
      () => AdminUsuarioService.cambiarRol(admin(1), 3, 'estudiante'),
      409,
      'ADMIN_TEACHER_HAS_COURSES'
    );

    expect((await pool.query('SELECT * FROM curso')).rows)
      .toEqual(cursosAntes.rows);
  });

  it('rechaza un rol inválido sin cambios', async () => {
    await comprobarRechazoSinCambios(
      () => AdminUsuarioService.cambiarRol(admin(1), 4, 'invitado'),
      400,
      'ADMIN_INVALID_ROLE'
    );
  });

  it.each([
    ['cambiarRol', 'docente'],
    ['cambiarEstado', false],
  ])('rechaza usuario inexistente con %s', async (metodo, valor) => {
    await comprobarRechazoSinCambios(
      () => AdminUsuarioService[metodo](admin(1), 99999, valor),
      404,
      'ADMIN_USER_NOT_FOUND'
    );
  });

  it.each([
    ['cambiarRol', 'estudiante'],
    ['cambiarEstado', false],
  ])(
    'conserva un administrador ante dos operaciones simultáneas de %s',
    async (metodo, valor) => {
      const resultados = await Promise.allSettled([
        AdminUsuarioService[metodo](admin(1), 2, valor),
        AdminUsuarioService[metodo](admin(2), 1, valor),
      ]);

      const exitos = resultados.filter((r) => r.status === 'fulfilled');
      const rechazos = resultados.filter((r) => r.status === 'rejected');

      expect(exitos).toHaveLength(1);
      expect(rechazos).toHaveLength(1);
      expect(rechazos[0].reason).toMatchObject({
        status: 409,
        code: 'ADMIN_LAST_ADMIN',
      });

      const usuarios = await usuariosActuales();

      expect(
        usuarios.filter((u) => u.rol === 'administrador' && u.activo)
      ).toHaveLength(1);

      // El objetivo de la operación rechazada conserva rol y estado.
      const indiceRechazado = resultados.findIndex(
        (r) => r.status === 'rejected'
      );
      const idRechazado = indiceRechazado === 0 ? 2 : 1;

      expect(usuarios.find((u) => u.id_usuario === idRechazado))
        .toMatchObject({ rol: 'administrador', activo: true });
    }
  );
});

describe('CA-23.4 — Códigos administrativos por HTTP', () => {
  it.each([
    ['role', { rol: 'docente' }],
    ['status', { activo: false }],
  ])('%s: identificador inválido devuelve 400', async (recurso, datos) => {
    const antes = await usuariosActuales();

    const respuesta = await solicitarCambio('abc', recurso, datos);

    expect(respuesta.status).toBe(400);
    expect(respuesta.body.code).toBe('ADMIN_INVALID_ID');
    expect(await usuariosActuales()).toEqual(antes);
  });

  it.each([
    ['role', { rol: 'docente' }],
    ['status', { activo: false }],
  ])('%s: usuario inexistente devuelve 404', async (recurso, datos) => {
    const antes = await usuariosActuales();

    const respuesta = await solicitarCambio(99999, recurso, datos);

    expect(respuesta.status).toBe(404);
    expect(respuesta.body.code).toBe('ADMIN_USER_NOT_FOUND');
    expect(await usuariosActuales()).toEqual(antes);
  });
});

// CA-23.4 — Carrera de dos administradores.
// A degrada a B y B degrada a A al mismo tiempo. Sin candado, cada petición vería "hay 2
// administradores" y ambas pasarían, dejando el sistema sin administradores. Con
// pg_advisory_xact_lock una espera a la otra: una responde 200 y la otra 409 ADMIN_LAST_ADMIN.
// Se repite para que no pase por simple suerte de tiempos.
const REPETICIONES = 20;

describe(`CA-23.4 — Carrera de dos administradores por HTTP (${REPETICIONES} repeticiones)`, () => {
  describe.each([
    ['role', { rol: 'estudiante' }, (u) => u.rol === 'administrador'],
    ['status', { activo: false }, (u) => u.activo === true],
  ])('PATCH /admin/users/:id/%s', (recurso, datos, sigueSiendoAdmin) => {
    it.each(Array.from({ length: REPETICIONES }, (_, i) => [i + 1]))(
      'repetición %i: una responde 200, la otra 409 y queda un administrador activo',
      async () => {
        // A (id 1) pide degradar a B (id 2) y B pide degradar a A, a la vez.
        const [deAaB, deBaA] = await Promise.all([
          solicitarCambio(2, recurso, datos, 1),
          solicitarCambio(1, recurso, datos, 2),
        ]);

        expect([deAaB.status, deBaA.status].sort()).toEqual([200, 409]);

        const rechazada = deAaB.status === 409 ? deAaB : deBaA;
        expect(rechazada.body.code).toBe('ADMIN_LAST_ADMIN');

        const usuarios = await usuariosActuales();
        const administradoresActivos = usuarios.filter(
          (u) => u.rol === 'administrador' && u.activo
        );
        expect(administradoresActivos).toHaveLength(1);

        // El objetivo de la petición rechazada conserva su rol y estado: es el que sigue vivo.
        const idRechazado = deAaB.status === 409 ? 2 : 1;
        const sobreviviente = usuarios.find((u) => u.id_usuario === idRechazado);
        expect(sigueSiendoAdmin(sobreviviente)).toBe(true);
        expect(administradoresActivos[0].id_usuario).toBe(idRechazado);
      }
    );
  });
});
