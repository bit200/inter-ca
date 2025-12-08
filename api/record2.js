const express = require('express');
const multer = require('multer'); // For handling file uploads
const path = require('path');
const app = express();
const port = 3200;

// Set up multer for handling file uploads and specify the destination folder
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads'); // Specify the directory where you want to save the files
  },
  filename: function (req, file, cb) {
    cb(null, 'audio.ogg'); // Set the filename of the saved file
  },
});

const upload = multer({ storage: storage });

// Serve the uploaded files from the 'uploads' folder (optional)
app.use(express.static(path.join(__dirname, 'uploads')));

// Create a route to handle the audio upload
app.post('/upload-audio', upload.single('audio'), (req, res) => {
  if (!req.file) {
    return res.status(400).send('No audio file received.');
  }

  // The uploaded audio file is available at req.file.path
  const audioFilePath = req.file.path;
  console.log('Audio file received and saved at:', audioFilePath);

  // You can process or further handle the audio file here

  return res.status(200).send('Audio file received and saved.');
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

