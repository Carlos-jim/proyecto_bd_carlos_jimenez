// Las rutas es ":cardId , :boardId , listId", donde es un parámetro que representa el ID de su respectivo nombre.
//Carlos Jimenez 30920188
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
import { CardUser } from "./dto/cardUser.dto";

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


//Endpoint para crear un nuevo usuario (BIEN)
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


// Endpoint para obtener todos los tableros donde el usuario es administrador (BIEN)
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


// Endpoint para crear un nuevo tablero y asociarlo con un usuario administrador (BIEN)
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


// Endpoint para crear una nueva lista (BIEN)
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


// Este endpoint es una ruta GET que se utiliza para obtener una tarjeta específica y el usuario que la creó.
// La ruta es "/cards/:cardId/users", donde ":cardId" es un parámetro que representa el ID de la tarjeta.
app.get("/cards/:cardId/users", async (req: Request, res: Response) => {
  // Extraemos "cardId" de los parámetros de la solicitud.
  const { cardId } = req.params;

  try {
    // Preparamos la consulta SQL para obtener el "userId" y "isOwner" de la tabla "card_users" donde "cardId" coincide con el parámetro proporcionado.
    const text = "SELECT userId, isOwner FROM card_users WHERE cardId = $1";
    const values = [cardId];

    // Ejecutamos la consulta SQL.
    const result = await pool.query(text, values);

    // Si la consulta es exitosa, devolvemos el resultado con un estado HTTP 200.
    res.status(200).json(result.rows);
  } catch (errors) {
    // Si ocurre un error durante la consulta, devolvemos el error con un estado HTTP 400.
    return res.status(400).json(errors);
  }
});




// Endpoint para obtener las listas de un tablero específico (BIEN)
//Las rutas //:boardId son el ID del parametro que lo representa
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


// Este endpoint es una ruta POST que se utiliza para asignar un usuario a una tarjeta específica.
// La ruta es "/cards/:cardId/users/:userId", donde ":cardId" y ":userId" son parámetros que representan el ID de la tarjeta y el ID del usuario respectivamente.
app.post("/cards/:cardId/users/:userId", async (req: Request, res: Response) => {
  // Convertimos el cuerpo de la solicitud a un objeto de tipo "CardUser" y asignamos "cardId" al objeto "CardUser".
  let cardUserDto: CardUser = plainToClass(CardUser, req.body);
  cardUserDto.cardId = req.params.cardId;

  try {
    // Validamos el objeto "cardUserDto" usando la función "validateOrReject".
    await validateOrReject(cardUserDto);

    // Preparamos la consulta SQL para insertar un nuevo usuario a una tarjeta en la base de datos.
    const text = "INSERT INTO card_users(cardId, userId, isOwner) VALUES($1, $2, $3) RETURNING *";
    const values = [cardUserDto.cardId, cardUserDto.userId, cardUserDto.isOwner];
    
    // Ejecutamos la consulta SQL.
    const result = await pool.query(text, values);
    
    // Si la consulta es exitosa, devolvemos el resultado con un estado HTTP 201.
    res.status(201).json(result.rows[0]);
  } catch (errors) {
    // Si ocurre un error durante la consulta, devolvemos el error con un estado HTTP 422.
    return res.status(422).json(errors);
  }
});


// Esta ruta POST se utiliza para crear una nueva tarjeta en una lista específica.
// La ruta es "/lists/:listId/cards", donde ":listId" es un parámetro que representa el ID de la lista.
app.post("/lists/:listId/cards", async (req: Request, res: Response) => {
  // Extraemos "listId" de los parámetros de la solicitud y lo agregamos al cuerpo de la solicitud.
  const { listId } = req.params;
  req.body.listId = listId;

  // Convertimos el cuerpo de la solicitud a un objeto de tipo "Card" usando la función "plainToClass".
  const cardDto: Card = plainToClass(Card, req.body);

  try {
    // Validamos el objeto "cardDto" usando la función "validateOrReject".
    await validateOrReject(cardDto);

    // Extraemos "title", "description" y "due_date" del objeto "cardDto".
    const { title, description, due_date } = cardDto;

    // Preparamos la consulta SQL para insertar una nueva tarjeta en la base de datos.
    const text = "INSERT INTO cards(title, description, due_date, listId) VALUES($1, $2, $3, $4) RETURNING *";
    const values = [title, description, due_date, listId];

    // Ejecutamos la consulta SQL.
    const result = await pool.query(text, values);

    // Si la consulta es exitosa, devolvemos el resultado con un estado HTTP 201.
    res.status(201).json(result.rows[0]);
  } catch (errors) {
    // Si ocurre un error durante la consulta, devolvemos el error con un estado HTTP 422.
    return res.status(422).json(errors);
  }
});



app.listen(port, () => {
  // Se inicia el servidor en el puerto especificado y se muestra un mensaje en la consola
  console.log(`[server]: Server is running at http://localhost:${port}`);
});