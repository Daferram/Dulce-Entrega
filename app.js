// Dulce Entrega — lógica de las pantallas (se ejecuta en el navegador del cliente)
(function () {
  "use strict";

  /* ---------- Utilidades ---------- */
  const $ = (id) => document.getElementById(id);
  const fmt = (n) => "$U " + Number(n).toLocaleString("es-UY", { maximumFractionDigits: 0 });
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const memoria = {};
  const local = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return memoria[k] ?? null; } },
    set(k, v) { memoria[k] = v; try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
    del(k) { delete memoria[k]; try { localStorage.removeItem(k); } catch (e) {} }
  };
  async function api(metodo, ruta, datos) {
    const r = await fetch(ruta, {
      method: metodo,
      headers: datos ? { "Content-Type": "application/json" } : {},
      body: datos ? JSON.stringify(datos) : undefined,
      credentials: "same-origin"
    });
    const cuerpo = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(cuerpo.error || "Ocurrió un error. Intentá de nuevo.");
    return cuerpo;
  }

  /* ---------- Estado ---------- */
  let productos = [];
  let filtro = "Todas";
  let carrito = local.get("de_carrito") || {}; // { idProducto: cantidad }
  let sesion = null;                            // email del cliente
  let ultimoPedido = null;

  const guardarCarrito = () => { local.set("de_carrito", carrito); pintarContador(); };
  const lineasCarrito = () => Object.entries(carrito)
    .map(([id, q]) => ({ p: productos.find((x) => x.id === id), q }))
    .filter((x) => x.p && x.q > 0);
  const totalCarrito = () => lineasCarrito().reduce((s, x) => s + x.p.precio * x.q, 0);

  /* ---------- Navegación entre pantallas ---------- */
  const VISTAS = ["catalogo", "carrito", "registro", "ingresar", "confirmado"];
  function mostrar() {
    let v = (location.hash || "#catalogo").slice(1);
    if (!VISTAS.includes(v)) v = "catalogo";
    if (v === "confirmado" && !ultimoPedido) v = "catalogo";
    VISTAS.forEach((n) => $("v-" + n).classList.toggle("hidden", n !== v));
    if (v === "carrito") pintarCarrito();
    if (v === "confirmado") pintarConfirmacion();
    if (v === "registro" || v === "ingresar") {
      const aviso = $(v === "registro" ? "regNotice" : "logNotice");
      aviso.textContent = "Para confirmar la compra, ingresá o creá una cuenta. Tu carrito se mantiene.";
      aviso.classList.toggle("hidden", !local.get("de_volver_carrito"));
    }
    window.scrollTo(0, 0);
  }
  window.addEventListener("hashchange", mostrar);

  function pintarSesion() {
    $("sessionOut").classList.toggle("hidden", !!sesion);
    $("sessionIn").classList.toggle("hidden", !sesion);
    $("whoEmail").textContent = sesion || "";
  }
  function pintarContador() {
    $("cartCount").textContent = Object.values(carrito).reduce((s, q) => s + q, 0);
  }

  /* ---------- Catálogo ---------- */
  function pintarFiltros() {
    const cats = ["Todas", ...new Set(productos.map((p) => p.categoria))];
    $("filters").innerHTML = cats.map((c) =>
      `<button type="button" class="chip" aria-pressed="${c === filtro}" data-cat="${esc(c)}">${esc(c)}</button>`).join("");
  }
  function pintarCatalogo() {
    const lista = productos.filter((p) => filtro === "Todas" || p.categoria === filtro);
    $("grid").innerHTML = lista.map((p) => `
      <article class="card">
        <div class="pic"><img src="${esc(p.foto)}" alt="${esc(p.nombre)}" loading="lazy" width="640" height="480"></div>
        <div class="cbody">
          <span class="cat">${esc(p.categoria)}</span>
          <h3>${esc(p.nombre)}</h3>
          <p class="desc">${esc(p.descripcion)}</p>
          <div class="meta"><span class="price">${fmt(p.precio)}</span><span class="por">${esc(p.porciones)}</span></div>
          <button class="btn" type="button" data-add="${esc(p.id)}">Agregar al carrito</button>
          <p class="added" id="added-${esc(p.id)}" aria-live="polite"></p>
        </div>
      </article>`).join("");
  }
  $("filters").addEventListener("click", (e) => {
    const b = e.target.closest("[data-cat]"); if (!b) return;
    filtro = b.dataset.cat; pintarFiltros(); pintarCatalogo();
  });
  $("grid").addEventListener("click", (e) => {
    const b = e.target.closest("[data-add]"); if (!b) return;
    const id = b.dataset.add;
    carrito[id] = (carrito[id] || 0) + 1; guardarCarrito();
    const m = $("added-" + id); m.textContent = "Agregado. En el carrito: " + carrito[id];
    clearTimeout(m._t); m._t = setTimeout(() => (m.textContent = ""), 2500);
  });

  /* ---------- Carrito ---------- */
  function pintarCarrito() {
    const lineas = lineasCarrito();
    $("confirmErr").textContent = "";
    $("cartNotice").classList.add("hidden");
    $("cartLines").innerHTML = !lineas.length
      ? `<p class="muted">Tu carrito está vacío. <a href="#catalogo">Ver el catálogo</a></p>`
      : lineas.map(({ p, q }) => `
        <div class="line">
          <div><div class="lname">${esc(p.nombre)}</div><div class="lunit">${fmt(p.precio)} c/u</div>
            <button class="remove" type="button" data-rm="${esc(p.id)}">Quitar</button></div>
          <div class="qty">
            <button type="button" data-dec="${esc(p.id)}" aria-label="Restar uno de ${esc(p.nombre)}" ${q <= 1 ? "disabled" : ""}>−</button>
            <input type="number" min="1" step="1" inputmode="numeric" value="${q}" data-q="${esc(p.id)}" id="q-${esc(p.id)}" aria-label="Cantidad de ${esc(p.nombre)}">
            <button type="button" data-inc="${esc(p.id)}" aria-label="Sumar uno de ${esc(p.nombre)}">+</button>
          </div>
          <div class="lsub">${fmt(p.precio * q)}</div>
        </div>`).join("");
    $("cartTotal").textContent = fmt(totalCarrito());
    $("confirmBtn").disabled = !lineas.length;
  }
  $("cartLines").addEventListener("click", (e) => {
    const t = e.target;
    if (t.dataset.rm) delete carrito[t.dataset.rm];
    else if (t.dataset.inc) carrito[t.dataset.inc] = (carrito[t.dataset.inc] || 0) + 1;
    else if (t.dataset.dec) carrito[t.dataset.dec] = Math.max(1, (carrito[t.dataset.dec] || 1) - 1);
    else return;
    guardarCarrito(); pintarCarrito();
  });
  $("cartLines").addEventListener("change", (e) => {
    const id = e.target.dataset.q; if (!id) return;
    const v = Math.floor(Number(e.target.value));
    if (!Number.isFinite(v) || v < 1) {
      e.target.value = carrito[id];
      $("confirmErr").textContent = "La cantidad mínima es 1. Para sacar un postre usá “Quitar”.";
      return;
    }
    carrito[id] = v; guardarCarrito(); pintarCarrito();
  });

  $("confirmBtn").addEventListener("click", async () => {
    const lineas = lineasCarrito();
    if (!lineas.length) { $("confirmErr").textContent = "Agregá al menos un postre antes de confirmar."; return; }
    if (!sesion) { local.set("de_volver_carrito", true); location.hash = "#ingresar"; return; }
    const btn = $("confirmBtn"); btn.disabled = true; btn.textContent = "Confirmando…";
    try {
      ultimoPedido = await api("POST", "/api/pedidos", { items: lineas.map(({ p, q }) => ({ id: p.id, cantidad: q })) });
      carrito = {}; guardarCarrito();
      location.hash = "#confirmado";
    } catch (err) {
      if (/ingresar/.test(err.message)) { sesion = null; pintarSesion(); local.set("de_volver_carrito", true); location.hash = "#ingresar"; }
      else $("confirmErr").textContent = err.message;
    } finally { btn.disabled = false; btn.textContent = "Confirmar compra"; }
  });

  function pintarConfirmacion() {
    const o = ultimoPedido;
    $("confPanel").innerHTML = `
      <p class="muted">Número de pedido</p>
      <div class="order-num">${esc(o.numero)}</div>
      ${o.items.map((i) => `<div class="line"><div class="lname">${esc(i.nombre)}</div><div class="lunit">${i.cantidad} × ${fmt(i.precio)}</div><div class="lsub">${fmt(i.cantidad * i.precio)}</div></div>`).join("")}
      <div class="total"><span>Total</span><strong>${fmt(o.total)}</strong></div>
      <p class="ok">Recibimos tu pedido a nombre de ${esc(o.email)}.</p>
      <p class="muted">El pago se coordina al momento de la entrega.</p>
      <div class="actions"><a class="btn" href="#catalogo">Volver al catálogo</a></div>`;
  }

  /* ---------- Registro, ingreso y salida ---------- */
  function trasIngresar(email) {
    sesion = email; pintarSesion();
    const volver = local.get("de_volver_carrito"); local.del("de_volver_carrito");
    location.hash = volver ? "#carrito" : "#catalogo";
  }

  $("regForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const err = $("regErr"); err.textContent = "";
    const p1 = $("regPass").value, p2 = $("regPass2").value;
    if (p1.length < 8) { err.textContent = "La contraseña debe tener 8 caracteres o más."; return; }
    if (p1 !== p2) { err.textContent = "Las contraseñas no coinciden."; return; }
    const btn = $("regBtn"); btn.disabled = true;
    try {
      const r = await api("POST", "/api/registro", { email: $("regEmail").value, contrasena: p1, contrasena2: p2 });
      $("regForm").reset(); trasIngresar(r.email);
    } catch (ex) { err.textContent = ex.message; }
    finally { btn.disabled = false; }
  });

  $("logForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const err = $("logErr"); err.textContent = "";
    const email = $("logEmail").value.trim(), pass = $("logPass").value;
    if (!email || !pass) { err.textContent = "Completá tu email y tu contraseña."; return; }
    const btn = $("logBtn"); btn.disabled = true;
    try {
      const r = await api("POST", "/api/ingreso", { email, contrasena: pass });
      $("logForm").reset(); trasIngresar(r.email);
    } catch (ex) { err.textContent = ex.message; }
    finally { btn.disabled = false; }
  });

  $("logoutBtn").addEventListener("click", async () => {
    try { await api("POST", "/api/salir"); } catch (e) {}
    sesion = null; pintarSesion(); location.hash = "#catalogo";
  });

  /* ---------- Arranque ---------- */
  function avisoCatalogo(texto, esError) {
    const n = $("catNotice"); n.textContent = texto || "";
    n.classList.toggle("hidden", !texto); n.classList.toggle("err", !!esError);
  }
  avisoCatalogo("Cargando el catálogo…");
  pintarContador(); pintarSesion(); mostrar();

  Promise.all([api("GET", "/api/productos"), api("GET", "/api/sesion")])
    .then(([lista, s]) => {
      productos = lista; sesion = s.email; pintarSesion();
      avisoCatalogo(productos.length ? "" : "El catálogo todavía no tiene productos.");
      pintarFiltros(); pintarCatalogo(); pintarContador();
      if (!$("v-carrito").classList.contains("hidden")) pintarCarrito();
    })
    .catch(() => avisoCatalogo("No se pudo conectar con el servidor. Verificá que esté funcionando y recargá la página.", true));
})();
