const functions = require('firebase-functions'); // Include Firebase functions for deployment
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const request = require('request');

const app = express();
const port = process.env.PORT || 3000;

// Set the Google Fit API URL based on the environment
const googleFitApiUrl = process.env.NODE_ENV === 'production'
  ? 'https://www.googleapis.com/fitness/v1' // Point directly to Google Fit API for production
  : 'http://localhost:3000/api/google-fit'; // Local server URL for development

app.use(cors());
app.use(bodyParser.json());

app.post('/api/google-fit', (req, res) => {
  const { accessToken, path, body } = req.body;

  if (!accessToken || !path || !body) {
    return res.status(400).json({ error: 'Invalid request: Missing accessToken, path, or body' });
  }

  const options = {
    url: `${googleFitApiUrl}/${path}`, // Use the environment-specific URL
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  };

  request(options, (error, response, responseBody) => {
    if (error) {
      console.error('Error occurred:', error);
      return res.status(500).json({ error: 'Internal server error', details: error.message });
    }

    if (response && response.statusCode === 200) {
      try {
        const data = JSON.parse(responseBody); // Safely parse the response
        res.json(data);
      } catch (parseError) {
        console.error('Error parsing response body:', parseError);
        res.status(500).json({ error: 'Failed to parse response from Google Fit' });
      }
    } else {
      console.error('Google Fit API error:', {
        statusCode: response?.statusCode,
        responseBody: responseBody,
      });
      res.status(response?.statusCode || 500).json({
        error: 'Error fetching data from Google Fit',
        details: responseBody,
      });
    }
  });
});

// Export as Firebase Functions
exports.api = functions.https.onRequest(app);
