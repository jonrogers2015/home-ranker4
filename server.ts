import { Hono } from 'hono';
import { serveStatic } from 'hono/bun';
import { Database } from 'bun:sqlite';

// Initialize database
const db = new Database('/home/workspace/home-ranker6.db');

db.run(`
  CREATE TABLE IF NOT EXISTS agents (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    createdAt INTEGER
  );
  
  CREATE TABLE IF NOT EXISTS agent_properties (
    id TEXT PRIMARY KEY,
    agentId TEXT,
    address TEXT NOT NULL,
    daysOnMarket INTEGER,
    notes TEXT,
    photos TEXT
  );
  
  CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    agentId TEXT,
    createdAt INTEGER
  );
  
  CREATE TABLE IF NOT EXISTS customer_workspaces (
    customerId TEXT PRIMARY KEY,
    agentId TEXT,
    houses TEXT,
    categories TEXT,
    updatedAt INTEGER
  );
`);

const app = new Hono();

// CORS
app.use('/api/*', async (c, next) => {
  c.header('Access-Control-Allow-Origin', '*');
  c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  c.header('Access-Control-Allow-Headers', 'Content-Type');
  if (c.req.method === 'OPTIONS') return c.text('');
  await next();
});

// Create agent
app.post('/api/agent', async (c) => {
  const { email } = await c.req.json();
  const id = crypto.randomUUID().replace(/-/g, '').slice(0, 10);
  try {
    db.prepare('INSERT INTO agents (id, email, createdAt) VALUES (?, ?, ?)')
      .run(id, email, Date.now());
    return c.json({ agentId: id });
  } catch (e) {
    const agent = db.prepare('SELECT id FROM agents WHERE email = ?').get(email);
    if (agent) return c.json({ agentId: (agent as any).id });
    return c.json({ error: 'Failed to create agent' }, 500);
  }
});

// Agent login
app.post('/api/agent/login', async (c) => {
  const { email } = await c.req.json();
  const agent = db.prepare('SELECT id FROM agents WHERE email = ?').get(email);
  if (!agent) return c.json({ error: 'Agent not found' }, 404);
  return c.json({ agentId: (agent as any).id });
});

// Get agent properties
app.get('/api/agent/:agentId/properties', (c) => {
  const { agentId } = c.req.param();
  const rows = db.prepare('SELECT * FROM agent_properties WHERE agentId = ?').all(agentId);
  return c.json({
    properties: rows.map((r: any) => ({
      id: r.id,
      address: r.address,
      daysOnMarket: r.daysOnMarket,
      notes: r.notes,
      photos: JSON.parse(r.photos || '[]')
    }))
  });
});

// Create property
app.post('/api/agent/:agentId/properties', async (c) => {
  const { agentId } = c.req.param();
  const body = await c.req.json();
  const id = crypto.randomUUID().replace(/-/g, '').slice(0, 10);
  db.prepare('INSERT INTO agent_properties (id, agentId, address, daysOnMarket, notes, photos) VALUES (?, ?, ?, ?, ?, ?)')
    .run(id, agentId, body.address, body.daysOnMarket || null, body.notes || '', JSON.stringify(body.photos || []));
  return c.json({ propertyId: id });
});

// Delete property
app.delete('/api/agent/:agentId/properties/:propertyId', (c) => {
  const { agentId, propertyId } = c.req.param();
  db.prepare('DELETE FROM agent_properties WHERE id = ? AND agentId = ?').run(propertyId, agentId);
  return c.json({ deleted: true });
});

// Create customer
app.post('/api/customer', async (c) => {
  const { agentId } = await c.req.json();
  const id = crypto.randomUUID().replace(/-/g, '').slice(0, 12);
  db.prepare('INSERT INTO customers (id, agentId, createdAt) VALUES (?, ?, ?)')
    .run(id, agentId, Date.now());
  return c.json({ customerId: id });
});

// Create customer for specific agent (agent endpoint)
app.post("/api/agent/:agentId/customers", async (c) => {
  const { agentId } = c.req.param();
  const id = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
  db.prepare("INSERT INTO customers (id, agentId, createdAt) VALUES (?, ?, ?)")
    .run(id, agentId, Date.now());
  return c.json({ customerId: id, portalUrl: "/customer/" + id });
});

// Get customer workspace
app.get('/api/customer/:customerId', (c) => {
  const { customerId } = c.req.param();
  const workspace = db.prepare('SELECT * FROM customer_workspaces WHERE customerId = ?').get(customerId) as any;
  const customer = db.prepare('SELECT agentId FROM customers WHERE id = ?').get(customerId) as any;
  return c.json({
    houses: JSON.parse(workspace?.houses || '[]'),
    categories: JSON.parse(workspace?.categories || '[]'),
    agentId: customer?.agentId || workspace?.agentId || null
  });
});

// Update customer workspace
app.put('/api/customer/:customerId', async (c) => {
  const { customerId } = c.req.param();
  const body = await c.req.json();
  const exists = db.prepare('SELECT 1 FROM customer_workspaces WHERE customerId = ?').get(customerId);
  const customer = db.prepare('SELECT agentId FROM customers WHERE id = ?').get(customerId) as any;
  const agentId = body.agentId || customer?.agentId;
  
  if (exists) {
    db.prepare('UPDATE customer_workspaces SET houses = ?, categories = ?, updatedAt = ? WHERE customerId = ?')
      .run(JSON.stringify(body.houses || []), JSON.stringify(body.categories || []), Date.now(), customerId);
  } else {
    db.prepare('INSERT INTO customer_workspaces (customerId, agentId, houses, categories, updatedAt) VALUES (?, ?, ?, ?, ?)')
      .run(customerId, agentId, JSON.stringify(body.houses || []), JSON.stringify(body.categories || []), Date.now());
  }
  return c.json({ updated: true });
});

// Static files - serve from dist folder
app.use('/*', serveStatic({ root: './dist' }));

// SPA fallback - only for non-API routes
app.get('*', async (c) => {
  const path = c.req.path;
  if (path.startsWith('/api/')) {
    return c.json({ error: 'Not found' }, 404);
  }
  const indexFile = Bun.file('./dist/index.html');
  if (await indexFile.exists()) {
    return new Response(indexFile);
  }
  return c.text('Build not found. Run: bun run build', 500);
});

export default {
  port: process.env.PORT || 3000,
  fetch: app.fetch
};
