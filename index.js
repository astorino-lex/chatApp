//server side

//storing chat info
const supportedEmojis = [
  { txt: ":)", utf: "&#x1F601" },
  { txt: ":(", utf: "&#x1F641" },
  { txt: ":o", utf: "&#x1F632" },
  { txt: ":')", utf: "$#x1F602" },
  { txt: "<3", utf: "&#x1F49B" },
];
let userList = [];
let chatHistory = [];
let userCookie = null;
let colorCookie = null;

var cookieParser = require("cookie-parser");
var app = require("express")();
var http = require("http").createServer(app);
var io = require("socket.io")(http);
app.use(cookieParser());

//route files and obtain cookies
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
  userCookie = req.cookies.username;
  colorCookie = req.cookies.color;
});

app.get("/styles.css", function (req, res) {
  res.sendFile(__dirname + "/styles.css");
});

app.get("/script.js", function (req, res) {
  res.sendFile(__dirname + "/script.js");
});

app.get("/send-icon.png", function (req, res) {
  res.sendFile(__dirname + "/send-icon.png");
});

http.listen(3000, () => {
  console.log("listening on *:3000");
});

io.on("connection", (socket) => {
  //generate user name
  let user = "";

  //empty color to start
  let color = "";

  //if there is a username cookie and the username isnt taken, set username to cookie
  //if there is a color cookie, set the color to cookie
  if (userCookie && !userList.includes(userCookie)) {
    user = userCookie;
    color = colorCookie ? colorCookie : "";
  } else {
    user = `user${Math.floor(Math.random() * 300) + 100}`;
    if (userList.includes(user)) {
      //if random username has already been taken
      while (userList.includes(user)) {
        //generate a new user name until its not taken
        user = `user${Math.floor(Math.random() * 300) + 100}`;
      }
    }
  }
  userList.push(user);

  //send current username to connected socket
  socket.emit("current user", user);

  //send online users to everyone
  io.emit("user connected", userList);

  //send chat history to newly connected socket
  chatHistory.forEach((c) => {
    socket.emit("chat message", c);
  });

  socket.on("chat message", (msg) => {
    let nameRegex = /^\/name\s/;
    let colorRegex = /^\/color\s/;
    let hexRegex = /^[a-fA-F0-9]{6}$/;

    //intercept /name to change username
    if (msg.search(nameRegex) > -1) {
      let newUserName = msg.replace(nameRegex, "");

      //confirm not taken
      if (userList.includes(newUserName)) {
        socket.emit(
          "username change error",
          "That user name is already taken, please try again."
        );
      }
      //confirm nonempty
      else if (newUserName.trim().length === 0) {
        socket.emit(
          "username change error",
          "That user name is invalid, please try again."
        );
      } else {
        //replace any whitespace with _
        newUserName = newUserName.replace(" ", "_");

        //update user list
        userList = userList.filter((u) => u != user);
        userList.push(newUserName);

        //send updated username to connected socket
        socket.emit("current user", newUserName);

        //send updated online users to everyone
        io.emit("user connected", userList);

        //send username update event for html to everyone
        io.emit("username update", { newUserName, user });

        updateChatHistory(user, newUserName);

        user = newUserName;
      }
    }
    //intercept /color RRGGBB to change username
    else if (msg.search(colorRegex) > -1) {
      let newColor = msg.replace(colorRegex, "");

      //confirm hex format and nonempty
      if (newColor.trim().length === 0 || newColor.search(hexRegex) === -1) {
        socket.emit(
          "color change error",
          "That hex color code is invalid, please try again."
        );
      } else {
        newColor = `#${newColor}`;

        //send color update event for html to everyone
        io.emit("color update", { newColor, user });

        //send current color to connected socket
        socket.emit("current color", newColor);

        updateChatHistory(user, null, newColor);

        color = newColor;
      }
    } else {
      //generate timestamp
      let timestamp = new Date(Date.now()).toLocaleString(undefined, {
        month: "numeric",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      //check for emojis
      supportedEmojis.forEach((e) => {
        if (msg.includes(e.txt)) {
          msg = msg.replace(e.txt, e.utf);
        }
      });

      let mssgInfo = { msg, timestamp, user, color };

      //store chat history
      if (chatHistory.length == 200) {
        chatHistory.shift();
      }
      chatHistory.push(mssgInfo);

      //send chat message to everyone
      io.emit("chat message", mssgInfo);
    }
  });

  socket.on("disconnect", () => {
    //update user list
    userList = userList.filter((u) => u != user);

    //send updated online users to everyone
    io.emit("user connected", userList);
  });
});

function updateChatHistory(user, newUserName = null, newColor = null) {
  if (newUserName) {
    //find old username and replace with new
    chatHistory.forEach((c) => {
      if (c.user === user) {
        c.user = newUserName;
      }
    });
  }

  if (newColor) {
    //find old color and replace with new
    chatHistory.forEach((c) => {
      if (c.user === user) {
        c.color = newColor;
      }
    });
  }
}
