const path = require('path');
const publicFiles = new Set([
  'index.html', 'admin-panel.html', 'patient-calendar.html', 'patient-dashboard.html',
  'patient-hub.html', 'video-visit.html', 'styles.css', 'script.js',
  'js/html-escape.js', 'js/app-config.js', 'js/supabase-config.js', 'js/utils.js', 'js/ui.js',
  'js/patient-calendar.js', 'js/patient-dashboard.js', 'js/video-visit.js'
]);
module.exports = function serveFrontend(app, root) {
  app.use((req, res, next) => {
    if (!['GET', 'HEAD'].includes(req.method)) return next();
    const file = req.path === '/' ? 'index.html' : req.path.slice(1);
    if (!publicFiles.has(file)) return next();
    res.sendFile(path.join(root, file));
  });
};
