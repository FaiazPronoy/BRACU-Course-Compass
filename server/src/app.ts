import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { Application, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

import config from './config';
import globalErrorHandler from './middlewares/globalErrorHandler';
import notFound from './middlewares/notFound';
import router from './routes';

const app: Application = express();

app.disable('x-powered-by');
// notes can be long, so the limit is above the default 100kb
app.use(express.json({ limit: '400kb' }));
app.use(cookieParser());
app.use(cors({ origin: config.client_urls, credentials: true }));

app.use('/api/v1', router);
app.use('/api', notFound);

// In production the built client (client/dist) is served from here, so the
// site and the API share one address and one deploy. Any path that is not a
// file falls back to index.html for the client-side router.
const clientDist = path.resolve(__dirname, '../../client/dist');
if (fs.existsSync(path.join(clientDist, 'index.html'))) {
  app.use(express.static(clientDist, { maxAge: '7d', index: false }));
  app.get('*', (req: Request, res: Response) => res.sendFile(path.join(clientDist, 'index.html')));
} else {
  app.get('/', (req: Request, res: Response) => {
    res.send('BRACU Course Compass API');
  });
}

app.use(notFound);
app.use(globalErrorHandler);

export { app };
