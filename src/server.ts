import config  from "./config/index";
import express from "express"
const app = express()
const port = Number(config.port ?? 3000);

app.get('/', (req, res) => {
  res.send('The server is running!')
})

app.listen(port, () => {
  console.log(`app listening on port ${port}`)
})