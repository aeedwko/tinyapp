// require necessary modules
const express = require("express");
const cookieSession = require("cookie-session");
const bcrypt = require("bcryptjs");

// require helper functions
const { getUserByEmail, generateRandomString, urlsForUser } = require("./helpers");

// create express application
const app = express();
const PORT = 8080; // default port 8080

// two empty objects to store user and url data
const users = {};
const urlDatabase = {};

// set template engine to ejs
app.set("view engine", "ejs");

// listen for connections on PORT
app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}!`);
});

// middleware for parsing request body
app.use(express.urlencoded({ extended: true }));

// middleware for adding a session property to the req object
// keys property used for signing and verifying cookie values
// maxAge specifies when the cookie expires
app.use(cookieSession({
  name: 'session',
  keys: ["Intestine", "Stomach"],
  maxAge: 24 * 60 * 60 * 1000 // 24 hours
}));

// handles root path to redirect user
app.get("/", (req, res) => {
  !req.session["user_id"] ? res.redirect(`/login`) : res.redirect(`/urls`);
});

// shows list of the URLs the user has created
// returns error message if not logged in
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

// renders page for creating new short url
// redirects user to login page if not logged in
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

// renders page for editing long url
// returns appropriate error message if url's id doesn't exist, user not logged in, or if user doesn't own the url's id
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

// redirects user to long url
// returns error message if url id doesn't exist
app.get("/u/:id", (req, res) => {
  if (!urlDatabase[req.params.id]) {
    return res.status(400).send("The URL for the given ID does not exist.\n");
  }

  const longURL = urlDatabase[req.params.id].longURL;
  const lowerCaseLongURL = longURL.toLowerCase();

  // prepend http:// to the long url so express knows it is an external url and not a relative path
  if (lowerCaseLongURL.substring(0,7) === "http://" || lowerCaseLongURL.substring(0,8) === "https://") {
    res.redirect(longURL);
  } else {
    res.redirect("http://" + longURL);
  }
});

// creates short url with generateRandomString helper function
// redirects user to short url path
// returns error message if user not logged in
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

// updates the long url and redirects to /urls path
// returns appropriate error message if url's id doesn't exist, user not logged in, or if user doesn't own the url's id
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

// deletes the short url and redirects to /urls path
// returns appropriate error message if url's id doesn't exist, user not logged in, or if user doesn't own the url's id
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

// renders login page
// redirects user to /urls path if already logged in
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

// renders register page
// redirects user to /urls path if already logged in
app.get("/register", (req, res) => {
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

// redirects to /urls path with a valid email and password
// returns appropriate error message if email or password is incorrect
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

// registers the user with an email and hashed password and redirects to /urls path
// returns appropriate error message if missing field or if email already exists
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
// redirects to login path
app.post("/logout", (req, res) => {
  req.session = null;
  res.redirect(`/login`);
});