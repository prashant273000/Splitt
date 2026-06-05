require('dotenv').config();
const { createApp } = require('./app');
const { startCron } = require('./jobs/cron');

const app = createApp();
const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Splitt backend listening on port ${port}`);
  startCron();
});
