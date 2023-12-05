// returns either the user object or null if not found in database
const getUserByEmail = (email, database) => {
  for (const user_id in database) {
    if (database[user_id].email === email) {
      return database[user_id];
    }
  }

  return undefined;
};

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

// returns the URLs where the userID is equal to the id of the currently logged-in user
const urlsForUser = (id, database) => {
  const urls = { };
  for (const url in database) {
    if (database[url].userID === id) {
      urls[url] = {
        longURL: database[url].longURL,
        userID: database[url].userID
      };
    }
  }

  return urls;
};

module.exports = { getUserByEmail, generateRandomString, urlsForUser };