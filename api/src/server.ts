import { createApp } from "./app";

const app = createApp();
const port = process.env.PORT ? Number(process.env.PORT) : 3004;

app.listen(port, () => {
    console.log(`API listening on ${port}`);
});
