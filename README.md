# Dulce Entrega — tienda web de postres (Grupo 2)

Aplicación web simple donde los clientes ven los postres, arman un carrito, se registran, ingresan con usuario y contraseña y confirman la compra sin pago. Cumple la consigna del Grupo 2 de Tecnología, Disrupción y Negocios (MBA UCU) y nada más.

Construida con Claude Code, describiendo en lenguaje natural lo que debía hacer.

## Cómo ponerla en marcha (5 minutos, una sola vez)

1. Instalar **Node.js** (versión 18 o superior) desde https://nodejs.org — botón "LTS", siguiente, siguiente, finalizar.
2. Descomprimir la carpeta `dulce-entrega` en el escritorio.
3. Abrir la app:
   - **Windows:** doble clic en `iniciar-windows.bat`.
   - **Mac:** doble clic en `iniciar-mac.command` (la primera vez: clic derecho → Abrir).
   - **Cualquier sistema, desde la terminal:** entrar a la carpeta y escribir `node server.js`.
4. Abrir el navegador en **http://localhost:3000**.

Para apagarla, cerrar la ventana negra (o `Ctrl + C`). No hace falta instalar nada más: la app no usa librerías externas ni cuentas en servicios de terceros.

## Modo clase: que el público compre desde su celular

Para la presentación, la tienda se publica en internet desde la laptop y los compañeros compran desde sus celulares mientras se proyecta la base de datos en vivo.

1. Además de Node.js, se usa **cloudflared** (gratuito, de Cloudflare, sin crear cuentas). En Windows, el lanzador lo instala solo la primera vez; en Mac: `brew install cloudflared`.
2. Doble clic en `iniciar-clase-windows.bat` (o `iniciar-clase-mac.command`). Se abren dos cosas:
   - Una ventana que publica la tienda en una dirección `https://….trycloudflare.com`. **No cerrarla** durante la presentación.
   - El **panel de base de datos en vivo**, con el código QR de esa dirección para que el público escanee.
3. Proyectar el panel. Cada registro y cada compra aparece en segundos, resaltado.

Detalles:

- La dirección pública cambia cada vez que se inicia el modo clase. Si el QR no aparece, copiar la dirección `trycloudflare.com` de la ventana negra y pegarla en el panel.
- El panel exige una clave que se genera al iniciar (va incluida en el enlace que se abre solo). Sin esa clave, nadie más puede ver la base de datos.
- En el panel, los emails se ven parcialmente ocultos y las contraseñas solo como su *hash*. Igual conviene pedir al público que use emails inventados.
- Probado con 30 compradores simultáneos. El túnel gratuito admite hasta 200 solicitudes a la vez y no tiene garantía de disponibilidad: llevar el plan B (demo solo desde la laptop).
- Al terminar, cerrar las ventanas: la dirección pública deja de existir.

## Publicarla en un servidor (Render, gratis)

Así la tienda queda en una dirección fija `https://….onrender.com`, sin depender de la laptop.

1. **GitHub:** crear una cuenta gratuita en github.com → botón **New repository** → nombre `dulce-entrega` → **Create repository** → enlace **uploading an existing file** → arrastrar **el contenido** de la carpeta `dulce-entrega` (server.js, package.json, la carpeta public, etc.) → **Commit changes**.
2. **Render:** crear una cuenta en render.com entrando con la cuenta de GitHub → **New** → **Web Service** → elegir el repositorio `dulce-entrega`.
3. Completar: **Language** Node · **Build Command** `npm install` · **Start Command** `node server.js` · **Instance Type** Free.
4. En **Environment Variables** agregar `CLAVE_BDD` con una clave propia (por ejemplo `dulce2026`).
5. **Deploy Web Service**. En unos minutos aparece la dirección pública. El panel queda en `https://….onrender.com/bdd.html?clave=dulce2026`, con el QR de la tienda ya cargado.

Limitaciones del plan gratuito, importantes para la demo:

- Si nadie entra durante 15 minutos, el servidor se duerme y la siguiente visita tarda cerca de un minuto en despertarlo. **Abrir el panel 5 minutos antes de la presentación**: mientras esté abierto, el servidor no se duerme.
- Cada vez que el servidor se duerme o se reinicia, la base de datos vuelve a cero (solo queda el catálogo). Para una demo es suficiente; para un negocio real haría falta una base de datos persistente.

## Qué hace (alcance de la consigna)

| Requisito de la consigna | Cómo lo resuelve |
| --- | --- |
| Ver los productos | Catálogo de 12 postres con foto, descripción, porciones y precio, con filtro por categoría |
| Comprar | Botón "Confirmar compra" que guarda el pedido y muestra su número |
| Carrito básico | Agregar, cambiar cantidad, quitar y ver el total |
| Sin pagos | No hay pasarela de pago: el pago se coordina en la entrega |
| Registro (sign-up) | Email y contraseña (8 caracteres o más) |
| Autenticarse | Ingreso y salida con email y contraseña |
| Sin app nativa | Es una app web: abre en cualquier navegador, también en el celular |

Fuera de alcance, a propósito: pagos, panel de administración, historial de pedidos, envío de emails y recuperación de contraseña.

## Cómo está armada

```
Navegador del cliente  →  Servidor (server.js)  →  Base de datos (data/base-de-datos.json)
 catálogo, carrito,         API: productos,          productos, clientes,
 registro, compra           registro, ingreso,        sesiones y pedidos
                             pedidos
```

- **public/**: lo que ve el cliente (`index.html`, `styles.css`, `app.js`) y las 12 fotos.
- **server.js**: el servidor. Entrega las pantallas y atiende la API.
- **data/base-de-datos.json**: se crea sola la primera vez, con el catálogo cargado.

Decisiones de seguridad:

- Las contraseñas se guardan cifradas con *scrypt* y una sal aleatoria por cliente. No se pueden leer, ni siquiera abriendo el archivo.
- La sesión se guarda en una cookie `HttpOnly`, que el código de la página no puede leer.
- El precio de cada producto lo toma el servidor del catálogo, no el navegador: un cliente no puede cambiar precios desde su computadora.

## Cómo ver los pedidos y editar el catálogo

Todo está en `data/base-de-datos.json`, que se puede abrir con el Bloc de notas: la sección `pedidos` muestra cada compra y la sección `productos` el catálogo. Para cambiar un precio, editar el número, guardar y reiniciar la app.

Para empezar la demo con datos limpios, apagar la app y mover el archivo `base-de-datos.json` a otra carpeta: al volver a iniciar se crea uno nuevo, solo con el catálogo.

## Fotos

Las fotos son de [Pexels](https://www.pexels.com/license/), banco de imágenes de uso libre y gratuito.
