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

const autheticateValidUser = async (request, response, next) => {
  const authHeader = request.headers["authorization"];
  if (authHeader !== undefined) {
    const jwtToken = authHeader.split(" ")[1];
    if (jwtToken === undefined) {
      response.status(401);
      response.send("Invalid JWT Token");
    } else {
      jwt.verify(jwtToken, "123456", async (error, payload) => {
        if (error) {
          response.status(401);
          response.send("Invalid JWT Token");
        } else {
          request.username = payload.username;
          next();
        }
      });
    }
  }
};

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
      console.log(jwtToken);
    }
  }
});

const getUserIdFromUsername = async (username) => {
  const userIdQuery = `SELECT user_id from user WHERE username='${username}';`;
  const userId = await db.get(userIdQuery);
  return userId;
};

app.get(
  "/user/tweets/feed/",
  autheticateValidUser,
  async (request, response) => {
    const { username } = request;
    const userId = await getUserIdFromUsername(username);
    const api3Query = `SELECT username, tweet ,date_time FROM (tweet INNER JOIN follower ON tweet.user_id = follower.following_user_id) AS T NATURAL JOIN user  WHERE follower.follower_user_id = ${userId} ORDER BY date_time DESC LIMIT 4 ;`;
    const api3Res = await db.all(api3Query);
    response.send(api3Res);
  }
);
