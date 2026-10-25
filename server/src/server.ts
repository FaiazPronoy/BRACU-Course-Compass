import { Server } from 'http';
import mongoose from 'mongoose';
import { app } from './app';
import config from './config';
import seedSuperAdmin from './db/seedSuperAdmin';

let server: Server | undefined;

const shutDown = (reason: string, err: unknown) => {
  console.error(reason, err);
  if (server) server.close(() => process.exit(1));
  else process.exit(1);
};

async function main() {
  try {
    await mongoose.connect(config.database_url as string);
    await seedSuperAdmin();
    server = app.listen(config.port, () => {
      console.log(`App is listening on port ${config.port}`);
    });
  } catch (err) {
    shutDown('Could not start the server', err);
  }
}

process.on('unhandledRejection', (err) => shutDown('Unhandled rejection, shutting down', err));
process.on('uncaughtException', (err) => shutDown('Uncaught exception, shutting down', err));

main();
