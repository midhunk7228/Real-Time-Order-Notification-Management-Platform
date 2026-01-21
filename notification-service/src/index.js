const express = require('express');
const cors = require('cors');
const { startConsuming } = require('./kafka/consumer');
const { connect: connectRabbitMQ } = require('./rabbitmq/publisher');
const { startWorker: startEmailWorker } = require('./workers/email.worker');
const { startWorker: startSMSWorker } = require('./workers/sms.worker');
const { startWorker: startPushWorker } = require('./workers/push.worker');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3004;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'notification-service' });
});

// Start server
const startServer = async () => {
  try {
    // Connect to RabbitMQ
    await connectRabbitMQ();
    
    // Start Kafka consumer
    await startConsuming();
    
    // Start notification workers
    await startEmailWorker();
    await startSMSWorker();
    await startPushWorker();
    
    app.listen(PORT, () => {
      console.log(`Notification service running on port ${PORT}`);
      console.log('All workers started');
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;
