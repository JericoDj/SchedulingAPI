const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const { clientUrl, deployment, nodeEnv } = require('./config/env');
const { errorHandler, notFound } = require('./middleware/errorMiddleware');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const instagramRoutes = require('./routes/instagramRoutes');
const facebookRoutes = require('./routes/facebookRoutes');
const tiktokRoutes = require('./routes/tiktokRoutes');
const linkedinRoutes = require('./routes/linkedinRoutes');
const threadsRoutes = require('./routes/threadsRoutes');
const xRoutes = require('./routes/xRoutes');
const youtubeRoutes = require('./routes/youtubeRoutes');
const pinterestRoutes = require('./routes/pinterestRoutes');
const scheduleRoutes = require('./routes/scheduleRoutes');
const oauthRoutes = require('./routes/oauthRoutes');
const workerRoutes = require('./routes/workerRoutes');
const contentRoutes = require('./routes/contentRoutes');

const app = express();

const configuredOrigins = String(clientUrl || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const allowedOrigins = [
  ...configuredOrigins,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4000',
  'http://127.0.0.1:4000',
  'http://localhost:5000',
  'http://127.0.0.1:5000',
  'http://192.168.254.102:5000',
  'https://socialsyncfe.netlify.app',
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS not allowed for origin: ${origin}`));
    }
  },
  credentials: true,
};



app.disable('x-powered-by');
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(helmet());
app.use(morgan(nodeEnv === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.send('Welcome to Post Scheduler');
});

app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    environment: nodeEnv,
    deployment,
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/instagram-posts', instagramRoutes);
app.use('/api/facebook-posts', facebookRoutes);
app.use('/api/tiktok-posts', tiktokRoutes);
app.use('/api/linkedin-posts', linkedinRoutes);
app.use('/api/threads-posts', threadsRoutes);
app.use('/api/x-posts', xRoutes);
app.use('/api/youtube-posts', youtubeRoutes);
app.use('/api/pinterest-posts', pinterestRoutes);
app.use('/api/schedule', scheduleRoutes);
app.use('/api/oauth', oauthRoutes);
app.use('/api/worker', workerRoutes);
app.use('/api/content', contentRoutes);



app.use(notFound);
app.use(errorHandler);

module.exports = app;
