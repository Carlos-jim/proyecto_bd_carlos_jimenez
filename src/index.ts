import { plainToClass } from "class-transformer";
import { validateOrReject } from "class-validator";
import dotenv from "dotenv";
import "es6-shim";
import express, { Express, Request, Response } from "express";
import { Pool } from "pg";
import "reflect-metadata";
import { Board } from "./dto/board.dto";
import { User } from "./dto/user.dto";
import { List } from "./dto/list.dto";
import { Card } from "./dto/card.dto";

dotenv.config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASS,
  port: +process.env.DB_PORT!,
});

const app: Express = express();
const port = process.env.PORT || 3000;
app.use(express.json());

//Endpoint para obtener todos los usuarios
app.get("/users", async (req: Request, res: Response) => {
  try {
    // Se define la consulta SQL para obtener los usuarios
    const text = "SELECT id, name, email FROM users";
    
    // Se ejecuta la consulta SQL
    const result = await pool.query(text);
    
    // Si la consulta es exitosa, se devuelve un estado HTTP 200 (OK) y los resultados de la consulta
    res.status(200).json(result.rows);
  } catch (errors) {
    // Si ocurre un error durante la consulta, se devuelve un estado HTTP 400 (Bad Request) y los detalles del error
    return res.status(400).json(errors);
  }
});


//Endpoint para crear un nuevo usuario
app.post("/users", async (req: Request, res: Response) => {
  // Se convierte el cuerpo de la solicitud a un objeto User
  let userDto: User = plainToClass(User, req.body);
  
  try {
    // Se valida el objeto User
    await validateOrReject(userDto);

    // Se define la consulta SQL para insertar un nuevo usuario
    const text = "INSERT INTO users(name, email) VALUES($1, $2) RETURNING *";
    const values = [userDto.name, userDto.email];
    
    // Se ejecuta la consulta SQL
    const result = await pool.query(text, values);
    
    // Si la consulta es exitosa, se devuelve un estado HTTP 201 (Created) y el nuevo usuario
    res.status(201).json(result.rows[0]);
  } catch (errors) {
    // Si ocurre un error durante la consulta o la validación, se devuelve un estado HTTP 422 (Unprocessable Entity) y los detalles del error
    return res.status(422).json(errors);
  }
});


// Endpoint para obtener todos los tableros donde el usuario es administrador
app.get("/boards", async (req: Request, res: Response) => {
  try {
    // Se define la consulta SQL para obtener todos los tableros donde el usuario es administrador
    const text =
      'SELECT b.id, b.name, bu.userId "adminUserId" FROM boards b JOIN board_users bu ON bu.boardId = b.id WHERE bu.isAdmin IS true';
    
    // Se ejecuta la consulta SQL
    const result = await pool.query(text);
    
    // Si la consulta es exitosa, se devuelve un estado HTTP 200 (OK) y los resultados de la consulta
    res.status(200).json(result.rows);
  } catch (errors) {
    // Si ocurre un error durante la consulta, se devuelve un estado HTTP 400 (Bad Request) y los detalles del error
    return res.status(400).json(errors);
  }
});


// Endpoint para crear un nuevo tablero y asociarlo con un usuario administrador
app.post("/boards", async (req: Request, res: Response) => {
  // Se convierte el cuerpo de la solicitud a un objeto Board
  let boardDto: Board = plainToClass(Board, req.body);
  
  // Se obtiene una conexión al pool de conexiones a la base de datos
  const client = await pool.connect();
  
  try {
    // Se inicia una transacción en la base de datos
    client.query("BEGIN");
    
    // Se valida el objeto Board
    await validateOrReject(boardDto, {});

    // Se define la consulta SQL para insertar un nuevo tablero
    const boardText = "INSERT INTO boards(name) VALUES($1) RETURNING *";
    const boardValues = [boardDto.name];
    
    // Se ejecuta la consulta SQL para insertar el tablero
    const boardResult = await client.query(boardText, boardValues);

    // Se define la consulta SQL para asociar el tablero con un usuario administrador
    const boardUserText =
      "INSERT INTO board_users(boardId, userId, isAdmin) VALUES($1, $2, $3)";
    const boardUserValues = [
      boardResult.rows[0].id,
      boardDto.adminUserId,
      true,
    ];
    
    // Se ejecuta la consulta SQL para asociar el tablero con el usuario
    await client.query(boardUserText, boardUserValues);

    // Se confirma la transacción
    client.query("COMMIT");
    
    // Si la consulta es exitosa, se devuelve un estado HTTP 201 (Created) y el nuevo tablero
    res.status(201).json(boardResult.rows[0]);
  } catch (errors) {
    // Si ocurre un error durante la consulta o la validación, se revierte la transacción
    client.query("ROLLBACK");
    
    // Se devuelve un estado HTTP 422 (Unprocessable Entity) y los detalles del error
    return res.status(422).json(errors);
  } finally {
    // Se libera la conexión al pool de conexiones a la base de datos
    client.release();
  }
});


// Endpoint para crear una nueva lista
app.post("/lists", async (req: Request, res: Response) => {
  // Se convierte el cuerpo de la solicitud a un objeto List
  let listDto: List = plainToClass(List, req.body);
  
  try {
    // Se valida el objeto List
    await validateOrReject(listDto);

    // Se define la consulta SQL para insertar una nueva lista
    const text = "INSERT INTO lists(name, boardId) VALUES($1, $2) RETURNING *";
    const values = [listDto.name, listDto.boardId];
    
    // Se ejecuta la consulta SQL
    const result = await pool.query(text, values);
    
    // Si la consulta es exitosa, se devuelve un estado HTTP 201 (Created) y la nueva lista
    res.status(201).json(result.rows[0]);
  } catch (errors) {
    // Si ocurre un error durante la consulta o la validación, se devuelve un estado HTTP 422 (Unprocessable Entity) y los detalles del error
    return res.status(422).json(errors);
  }
});


// Endpoint para obtener una tarjeta específica y el usuario que la creó
app.get("/cards/:id", async (req: Request, res: Response) => {
  try {
    // Se define la consulta SQL para obtener una tarjeta específica y el usuario que la creó
    const text = `SELECT c.id, c.title, u.id as userId, u.name as userName 
              FROM cards c 
              JOIN card_users cu ON cu.cardId = c.id
              JOIN users u ON u.id = cu.userId 
              WHERE c.id = $1 AND cu.isOwner = true`;

    const values = [req.params.id];
    
    // Se ejecuta la consulta SQL
    const result = await pool.query(text, values);
    
    // Si la consulta es exitosa, se devuelve un estado HTTP 200 (OK) y los resultados de la consulta
    res.status(200).json(result.rows[0]);
  } catch (errors) {
    // Si ocurre un error durante la consulta, se devuelve un estado HTTP 400 (Bad Request) y los detalles del error
    return res.status(400).json(errors);
  }
});


// Endpoint para obtener las listas de un tablero específico
app.get("/boards/:boardId/lists", async (req: Request, res: Response) => {
  const { boardId } = req.params;
  try {
    // Se define la consulta SQL para obtener las listas de un tablero específico
    const text = "SELECT * FROM lists WHERE boardId = $1";
    const values = [boardId];
    
    // Se ejecuta la consulta SQL
    const result = await pool.query(text, values);
    
    // Si la consulta es exitosa, se devuelve un estado HTTP 200 (OK) y los resultados de la consulta
    res.status(200).json(result.rows);
  } catch (errors) {
    // Si ocurre un error durante la consulta, se devuelve un estado HTTP 400 (Bad Request) y los detalles del error
    return res.status(400).json(errors);
  }
});


// Endpoint para asignar un usuario a una tarjeta
app.post("/cards/:cardId/users/:userId", async (req: Request, res: Response) => {
  const { cardId, userId } = req.params;
  
  try {
    // Se verifica si la tarjeta y el usuario existen en la base de datos
    const cardExists = await pool.query("SELECT * FROM cards WHERE id = $1", [cardId]);
    const userExists = await pool.query("SELECT * FROM users WHERE id = $1", [userId]);
    
    if (cardExists.rowCount === 0) {
      return res.status(404).json({ message: "Card not found." });
    }
    
    if (userExists.rowCount === 0) {
      return res.status(404).json({ message: "User not found." });
    }
    
    // Se define la consulta SQL para asignar un usuario a una tarjeta
    const text = "INSERT INTO card_users(cardId, userId) VALUES($1, $2)";
    const values = [cardId, userId];
    
    // Se ejecuta la consulta SQL
    await pool.query(text, values);
    
    // Si la consulta es exitosa, se devuelve un estado HTTP 201 (Created) y un mensaje de éxito
    res.status(201).json({ message: "User assigned to card successfully." });
  } catch (errors) {
    // Si ocurre un error durante la consulta, se devuelve un estado HTTP 400 (Bad Request) y los detalles del error
    return res.status(400).json(errors);
  }
});


//Crear una nuevatarjeta en una lista especiica
app.post("/lists/:listId/cards", async (req: Request, res: Response) => {
  const { listId } = req.params;
  let cardDto: Card = plainToClass(Card, req.body);
  
  try {
    // Se valida el objeto Card
    await validateOrReject(cardDto);

    // Se define la consulta SQL para insertar una nueva tarjeta en una lista específica
    const text = "INSERT INTO cards(title, listId) VALUES($1, $2) RETURNING *";
    const values = [cardDto.title, listId];
    
    // Se ejecuta la consulta SQL
    const result = await pool.query(text, values);

    // Se define la consulta SQL para asignar el usuario a la nueva tarjeta
    const text2 = "INSERT INTO card_users(cardId, userId) VALUES($1, $2)";
    const values2 = [result.rows[0].id, cardDto.userId];
    
    // Se ejecuta la segunda consulta SQL
    await pool.query(text2, values2);
    
    // Si las consultas son exitosas, se devuelve un estado HTTP 201 (Created) y la nueva tarjeta
    res.status(201).json(result.rows[0]);
  } catch (errors) {
    // Si ocurre un error durante las consultas o la validación, se devuelve un estado HTTP 400 (Bad Request) y los detalles del error
    return res.status(400).json(errors);
  }
});



app.listen(port, () => {
  // Se inicia el servidor en el puerto especificado y se muestra un mensaje en la consola
  console.log(`[server]: Server is running at http://localhost:${port}`);
});
