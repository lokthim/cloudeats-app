const express      = require('express');
const cors         = require('cors');
const jwt          = require('jsonwebtoken');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
app.use(cors());
app.use(express.json());

// ── Service URLs (Docker Compose DNS names) ────────────
const SERVICES = {
  user:  process.env.USER_SERVICE_URL  || 'http://user-service:3004',
  menu:  process.env.MENU_SERVICE_URL  || 'http://menu-service:3002',
  order: process.env.ORDER_SERVICE_URL || 'http://order-service:3003',
};

// ── Health check for the gateway itself ────────────────
app.get('/health', (req, res) =>
  res.json({ status: 'ok', service: 'api-gateway', port: 8000, routes: SERVICES })
);

// ── JWT Authentication Middleware ──────────────────────
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

function requireAuth(req, res, next) {
  const header = req.headers['authorization'];
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Missing or malformed Authorization header',
      hint:  'Send: Authorization: Bearer <your_token>'
    });
  }
  const token = header.slice(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;   // downstream services can read this header
    req.headers['x-user-id']    = decoded.id;
    req.headers['x-user-email'] = decoded.email;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// ── Proxy factory helper ───────────────────────────────
function proxy(target) {
  return createProxyMiddleware({
    target,
    changeOrigin: true,
    pathRewrite: (path, req) => req.originalUrl,
    on: {
      error: (err, req, res) => {
        res.status(503).json({
          error: 'Upstream service unavailable',
          target,
          detail: err.message
        });
      }
    }
  });
}

// ══════════════════════════════════════════════════════
//  ROUTE TABLE
// ══════════════════════════════════════════════════════

// ── User Service — public routes (no auth) ─────────────
app.use('/api/auth', proxy(SERVICES.user));

// ── User Service — protected routes ───────────────────
app.use('/api/users', requireAuth, proxy(SERVICES.user));

// ── Menu Service — public (browsing doesn't need login) ─
app.use('/api/menu', proxy(SERVICES.menu));

// ── Order Service — protected (must be logged in) ─────
app.use('/api/cart',   requireAuth, proxy(SERVICES.order));
app.use('/api/orders', requireAuth, proxy(SERVICES.order));

// ── 404 for unknown routes ─────────────────────────────
app.use((req, res) =>
  res.status(404).json({
    error:           'Route not found in gateway',
    requestedPath:   req.path,
    availableRoutes: ['/api/auth', '/api/users', '/api/menu', '/api/cart', '/api/orders']
  })
);

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`[api-gateway] Listening on :${PORT}`);
  console.log(`  /api/auth    → ${SERVICES.user}`);
  console.log(`  /api/menu    → ${SERVICES.menu}`);
  console.log(`  /api/orders  → ${SERVICES.order}`);
});