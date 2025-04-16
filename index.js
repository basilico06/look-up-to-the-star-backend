const express = require("express");
const app = express();
const route = require("./route/event");
const PORT = process.env.PORT || 4000;
const cors = require("cors");


app.use(cors({origin: "*"}));
app.use(express.json());
app.use("/route/event", route);

app.get('/', (req, res) => {
    res.send('Hello World!');
});

app.get('/api', (req, res) => {
    res.send('Hello api!');
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

