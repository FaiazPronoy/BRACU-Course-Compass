import { Server } from 'http';
import mongoose from 'mongoose';
import { app } from './app'; // Import only `app` now
import seedSuperAdmin from './app/DB';
import config from './app/config';

let server: Server;

async function main() {
  try {
    // Connect to MongoDB
    await mongoose.connect(config.database_url as string);

    // Seed super admin data
    await seedSuperAdmin();

    // Create and listen on the server
    server = app.listen(config.port, () => {
      console.log(`App is listening on port ${config.port}`);
    });
  } catch (err) {
    console.log(err);
  }
}

main();

// Graceful shutdown on unhandled rejections
process.on('unhandledRejection', (err) => {
  console.log(`Unhandled rejection detected, shutting down...`, err);
  if (server) {
    server.close(() => {
      process.exit(1);
    });
  }
  process.exit(1);
});

// Graceful shutdown on uncaught exceptions
process.on('uncaughtException', () => {
  console.log(`Uncaught exception detected, shutting down...`);
  process.exit(1);
});
