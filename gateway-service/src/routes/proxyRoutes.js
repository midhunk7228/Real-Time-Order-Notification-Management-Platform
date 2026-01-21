const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const services = require('../config/services');

const router = express.Router();

// Auth service routes (no auth required for login/register)
router.use(
  '/auth',
  createProxyMiddleware({
    target: services.AUTH_SERVICE,
    changeOrigin: true,
    pathRewrite: {
      '^/auth': '/auth'
    },
    onProxyReq: (proxyReq, req, res) => {
      console.log(`Proxying ${req.method} ${req.url} to ${services.AUTH_SERVICE}`);
    },
    onError: (err, req, res) => {
      console.error('Proxy error:', err);
      res.status(503).json({ error: 'Auth service unavailable' });
    }
  })
);

// Order service routes (auth required)
router.use(
  '/orders',
  createProxyMiddleware({
    target: services.ORDER_SERVICE,
    changeOrigin: true,
    pathRewrite: {
      '^/orders': '/orders'
    },
    onProxyReq: (proxyReq, req, res) => {
      // Forward user info from JWT
      if (req.user) {
        proxyReq.setHeader('X-User-Id', req.user.userId);
        proxyReq.setHeader('X-User-Role', req.user.role);
      }
      console.log(`Proxying ${req.method} ${req.url} to ${services.ORDER_SERVICE}`);
    },
    onError: (err, req, res) => {
      console.error('Proxy error:', err);
      res.status(503).json({ error: 'Order service unavailable' });
    }
  })
);

// Inventory service routes (auth required)
router.use(
  '/inventory',
  createProxyMiddleware({
    target: services.INVENTORY_SERVICE,
    changeOrigin: true,
    pathRewrite: {
      '^/inventory': '/inventory'
    },
    onProxyReq: (proxyReq, req, res) => {
      if (req.user) {
        proxyReq.setHeader('X-User-Id', req.user.userId);
        proxyReq.setHeader('X-User-Role', req.user.role);
      }
      console.log(`Proxying ${req.method} ${req.url} to ${services.INVENTORY_SERVICE}`);
    },
    onError: (err, req, res) => {
      console.error('Proxy error:', err);
      res.status(503).json({ error: 'Inventory service unavailable' });
    }
  })
);

// Analytics service routes (auth required, admin only)
router.use(
  '/analytics',
  createProxyMiddleware({
    target: services.ANALYTICS_SERVICE,
    changeOrigin: true,
    pathRewrite: {
      '^/analytics': '/analytics'
    },
    onProxyReq: (proxyReq, req, res) => {
      if (req.user) {
        proxyReq.setHeader('X-User-Id', req.user.userId);
        proxyReq.setHeader('X-User-Role', req.user.role);
      }
      console.log(`Proxying ${req.method} ${req.url} to ${services.ANALYTICS_SERVICE}`);
    },
    onError: (err, req, res) => {
      console.error('Proxy error:', err);
      res.status(503).json({ error: 'Analytics service unavailable' });
    }
  })
);

module.exports = router;
