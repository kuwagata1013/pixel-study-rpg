const express = require('express');
const path = require('path');

const app = express();
// Render assigns a dynamic PORT via environment variable
const PORT = process.env.PORT || 3000;

// Serve static files from the current directory (where index.html, app.js, styles.css, etc. are located)
app.use(express.static(__dirname));

// Route all requests to index.html to support client-side routing if added later
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
