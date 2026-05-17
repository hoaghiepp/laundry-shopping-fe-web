#!/usr/bin/env node

const path = require("path");
const { createRequestHandler } = require("@expo/server/adapter/express");

const express = require("express");
const compression = require("compression");
const morgan = require("morgan");

const CLIENT_BUILD_DIR = path.join(__dirname, "dist/client");
const SERVER_BUILD_DIR = path.join(__dirname, "dist/server");

const app = express();

app.use(compression());
app.disable("x-powered-by");

process.env.NODE_ENV = "production";

app.use(
  express.static(CLIENT_BUILD_DIR, {
    maxAge: "1h",
    extensions: ["html"],
  }),
);

app.use(morgan("tiny"));

app.all(
  "*",
  createRequestHandler({
    build: SERVER_BUILD_DIR,
  }),
);

const port = Number(process.env.PORT) || 8080;

app.listen(port, "0.0.0.0", () => {
  console.log(`Server listening on http://0.0.0.0:${port}`);
});
