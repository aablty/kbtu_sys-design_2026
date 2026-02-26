import express from "express";
import { checkoutHandler } from "./controllers";

const app = express();

app.use(express.json());

app.post("/checkout", checkoutHandler);

const PORT = 3000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
