const express = require("express");
const path = require("path");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const dbPath = path.join(__dirname, "twitterClone.db");
const app = express();
app.use(express.json());

let db = null;

const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server is running on 3000 PORT.....");
    });
  } catch (error) {
    console.log(`ERROR:${error.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();

app.post("/register/", async (request, response) => {
  const userRegisterDetails = request.body;
  const { username, password, name, gender } = userRegisterDetails;

  const isUserExits = `SELECT * FROM user WHERE username ='${username}';`;
  const userResponse = await db.get(isUserExits);
  if (userResponse !== undefined) {
    response.status(400);
    response.send("User already exits");
  } else {
    if (password.length < 6) {
      response.status(400);
      response.send("Password is too short");
    } else {
      const hashedPassword = await bcrypt.hash(password, 10);
      const newRegisterQuery = `INSERT INTO user(username,password,name,gender) VALUES('${username}','${hashedPassword}','${name}','${gender}');`;
      await db.run(newRegisterQuery);
      response.status(200);
      response.send("User created successfully");
    }
  }
});

app.post("/login/", async (request, response) => {
  const userLoginDetails = request.body;
  const { username, password } = userLoginDetails;
  const isUserExits = `SELECT * FROM user WHERE username ='${username}';`;
  const userResponse = await db.get(isUserExits);
  if (userResponse === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const encryptedPassword = await bcrypt.compare(
      password,
      userResponse.password
    );
    if (encryptedPassword !== true) {
      response.status(400);
      response.send("Invalid password");
    } else {
      const payload = {
        username: username,
      };
      const jwtToken = jwt.sign(payload, "123456");
      response.send({ jwtToken });
    }
  }
});
