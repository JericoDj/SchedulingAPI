const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const { deployment, nodeEnv } = require('./config/env');
const { errorHandler, notFound } = require('./middleware/errorMiddleware');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const instagramRoutes = require('./routes/instagramRoutes');
const facebookRoutes = require('./routes/facebookRoutes');
const tiktokRoutes = require('./routes/tiktokRoutes');
const linkedinRoutes = require('./routes/linkedinRoutes');
const oauthRoutes = require('./routes/oauthRoutes');

const app = express();

const corsOptions = {
  origin: true,
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
app.use('/api/oauth', oauthRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
