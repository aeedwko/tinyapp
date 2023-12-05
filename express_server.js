const express = require("express");
const cookieSession = require("cookie-session");
const bcrypt = require("bcryptjs");
const app = express();
const PORT = 8080; // default port 8080

const { getUserByEmail, generateRandomString, urlsForUser } = require("./helpers");

const users = {};
const urlDatabase = {};

app.set("view engine", "ejs");

app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}!`);
});

app.use(express.urlencoded({ extended: true }));

app.use(cookieSession({
  name: 'session',
  keys: ["Intestine", "Stomach"],

  // Cookie Options
  maxAge: 24 * 60 * 60 * 1000 // 24 hours
}));

app.get("/", (req, res) => {
  !req.session["user_id"] ? res.redirect(`/login`) : res.redirect(`/urls`);
});

// page showing a list of the URLs the user has created
app.get("/urls", (req, res) => {
  if (!req.session["user_id"]) {
    return res.status(401).send("Please login to view this page.");
  }

  const templateVars = {
    user_id: req.session["user_id"],
    users: users,
    urls: urlsForUser(req.session["user_id"], urlDatabase)
  };
  
  res.render("urls_index", templateVars);
});

// page for creating a new URL
app.get("/urls/new", (req, res) => {
  if (!req.session["user_id"]) {
    res.redirect(`/login`);
  } else {
    const templateVars = {
      user_id: req.session["user_id"],
      users: users
    };
  
    res.render("urls_new", templateVars);
  }
});

// page for editing the long URL
app.get("/urls/:id", (req, res) => {
  if (!urlDatabase[req.params.id]) {
    return res.status(400).send("ID does not exist\n");
  }
  if (!req.session["user_id"]) {
    return res.status(401).send("You are not logged in to access this URL");
  }
  if (urlDatabase[req.params.id].userID !== req.session["user_id"]) {
    return res.status(401).send("You are unauthorized to access this URL");
  }

  const templateVars = {
    user_id: req.session["user_id"],
    users: users,
    id: req.params.id,
    longURL: urlDatabase[req.params.id].longURL
  };
  
  res.render("urls_show", templateVars);
});

// redirects to the long URL
app.get("/u/:id", (req, res) => {
  if (!urlDatabase[req.params.id]) {
    return res.status(400).send("The URL for the given ID does not exist.\n");
  }

  const longURL = urlDatabase[req.params.id].longURL;
  res.redirect(longURL);
});

// creates the short URL
app.post("/urls", (req, res) => {
  if (!req.session["user_id"]) {
    return res.status(401).send("You are not logged in to perform this action.\n");
  }

  const shortURL = generateRandomString();
  urlDatabase[shortURL] = {
    longURL: req.body.longURL,
    userID: req.session["user_id"]
  };

  res.redirect(`/urls/${shortURL}`);
});

// updates the long URL
app.post("/urls/:id", (req, res) => {
  if (!urlDatabase[req.params.id]) {
    return res.status(400).send("ID does not exist\n");
  }
  if (!req.session["user_id"]) {
    return res.status(401).send("You are not logged in to access this URL\n");
  }
  if (urlDatabase[req.params.id].userID !== req.session["user_id"]) {
    return res.status(401).send("You are unauthorized to access this URL\n");
  }

  urlDatabase[req.params.id].longURL = req.body.longURL;
  res.redirect(`/urls`);
});

// deletes the short URL
app.post("/urls/:id/delete", (req, res) => {
  if (!urlDatabase[req.params.id]) {
    return res.status(400).send("ID does not exist\n");
  }
  if (!req.session["user_id"]) {
    return res.status(401).send("You are not logged in to access this URL\n");
  }
  if (urlDatabase[req.params.id].userID !== req.session["user_id"]) {
    return res.status(401).send("You are unauthorized to access this URL\n");
  }

  delete urlDatabase[req.params.id];
  res.redirect(`/urls`);
});

// login page
app.get("/login", (req, res) => {
  if (req.session["user_id"]) {
    res.redirect(`/urls`);
  } else {
    const templateVars = {
      user_id: req.session["user_id"],
      users: users
    };

    res.render(`login`, templateVars);
  }
});

// register page
app.get("/register", (req, res) => {
  // if the cookie exists (user is logged in)
  if (req.session["user_id"]) {
    res.redirect(`/urls`);
  } else {
    const templateVars = {
      user_id: req.session["user_id"],
      users: users
    };
  
    res.render("register", templateVars);
  }
});

// logs the user in with a valid email and password
app.post("/login", (req, res) => {
  const user = getUserByEmail(req.body.email, users);

  if (!user) {
    return res.status(403).send("Email cannot be found");
  }
  if (!bcrypt.compareSync(req.body.password, user.password)) {
    return res.status(403).send("Incorrect password");
  }

  req.session["user_id"] = user.id;
  res.redirect(`/urls`);
});

// registers the user with an email and hashed password
app.post("/register", (req, res) => {
  if (req.body.email.length === 0 || req.body.password.length === 0) {
    return res.status(400).send("The email and/or password fields are empty");
  }
  if (getUserByEmail(req.body.email, users)) {
    return res.status(400).send("The email already exists");
  }

  const id = generateRandomString();
  req.session["user_id"] = id;
  
  const hashedPassword = bcrypt.hashSync(req.body.password, 10);

  users[id] = {
    id: id,
    email: req.body.email,
    password: hashedPassword
  };
  
  res.redirect("/urls");
});

// logs user out and deletes cookie
app.post("/logout", (req, res) => {
  req.session = null;
  res.redirect(`/login`);
});