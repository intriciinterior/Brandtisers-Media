const express = require('express');
const cors = require('cors');
const path = require('path');
const { getDb } = require('./db');

const authRoutes = require('./routes/auth.routes');
const tasksRoutes = require('./routes/tasks.routes');
const usersRoutes = require('./routes/users.routes');
const clientsRoutes = require('./routes/clients.routes');
const workTypesRoutes = require('./routes/work-types.routes');
const workReportsRoutes = require('./routes/work-reports.routes');
const reportsRoutes = require('./routes/reports.routes');
const notificationsRoutes = require('./routes/notifications.routes');
const activityRoutes = require('./routes/activity.routes');
const settingsRoutes = require('./routes/settings.routes');
const uploadRoutes = require('./routes/upload.routes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Ensure DB is initialized for incoming requests
app.use(async (req, res, next) => {
  try {
    await getDb();
    next();
  } catch (err) {
    console.error('Failed to init DB on request:', err);
    next(err);
  }
});

// Static uploads folder
const staticUploadDir = process.env.VERCEL
  ? path.join('/tmp', 'uploads')
  : path.join(__dirname, '..', 'uploads');
app.use('/uploads', express.static(staticUploadDir));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/clients', clientsRoutes);
app.use('/api/work-types', workTypesRoutes);
app.use('/api/work-reports', workReportsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/upload', uploadRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    service: 'IT Team Daily Task Management System'
  });
});

// Serve frontend static build if built
const distPath = path.join(__dirname, '..', 'dist');

// Route & middleware for slug: brandtisersitdepartment
app.use('/brandtisersitdepartment', (req, res, next) => {
  if (req.path.startsWith('/assets/')) {
    return next();
  }
  res.sendFile(path.join(distPath, 'index.html'), (err) => {
    if (err) next();
  });
});
app.use('/brandtisersitdepartment', express.static(distPath));

app.use(express.static(distPath));

// For client-side routing fallback
app.use((req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
    return next();
  }
  const indexPath = path.join(distPath, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      res.status(200).send(`
        <!DOCTYPE html>
        <html>
          <head><title>IT Task Tracker Backend</title></head>
          <body style="font-family: sans-serif; text-align: center; padding: 50px;">
            <h2>IT Task Tracker Backend API is Running on Port ${PORT}</h2>
            <p>Frontend is currently running via Vite dev server or needs to be built.</p>
            <p>API Health: <a href="/api/health">/api/health</a></p>
          </body>
        </html>
      `);
    }
  });
});

async function startServer() {
  try {
    await getDb();
    app.listen(PORT, () => {
      console.log(`=======================================================`);
      console.log(`  IT Team Daily Task Management System Server Ready   `);
      console.log(`  URL: http://localhost:${PORT}                      `);
      console.log(`  API Health: http://localhost:${PORT}/api/health     `);
      console.log(`=======================================================`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };
