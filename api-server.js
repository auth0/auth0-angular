const express = require('express');
const cors = require('cors');
const jwt = require('express-jwt');
const jwksRsa = require('jwks-rsa');

const app = express();

const authConfig = {
  domain: 'brucke.auth0.com',
  audience: 'http://localhost/',
  appUri: 'http://localhost:4200',
};

if (!authConfig.domain || !authConfig.audience) {
  throw 'Please make sure that auth_config.json is in place and populated';
}

app.use(
  cors({
    origin: authConfig.appUri,
  })
);

const checkJwt = jwt({
  secret: jwksRsa.expressJwtSecret({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 5,
    jwksUri: `https://${authConfig.domain}/.well-known/jwks.json`,
  }),

  audience: authConfig.audience,
  issuer: `https://${authConfig.domain}/`,
  algorithms: ['RS256'],
});

app.get('/api/external', checkJwt, (req, res) => {
  res.send({
    msg: 'Your access token was successfully validated!',
  });
});

const port = process.env.API_SERVER_PORT || 3001;

app.listen(port, () => console.log(`Api started on port ${port}`));
