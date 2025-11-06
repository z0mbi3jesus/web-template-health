const express = require('express');
const path = require('path');

const app = express();
const PORT = 3000;

// Serve static files from the root directory
app.use(express.static(path.join(__dirname)));

// Serve the admin panel
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin-panel.html'));
});

app.listen(PORT, () => {
    console.log(`🌐 Frontend server running at http://localhost:${PORT}`);
    console.log('📱 Open http://localhost:3000 to access the admin panel');
});