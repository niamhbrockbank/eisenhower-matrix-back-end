import { Client } from "pg";
import { config } from "dotenv";
import express from "express";
import cors from "cors";
import { PutNoteRequest } from "./types";

config(); //Read .env file lines as though they were env vars.

//Call this script with the environment variable LOCAL set if you want to connect to a local db (i.e. without SSL)
//Do not set the environment variable LOCAL if you want to connect to a heroku DB.

//For the ssl property of the DB connection config, use a value of...
// false - when connecting to a local DB
// { rejectUnauthorized: false } - when connecting to a heroku DB
const herokuSSLSetting = { rejectUnauthorized: false }
const sslSetting = process.env.LOCAL ? false : herokuSSLSetting
const dbConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: sslSetting,
};

const app = express();

//set up socket.io server
import http from "http"
import { Server } from "socket.io"
const server = http.createServer(app)
const io = new Server(server)

const socket = io.on('connection', () => {
  console.log('user connected')
})

//middleware
app.use(express.json()); //add body parser to each following route handler
app.use(cors()) //add CORS support to each following route handler

const client = new Client(dbConfig);
client.connect();

//Get all notes
app.get("/notes", async (req, res) => {
  try {
    const response = await client.query(`
      SELECT * FROM NOTES
    `)
    res.json(response.rows);
    socket.emit("Get all notes", (response.rows))
  } catch (error) {
    console.error(error)
  }
});

//Post a new note
app.post<{}, {}, {note_body : string}>("/notes", async (req, res) => {
  const {note_body} = req.body
  try {
    const response = await client.query(`
      INSERT INTO notes (note_body)
      VALUES ($1)
      RETURNING *
    `, [note_body])
    res.json(response.rows)
  } catch (error) {
    console.error(error)
  }
})

//Update an existing note
app.put<{}, {}, {note : PutNoteRequest}>("/notes", async (req, res) => {
  const {note} = req.body
  const {note_id, note_body, position} = note
  const {x : position_x, y: position_y} = position

  try {
    const response = await client.query(`
      UPDATE notes
      SET note_body = $1,
        position_x = $2,
        position_y = $3
        WHERE note_id = $4
      RETURNING *
    `, [note_body, position_x, position_y, note_id])
    res.json(response.rows)
  } catch (error) {
    console.error(error)
  }
  
})

//Delete a specific note
app.delete<{note_id : number}>("/notes", async (req, res) => {
  const {note_id} = req.body
  try {
    const response = await client.query(`
      DELETE FROM notes
      WHERE note_id = $1
    `, [note_id])
    res.json(response.rows)
  } catch (error) {
    console.error(error)
  }
})

//Start the server on the given port
const port = process.env.PORT;
if (!port) {
  throw 'Missing PORT environment variable.  Set it in .env file.';
}
app.listen(port, () => {
  console.log(`Server is up and running on port ${port}`);
});
