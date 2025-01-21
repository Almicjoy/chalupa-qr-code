const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const { Server } = require('ws');
const { v4: uuidv4 } = require('uuid'); // Import uuidv4

const wss = new Server({ noServer: true });

const app = express();
const PORT = process.env.PORT ||3001;

app.use(cors({ origin: 'https://rotaract-ow-loteria.vercel.app' }));

let cards = {};

// Serve static images
app.use("/images", express.static(path.join(__dirname, "chalupa-images")));

// Helper to generate a 4x4 card
// Helper to generate a 4x4 card
const generateCard = (images) => {
    // Check if images is an array and not empty
    if (!Array.isArray(images) || images.length === 0) {
      throw new Error("No images available to generate a card");
    }
  
    const shuffled = images.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 16); // Take 16 images
  };

// Endpoint to list images
app.get("/list-images", (req, res) => {
  const imagesDir = path.join(__dirname, "chalupa-images");
  fs.readdir(imagesDir, (err, files) => {
    if (err) {
      return res.status(500).json({ error: "Unable to read images directory" });
    }
    const images = files
      .filter((file) => file.endsWith(".jpg") || file.endsWith(".png"))
      .map((file) => `https://rotaract-loteria-backend-3c90567e12a3.herokuapp.com/images/${file}`);
    res.json(images);
  });
});

// Endpoint to generate a random card
app.get("/api/generate", (req, res) => {

    const id = uuidv4();
    const imagesDir = path.join(__dirname, "chalupa-images");
    fs.readdir(imagesDir, (err, files) => {
      if (err) {
        return res.status(500).json({ error: "Unable to read images directory" });
      }
      const images = files
        .filter((file) => file.endsWith(".jpg") || file.endsWith(".png"))
        .map((file) => `https://rotaract-loteria-backend-3c90567e12a3.herokuapp.com/images/${file}`);
      
      // Check if images are available before generating the card
      if (!images || images.length === 0) {
        return res.status(500).json({ error: "No images found" });
      }
  
      const card = generateCard(images);

      cards[id] = card; // Store the card with the ID
      res.json({ id, cardUrl: `https://rotaract-ow-loteria.vercel.app/card/${id}` });
    //   res.json({ card });
    });
  });


  
app.get('/api/card/:id', (req, res) => {
    const { id } = req.params;
    // Get the card images associated with the ID from your storage
    // Assuming you store card images in a variable or a file
    if (!cards[id]) {
      return res.status(404).json({ error: "Card not found" });
    }
  
    // Respond with the images for the card
    res.json({ images: cards[id] });
});

// Endpoint to clear all cards
app.delete("/api/clear-cards", (req, res) => {
  cards = {}; // Clear all stored cards
  res.json({ success: true, message: "All cards have been cleared" });

  // Notify all connected clients
  wss.clients.forEach(client => {
    if (client.readyState === 1) {
      client.send(JSON.stringify({ type: "CLEAR_CARDS" }));
    }
  });
});
  

const server = app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

server.on('upgrade', (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, socket => {
    wss.emit('connection', socket, request);
  });
});
