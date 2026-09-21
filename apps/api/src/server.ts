import { app } from './app';

const parsedPort = Number.parseInt(process.env.API_PORT ?? process.env.PORT ?? '3000', 10);
const port = Number.isNaN(parsedPort) ? 3000 : parsedPort;

app.listen(port, () => {
  console.log(`Saraya API listening on http://localhost:${port}`);
});
