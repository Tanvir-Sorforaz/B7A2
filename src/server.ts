import config  from "./config/index";
import express from "express"
import { initDb } from "./db";
const app = express()
const port = Number(config.port ?? 3000);

const start = async () => {
  try {
    await initDb();
    app.listen(port, () => {
      console.log(`Server listening on port ${port}`);
    });
  } catch (error) {
    console.error("Failed to initialize database", error);
    process.exit(1);
  }
};

start();