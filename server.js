const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const request = require('request');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

app.post('/api/google-fit', (req, res) => {
  const { accessToken, path, body } = req.body;

  if (!accessToken || !path || !body) {
    return res.status(400).json({ error: 'Invalid request: Missing accessToken, path, or body' });
  }

  const options = {
    url: `https://www.googleapis.com/fitness/v1/${path}`,
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
        responseBody: responseBody
      });
      res.status(response?.statusCode || 500).json({
        error: 'Error fetching data from Google Fit',
        details: responseBody
      });
    }
  });
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
