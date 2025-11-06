const express = require('express');
const path = require('path');

const app = express();
const PORT = 8080;

// Serve static files from the root directory
app.use(express.static(path.join(__dirname)));

// Serve the main website
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🌐 Main website running at http://localhost:${PORT}`);
    console.log('📱 This is the patient-facing website');
});