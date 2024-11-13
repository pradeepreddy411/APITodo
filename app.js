const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

const path = require("path");
const dbPath = path.join(__dirname, "todoApplication.db");

const app = express();
app.use(express.json());
let db = null;
const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () =>
      console.log("Server Running at http://localhost:3000")
    );
  } catch (e) {
    console.log(`DB Error:${e.message}`);
    process.exit(1);
  }
};
initializeDbAndServer();

const authentication = (request, response, next) => {
  let jwtToken;
  const authHeader = request.headers["authorization"];
  if (authHeader) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken) {
    jwt.verify(jwtToken, "SECRET_KEY", (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        request.username = payload.username;
        request.userId = payload.userId;
        next();
      }
    });
  } else {
    response.status(401);
    response.send("Invalid JWT Token");
  }
};

app.post("/register/", async (request, response) => {
  const { email, password, name } = request.body;
  const getUserQuery = `SELECT * FROM user WHERE email='${email}'`;
  const userDBDetails = await db.get(getUserQuery);
  if (userDBDetails !== undefined) {
    response.status(400);
    response.send("User already exists");
  } else {
    if (password.length < 6) {
      response.status(400);
      response.send("Password is too short");
    } else {
      const hashedPassword = await bcrypt.hash(password, 10);
      const createUserQuery = `INSERT INTO user(email,password,name)
        VALUES ('${email}','${hashedPassword}','${name}', )`;
      await db.run(createUserQuery);
      response.send("User created successfully");
    }
  }
});

app.post("/login", async (request, response) => {
  const { email, password } = request.body;
  const getUserQuery = `SELECT * FROM user WHERE email='${email}';`;
  const userDbDetails = await db.get(getUserQuery);

  if (userDbDetails !== undefined) {
    const isPasswordCorrect = await bcrypt.compare(
      password,
      userDbDetails.password
    );
    if (isPasswordCorrect) {
      const payload = { email, userId: userDbDetails.user_id };
      const jwtToken = jwt.sign(payload, "SECRET_KEY");
      response.send({ jwtToken });
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  } else {
    response.status(400);
    response.send("Invalid email");
  }
});

const hasStatusProperty = (requestQuery) => {
  return requestQuery.status !== undefined;
};

app.get("/todos/", authentication, async (request, response) => {
  let data = null;
  let getTodosQuery = "";
  const { status } = request.query;
  const requestQuery = request.query;
  if (requestQuery.status !== undefined)
    getTodosQuery = `
            SELECT * FROM todo 
            WHERE
           status='${status}';`;

  data = await db.all(getTodosQuery);
  response.send(data);
});

app.get("/todos/:todoId/", authentication, async (request, response) => {
  const { todoId } = request.params;
  const getTodoQuery = `
    SELECT * FROM todo WHERE id=${todoId};`;
  const todo = await db.get(getTodoQuery);
  response.send(todo);
});

app.post("/todos/", authentication, async (request, response) => {
  const { id, status } = request.body;
  const postTodoQuery = `
    INSERT INTO
    todo(id,status)
    VALUES
    (${id},'${status}');`;
  await db.run(postTodoQuery);
  response.send("Todo Successfully Added");
});

app.put("/todos/:todoId/", authentication, async (request, response) => {
  const { todoId } = request.params;
  let updateColumn = "";

  const previousTodoQuery = `
    SELECT * FROM todo WHERE id=${todoId};`;
  const previousTodo = await db.get(previousTodoQuery);

  const { status = previousTodo.status } = request.body;

  let updateTodoQuery;

  const requestBody = request.body;

  if (requestBody.status !== undefined) updateColumn = "Status";

  const updateTodoQuery = `
            UPDATE
            todo
            SET
            status='${status}'
            WHERE
            id=${todoId};`;
  await db.run(updateTodoQuery);
  response.send(`${updateColumn} Updated`);
});

app.delete("/todos/:todoId/", authentication, async (request, response) => {
  const { todoId } = request.params;
  const deleteTodoQuery = `
    DELETE FROM todo WHERE id=${todoId};`;
  await db.run(deleteTodoQuery);
  response.send("Todo Deleted");
});

module.exports = app;
