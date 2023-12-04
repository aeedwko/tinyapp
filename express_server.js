const express = require("express");
const cookieParser = require("cookie-parser");
const bcrypt = require("bcryptjs");
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
  b6UTxQ: {
    longURL: "https://www.tsn.ca",
    userID: "aJ48lW",
  },
  i3BoGr: {
    longURL: "https://www.google.ca",
    userID: "aJ48lW",
  },
  aaaa: {
    longURL: "test1",
    userID: "test",
  },
  bbbb: {
    longURL: "test2",
    userID: "test",
  }
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
  if (!req.cookies["user_id"]) {
    res.status(401).send("Please login or register to view this page.");
  } else {
    const templateVars = {
      user_id: req.cookies["user_id"],
      users: users,
      urls: urlsForUser(req.cookies["user_id"])
    };
    
    res.render("urls_index", templateVars);
  }
});

app.post("/urls", (req, res) => {
  console.log(req.body); // Log the POST request body to the console

  if (!req.cookies["user_id"]) {
    res.status(401).send("You are not logged in to perform this action.\n");
  } else {
    const shortURL = generateRandomString();
    urlDatabase[shortURL] = {
      longURL: req.body.longURL,
      userID: req.cookies["user_id"]
    };
    res.redirect(`/urls/${shortURL}`);
  }
});

app.get("/urls/new", (req, res) => {
  if (!req.cookies["user_id"]) {
    res.redirect(`/login`);
  } else {
    const templateVars = {
      user_id: req.cookies["user_id"],
      users: users
    };
  
    res.render("urls_new", templateVars);
  }
});

app.get("/urls/:id", (req, res) => {
  
  if (!req.cookies["user_id"]) {
    res.status(401).send("You are not logged in to access this URL");
  } else if (urlDatabase[req.params.id].userID !== req.cookies["user_id"]) {
    res.status(401).send("You are unauthorized to access this URL");
  } else {
    const templateVars = {
      user_id: req.cookies["user_id"],
      users: users,
      id: req.params.id,
      longURL: urlDatabase[req.params.id].longURL
    };
    res.render("urls_show", templateVars);
  }
});

app.post("/urls/:id", (req, res) => {
  if (!urlDatabase[req.params.id]) {
    res.status(400).send("ID does not exist\n");
  } else if (!req.cookies["user_id"]) {
    res.status(401).send("You are not logged in to access this URL\n");
  } else if (urlDatabase[req.params.id].userID !== req.cookies["user_id"]) {
    res.status(401).send("You are unauthorized to access this URL\n");
  } else {
    urlDatabase[req.params.id].longURL = req.body.longURL;
    res.redirect(`/urls`);
  }
});

app.post("/urls/:id/delete", (req, res) => {
  if (!urlDatabase[req.params.id]) {
    res.status(400).send("ID does not exist\n");
  } else if (!req.cookies["user_id"]) {
    res.status(401).send("You are not logged in to access this URL\n");
  } else if (urlDatabase[req.params.id].userID !== req.cookies["user_id"]) {
    res.status(401).send("You are unauthorized to access this URL\n");
  } else {
    delete urlDatabase[req.params.id];
    res.redirect(`/urls`);
  }
});

// redirects to the long URL
app.get("/u/:id", (req, res) => {
  if (urlDatabase[req.params.id]) {
    const longURL = urlDatabase[req.params.id].longURL;
    res.redirect(longURL);
  } else {
    res.status(400).send("id does not exist");
  }
});

app.get("/login", (req, res) => {
  // if the cookie exists (user is logged in)
  if (req.cookies["user_id"]) {
    res.redirect(`/urls`);
  } else {
    const templateVars = {
      user_id: req.cookies["user_id"],
      users: users
    };

    res.render(`login`, templateVars);
  }
});

app.post("/login", (req, res) => {
  const user = getUserByEmail(req.body.email);

  if (!user) {
    res.status(403).send("Email cannot be found");
  } else if (!bcrypt.compareSync(req.body.password, user.password)) {
    res.status(403).send("Incorrect password");
  } else {
    res.cookie("user_id", user.id);
    res.redirect(`/urls`);
  }
});

app.post("/logout", (req, res) => {
  res.clearCookie("user_id");
  res.redirect(`/login`);
});

app.get("/register", (req, res) => {
  // if the cookie exists (user is logged in)
  if (req.cookies["user_id"]) {
    res.redirect(`/urls`);
  } else {
    const templateVars = {
      user_id: req.cookies["user_id"],
      users: users
    };
  
    res.render("register", templateVars);
  }
});

app.post("/register", (req, res) => {
  if (req.body.email.length === 0 || req.body.password.length === 0) {
    res.status(400).send("At least one of the fields is empty");
  } else if (getUserByEmail(req.body.email)) {
    res.status(400).send("The email already exists");
  } else {
    const id = generateRandomString();
    res.cookie("user_id", id);
    
    const hashedPassword = bcrypt.hashSync(req.body.password, 10);
    console.log(hashedPassword);

    users[id] = {
      id: id,
      email: req.body.email,
      password: hashedPassword
    };
    
    res.redirect("/urls");
  }
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

// returns either the user object or null if not found
const getUserByEmail = (email) => {
  for (const user_id in users) {
    if (users[user_id].email === email) {
      return users[user_id];
    }
  }

  return null;
};

// returns the URLs where the userID is equal to the id of the currently logged-in user
const urlsForUser = (id) => {
  const urls = { };
  for (const url in urlDatabase) {
    if (urlDatabase[url].userID === id) {
      urls[url] = {
        longURL: urlDatabase[url].longURL,
        userID: urlDatabase[url].userID
      };
    }
  }

  return urls;
};