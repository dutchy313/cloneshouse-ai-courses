import { app } from './app.js';
import { connectDb } from './config/db.js';
import { env } from './config/env.js';
import { seedDefaultCourses } from './services/courseSeed.service.js';

async function start() {
  await connectDb();
  await seedDefaultCourses();

  app.listen(env.port, () => {
    console.log(`API running on http://localhost:${env.port}`);
  });
}

start().catch((error) => {
  console.error(error);
  process.exit(1);
});
