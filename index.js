import express from "express";
import Randomstring from "randomstring";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import swaggerUi from "swagger-ui-express";
import swaggerJsdoc from "swagger-jsdoc";

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../url-short-fe/build")));

const long_to_short_url_store = new Map();
const short_url_store = new Set();
const short_to_long_url_store = new Map();

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "URL Shortener",
      version: "1.0.0",
      description: "A simple URL shortener application",
    },
    servers: [
      {
        url: "http://localhost:3005",
      },
    ],
  },
  apis: ["./index.js"],
};

const specs = swaggerJsdoc(options);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(specs));

/**
 * @swagger
 * components:
 *   schemas:
 *     ShortenURLRequest:
 *       type: object
 *       required:
 *         - long_url
 *       properties:
 *         long_url:
 *           type: string
 *           description: The main long URL
 *           example: "http://www.google.com"
 *     ShortenURLResponse:
 *       type: object
 *       properties:
 *         short_url:
 *           type: string
 *           description: The shortened URL code
 *           example: "abc1234"
 *     RetrieveLongURLRequest:
 *       type: object
 *       required:
 *         - short_url
 *       properties:
 *         short_url:
 *           type: string
 *           description: The shortened URL code
 *           example: "abc1234"
 *     RetrieveLongURLResponse:
 *       type: object
 *       properties:
 *         long_url:
 *           type: string
 *           description: The main long URL
 *           example: "http://www.google.com"
 */

/**
 * @swagger
 * /short:
 *   post:
 *     summary: Shorten a long URL
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ShortenURLRequest'
 *     responses:
 *       200:
 *         description: Shortened URL
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ShortenURLResponse'
 */
function short(req, res) {
  let long_url = req.body.long_url;

  if (!/^https?:\/\//i.test(long_url)) {
    long_url = "http://" + long_url;
  }

  if (long_to_short_url_store.get(long_url)) {
    res.send({ short_url: long_to_short_url_store.get(long_url) });
  } else {
    //generating new unique URL

    let shortend_url = null;
    while (shortend_url == null) {
      shortend_url = Randomstring.generate(7);
      if (short_url_store.has(shortend_url)) {
        shortend_url = null;
      }
    }

    //updating the data

    long_to_short_url_store.set(long_url, shortend_url);
    short_to_long_url_store.set(shortend_url, long_url);
    short_url_store.add(shortend_url);

    //Sending back response

    res.send({ short_url: shortend_url });
  }
}

/**
 * @swagger
 * /retrieveLongUrl:
 *   get:
 *     summary: Getting the original long URL from a shortened URL
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RetrieveLongURLRequest'
 *     responses:
 *       200:
 *         description: Original long URL
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RetrieveLongURLResponse'
 *       400:
 *         description: URL not found
 */
function retrieveLongUrl(req, res) {
  let short_url = req.body.short_url;

  let long_url = short_to_long_url_store.get(short_url);
  if (long_url == null || long_url == undefined) {
    res.status(400).send({ Error: "URL not found" });
  }
  res.send({ long_url: long_url });
}

/**
 * @swagger
 * /{short_url}:
 *   get:
 *     summary: Redirect to the original long URL
 *     parameters:
 *       - in: path
 *         name: short_url
 *         required: true
 *         schema:
 *           type: string
 *         description: The shortened URL code
 *     responses:
 *       302:
 *         description: Redirect to the original long URL
 *       404:
 *         description: URL not found
 */
function redirect(req, res) {
  let short_url = req.params.short_url;

  let long_url = short_to_long_url_store.get(short_url);
  if (long_url == null || long_url == undefined) {
    res.status(404).send({ Error: "URL not found" });
  } else {
    res.redirect(long_url);
  }
}

app.post("/short", short);
app.get("/retrieveLongUrl", retrieveLongUrl);
app.get("/:short_url", redirect);

const port = 3005;
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
