const express = require("express");
const cookieParser = require("cookie-parser");
const app = express();
const PORT = 8080; // default port 8080

app.set("view engine", "ejs");

const users = {
  userRandomID: {
    id: "userRandomID",
    email: "user@example.com",
    password: "purple-monkey-dinosaur",
  },
  user2RandomID: {
    id: "user2RandomID",
    email: "user2@example.com",
    password: "dishwasher-funk",
  },
};

const urlDatabase = {
  "b2xVn2": "http://www.lighthouselabs.ca",
  "9sm5xK": "http://www.google.com"
};

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});

app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get("/", (req, res) => {
  res.send("Hello");
});

app.get("/urls.json", (req, res) => {
  res.json(urlDatabase);
});

app.get("/hello", (req, res) => {
  res.send("<html><body>Hello <b>World</b></body></html>\n");
});

app.get("/urls", (req, res) => {
  const templateVars = {
    user_id: req.cookies["user_id"],
    users: users,
    urls: urlDatabase
  };
  res.render("urls_index", templateVars);
});

app.get("/urls/new", (req, res) => {
  const templateVars = {
    user_id: req.cookies["user_id"],
    users: users
  };

  res.render("urls_new", templateVars);
});

app.get("/urls/:id", (req, res) => {
  const templateVars = { 
    user_id: req.cookies["user_id"],
    users, users,
    id: req.params.id, 
    longURL: urlDatabase[req.params.id] 
  };
  res.render("urls_show", templateVars);
});

app.post("/urls", (req, res) => {
  console.log(req.body); // Log the POST request body to the console

  const shortURL = generateRandomString();
  urlDatabase[shortURL] = req.body.longURL;
  res.redirect(`/urls/${shortURL}`);
});

// redirects to the long URL 
app.get("/u/:id", (req, res) => {
  const longURL = urlDatabase[req.params.id];
  res.redirect(longURL);
});

app.post("/urls/:id/delete", (req, res) => {
  delete urlDatabase[req.params.id];
  res.redirect(`/urls`);
});

app.post("/urls/:id", (req, res) => {
  urlDatabase[req.params.id] = req.body.longURL;
  res.redirect(`/urls`);
});

app.post("/login", (req, res) => {
  for (const user_id in users) {
    if (users[user_id].email === req.body.email) {
      res.cookie("user_id", user_id);
      res.redirect(`/urls`);
    }
  }
});

app.post("/logout", (req, res) => {
  res.clearCookie("user_id");
  res.redirect(`/urls`);
});

app.get("/register", (req, res) => {
  const templateVars = {
    user_id: req.cookies["user_id"],
    users: users
  }
  console.log(users);

  res.render("register", templateVars);
});

app.post("/register", (req, res) => {
  if (req.body.email.length === 0 || req.body.password.length === 0 || getUserByEmail(req.body.email)) {
    res.send(400);
  }

  const id = generateRandomString(); 
  res.cookie("user_id", id)

  users[id] = {
    id: id, 
    email: req.body.email,
    password: req.body.password
  };
  
  console.log("After: " + Object.keys(users));
  
  res.redirect("/urls");
});


const generateRandomString = () => {
  const alphanumericChars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let str = "";
  let i = 0;

  // concatenates a character at a random index in alphanumericChars
  while (i < 6) {
    str += alphanumericChars[Math.floor(Math.random() * alphanumericChars.length)];
    i++;
  }

  return str;
};

// returns either the entire user object or null if not found 
const getUserByEmail = (email) => {
  for (const user_id in users) {
    if (users[user_id].email === email) {
      return users;
    }
  }

  return null;
};