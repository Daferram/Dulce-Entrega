// Dulce Entrega — servidor de la tienda (Node.js, sin dependencias externas)
// Ejecutar con:  node server.js   y abrir http://localhost:3000

const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const PORT = Number(process.env.PORT) || 3000;
const PUBLIC_DIR = path.join(__dirname, "public");
const DATA_DIR = path.join(__dirname, "data");
const DB_FILE = path.join(DATA_DIR, "base-de-datos.json");
// Clave del panel de base de datos (solo para quien presenta). Se puede fijar con la variable CLAVE_BDD.
const CLAVE_BDD = process.env.CLAVE_BDD || crypto.randomBytes(3).toString("hex");
const METRICAS_TUNEL = process.env.METRICAS_TUNEL || "http://127.0.0.1:20241";

/* ---------------- Catálogo inicial (se carga la primera vez) ---------------- */
const CATALOGO_INICIAL = [
  { id: "p01", orden: 1,  nombre: "Torta vasca de dulce de leche", categoria: "Tortas", porciones: "6 porciones", precio: 1450, foto: "img/p01.jpg", descripcion: "Cheesecake vasco horneado con dulce de leche y superficie caramelizada." },
  { id: "p02", orden: 2,  nombre: "Torta vasca", categoria: "Tortas", porciones: "6 porciones", precio: 1450, foto: "img/p02.jpg", descripcion: "Cheesecake vasco clásico, cremoso por dentro y tostado por fuera." },
  { id: "p03", orden: 3,  nombre: "Porción de torta de chocolate", categoria: "Tortas", porciones: "6 porciones", precio: 1800, foto: "img/p03.jpg", descripcion: "Capas de bizcocho y mousse de chocolate con cobertura de frutos del bosque." },
  { id: "p04", orden: 4,  nombre: "Cheesecake de frutos rojos", categoria: "Tortas", porciones: "10 porciones", precio: 2500, foto: "img/p04.jpg", descripcion: "Base de galleta, crema de queso y cobertura de frutos rojos." },
  { id: "p05", orden: 5,  nombre: "Torta espejo de chocolate", categoria: "Tortas", porciones: "10 porciones", precio: 2600, foto: "img/p05.jpg", descripcion: "Torta de chocolate con glaseado brillante, decorada con frutillas." },
  { id: "p06", orden: 6,  nombre: "Torta de chocolate y frutos rojos", categoria: "Tortas", porciones: "12 porciones", precio: 2900, foto: "img/p06.jpg", descripcion: "Mousse de chocolate con glaseado espejo de frutos rojos." },
  { id: "p07", orden: 7,  nombre: "Tarta de limón y merengue", categoria: "Tartas", porciones: "6 a 8 porciones", precio: 1600, foto: "img/p07.jpg", descripcion: "Masa sablée, crema de limón y merengue tostado." },
  { id: "p08", orden: 8,  nombre: "Torta de merengue tostado", categoria: "Tartas", porciones: "6 a 8 porciones", precio: 2200, foto: "img/p08.jpg", descripcion: "Bizcocho húmedo con dulce de leche y cubierta de merengue tostado." },
  { id: "p09", orden: 9,  nombre: "Tarta de chocolate", categoria: "Tartas", porciones: "10 porciones", precio: 2900, foto: "img/p09.jpg", descripcion: "Tarta de chocolate intenso decorada con frutillas y crema." },
  { id: "p10", orden: 10, nombre: "Tableta de chocolate con avellanas y pasas", categoria: "Macarons y chocolates", porciones: "1 unidad", precio: 600, foto: "img/p10.jpg", descripcion: "Chocolate con avellanas y pasas de uva." },
  { id: "p11", orden: 11, nombre: "Macarons (6 unidades)", categoria: "Macarons y chocolates", porciones: "Caja de 6", precio: 750, foto: "img/p11.jpg", descripcion: "Caja de seis macarons de sabores surtidos." },
  { id: "p12", orden: 12, nombre: "Discos de chocolate", categoria: "Macarons y chocolates", porciones: "1 caja", precio: 750, foto: "img/p12.jpg", descripcion: "Discos de chocolate con frutas secas y deshidratadas, en caja de regalo." }
];

/* ---------------- Base de datos (archivo JSON) ---------------- */
function cargarBase() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DB_FILE)) {
    const nueva = { productos: CATALOGO_INICIAL, clientes: [], sesiones: {}, pedidos: [] };
    guardarBase(nueva);
    return nueva;
  }
  return JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
}
function guardarBase(base) {
  const tmp = DB_FILE + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(base, null, 2));
  fs.renameSync(tmp, DB_FILE); // escritura atómica: nunca queda un archivo a medias
}
let db = cargarBase();

/* ---------------- Seguridad ---------------- */
function hashContrasena(contrasena, sal = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.scryptSync(contrasena, sal, 64).toString("hex");
  return { sal, hash };
}
function contrasenaCorrecta(contrasena, sal, hashGuardado) {
  const { hash } = hashContrasena(contrasena, sal);
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(hashGuardado, "hex"));
}
const emailValido = (e) => /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(e) && e.length <= 120;

/* ---------------- Utilidades HTTP ---------------- */
function responder(res, estado, datos, cabeceras = {}) {
  res.writeHead(estado, { "Content-Type": "application/json; charset=utf-8", ...cabeceras });
  res.end(JSON.stringify(datos));
}
function leerCuerpo(req) {
  return new Promise((resolve, reject) => {
    let cuerpo = "";
    req.on("data", (c) => { cuerpo += c; if (cuerpo.length > 1e5) req.destroy(); });
    req.on("end", () => { try { resolve(cuerpo ? JSON.parse(cuerpo) : {}); } catch { reject(new Error("JSON inválido")); } });
    req.on("error", reject);
  });
}
function leerCookies(req) {
  return Object.fromEntries((req.headers.cookie || "").split(";").map((c) => c.trim().split("=")).filter((p) => p[0]));
}
function clienteDeSesion(req) {
  const token = leerCookies(req).sesion;
  return token && db.sesiones[token] ? db.sesiones[token] : null;
}
function abrirSesion(email) {
  const token = crypto.randomBytes(32).toString("hex");
  db.sesiones[token] = email;
  guardarBase(db);
  return `sesion=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${60 * 60 * 24 * 7}`;
}

const TIPOS = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".jpg": "image/jpeg", ".png": "image/png", ".svg": "image/svg+xml", ".ico": "image/x-icon" };
function servirArchivo(req, res) {
  const ruta = decodeURIComponent(new URL(req.url, "http://x").pathname);
  const archivo = path.normalize(path.join(PUBLIC_DIR, ruta === "/" ? "index.html" : ruta));
  if (!archivo.startsWith(PUBLIC_DIR)) { res.writeHead(403); return res.end(); }
  fs.readFile(archivo, (err, contenido) => {
    if (err) { res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }); return res.end("No encontrado"); }
    res.writeHead(200, { "Content-Type": TIPOS[path.extname(archivo)] || "application/octet-stream" });
    res.end(contenido);
  });
}

/* ---------------- API ---------------- */
const rutas = {
  "GET /api/productos": (req, res) => {
    responder(res, 200, [...db.productos].sort((a, b) => a.orden - b.orden));
  },

  "GET /api/sesion": (req, res) => {
    responder(res, 200, { email: clienteDeSesion(req) });
  },

  "POST /api/registro": async (req, res) => {
    const { email = "", contrasena = "", contrasena2 = "" } = await leerCuerpo(req);
    const e = String(email).trim().toLowerCase();
    if (!emailValido(e)) return responder(res, 400, { error: "Ingresá un email válido, por ejemplo nombre@correo.com." });
    if (String(contrasena).length < 8) return responder(res, 400, { error: "La contraseña debe tener 8 caracteres o más." });
    if (contrasena !== contrasena2) return responder(res, 400, { error: "Las contraseñas no coinciden." });
    if (db.clientes.some((c) => c.email === e)) return responder(res, 409, { error: "Ya existe una cuenta con ese email." });
    const { sal, hash } = hashContrasena(String(contrasena));
    db.clientes.push({ email: e, sal, hash, creado: new Date().toISOString() });
    guardarBase(db);
    responder(res, 201, { email: e }, { "Set-Cookie": abrirSesion(e) });
  },

  "POST /api/ingreso": async (req, res) => {
    const { email = "", contrasena = "" } = await leerCuerpo(req);
    const e = String(email).trim().toLowerCase();
    const cliente = db.clientes.find((c) => c.email === e);
    if (!cliente || !contrasenaCorrecta(String(contrasena), cliente.sal, cliente.hash)) {
      return responder(res, 401, { error: "Email o contraseña incorrectos." });
    }
    responder(res, 200, { email: e }, { "Set-Cookie": abrirSesion(e) });
  },

  "POST /api/salir": (req, res) => {
    const token = leerCookies(req).sesion;
    if (token && db.sesiones[token]) { delete db.sesiones[token]; guardarBase(db); }
    responder(res, 200, { ok: true }, { "Set-Cookie": "sesion=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0" });
  },

  "POST /api/pedidos": async (req, res) => {
    const email = clienteDeSesion(req);
    if (!email) return responder(res, 401, { error: "Para confirmar la compra tenés que ingresar." });
    const { items = [] } = await leerCuerpo(req);
    const lineas = [];
    for (const it of Array.isArray(items) ? items : []) {
      const p = db.productos.find((x) => x.id === it.id);
      const cantidad = Math.floor(Number(it.cantidad));
      if (!p) return responder(res, 400, { error: "Hay un producto que ya no está disponible." });
      if (!Number.isFinite(cantidad) || cantidad < 1) return responder(res, 400, { error: "La cantidad mínima es 1." });
      lineas.push({ id: p.id, nombre: p.nombre, cantidad, precio: p.precio }); // el precio lo toma el servidor, no el navegador
    }
    if (!lineas.length) return responder(res, 400, { error: "Agregá al menos un postre antes de confirmar." });
    const pedido = {
      numero: "P-" + String(1001 + db.pedidos.length), // correlativo: único aunque compren muchos a la vez
      email,
      fecha: new Date().toISOString(),
      items: lineas,
      total: lineas.reduce((s, l) => s + l.precio * l.cantidad, 0)
    };
    db.pedidos.push(pedido);
    guardarBase(db);
    responder(res, 201, pedido);
  }
};

/* ---------------- Panel de base de datos (para mostrar en la clase) ---------------- */
function enmascarar(email) {
  const [usuario, dominio] = email.split("@");
  return usuario.slice(0, 2) + "•••@" + dominio;
}
function claveValida(req) {
  const dada = new URL(req.url, "http://x").searchParams.get("clave") || "";
  const a = Buffer.from(dada), b = Buffer.from(CLAVE_BDD);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

rutas["GET /api/bdd"] = (req, res) => {
  if (!claveValida(req)) return responder(res, 403, { error: "Clave incorrecta." });
  const unidadesPorProducto = {};
  for (const p of db.pedidos) for (const l of p.items) unidadesPorProducto[l.nombre] = (unidadesPorProducto[l.nombre] || 0) + l.cantidad;
  responder(res, 200, {
    resumen: {
      productos: db.productos.length,
      clientes: db.clientes.length,
      pedidos: db.pedidos.length,
      unidades: Object.values(unidadesPorProducto).reduce((s, n) => s + n, 0),
      totalVendido: db.pedidos.reduce((s, p) => s + p.total, 0),
      masVendidos: Object.entries(unidadesPorProducto).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([nombre, unidades]) => ({ nombre, unidades }))
    },
    clientes: [...db.clientes].reverse().map((c) => ({ email: enmascarar(c.email), creado: c.creado, hash: c.hash.slice(0, 24) + "…", sal: c.sal.slice(0, 8) + "…" })),
    pedidos: [...db.pedidos].reverse().map((p) => ({ ...p, email: enmascarar(p.email) }))
  });
};

// Dirección pública del túnel de Cloudflare, si está activo (para generar el código QR)
rutas["GET /api/tunel"] = async (req, res) => {
  if (!claveValida(req)) return responder(res, 403, { error: "Clave incorrecta." });
  try {
    const r = await fetch(METRICAS_TUNEL + "/quicktunnel", { signal: AbortSignal.timeout(1500) });
    const { hostname } = await r.json();
    responder(res, 200, { url: hostname ? "https://" + hostname : null });
  } catch {
    responder(res, 200, { url: null });
  }
};

/* ---------------- Servidor ---------------- */
const servidor = http.createServer(async (req, res) => {
  const clave = `${req.method} ${new URL(req.url, "http://x").pathname}`;
  try {
    if (rutas[clave]) return await rutas[clave](req, res);
    if (req.method === "GET") return servirArchivo(req, res);
    responder(res, 404, { error: "No encontrado" });
  } catch (err) {
    responder(res, 400, { error: "No se pudo procesar el pedido. Intentá de nuevo." });
  }
});

servidor.listen(PORT, () => {
  console.log("");
  console.log("  Dulce Entrega está funcionando.");
  console.log(`  Abrí en el navegador:  http://localhost:${PORT}`);
  console.log(`  Panel de base de datos (solo para quien presenta):  http://localhost:${PORT}/bdd.html?clave=${CLAVE_BDD}`);
  console.log("  Para detenerla: Ctrl + C");
  console.log("");
});
