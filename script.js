//client side

//store current user info
let currentUser = "";

$(function () {
  var socket = io();

  // send chat message event to socket on submit
  $("form").submit(function (e) {
    e.preventDefault(); // prevents page reloading
    socket.emit("chat message", $("#m").val());
    $("#m").val("");
    return false;
  });

  //update username cookie and current socket user
  socket.on("current user", function (user) {
    currentUser = user;
    document.cookie = `username=${currentUser};max-age=${60 * 60};`;
  });

  //update online users list whenever user connects/disconnects
  socket.on("user connected", function (users) {
    $("#users").empty();
    $("#users").append(
      `<div style="font-weight:bold;" class="${currentUser}">${currentUser} (You)</div>`
    );
    users.forEach((u) => {
      if (u !== currentUser) {
        $("#users").append(`<div class="${u}">${u}</div>`);
      }
    });
  });

  socket.on("chat message", function (info) {
    //scroll to bottom of chat div containing messages
    $("#messages").scrollTop($("#messages").height());

    let timestamp = info.timestamp.replace(",", "").toLowerCase();

    //create html for chat item
    let messageHtml = constructChatItem(
      info.user,
      timestamp,
      info.msg,
      info.color
    );

    //prepend to maintain bottom up chat
    $("#messages").prepend(messageHtml);
  });

  //alert username change errors on event
  socket.on("username change error", function (message) {
    window.alert(message);
  });

  //on successful username change, update html
  socket.on("username update", function (update) {
    $(`.${update.user}`).each(function () {
      this.innerText = update.newUserName;
      $(this).addClass(update.newUserName).removeClass(update.user);
      $(this)
        .addClass(`${update.newUserName}-color`)
        .removeClass(`${update.user}-color`);
    });
  });

  //alert color change errors on event
  socket.on("color change error", function (message) {
    window.alert(message);
  });

  //on successful color change, update html
  socket.on("color update", function (update) {
    $(`.${update.user}-color`).each(function () {
      this.style.color = update.newColor;
    });
  });

  socket.on("current color", function (newColor) {
    document.cookie = `color=${newColor};max-age=${60 * 60};`;
  });
});

function constructChatItem(user, time, msg, color) {
  if (currentUser === user) {
    return `<div class="chat-item">
              <div class="content-wrapper c-you">
                  <div style="background-color:#2facf5;"
                       class="message m-you">${msg}</div>
                  <div class="user-wrapper">
                      <span style="color:${color};" class="user ${user} ${user}-color u-you">${user}</span>
                      <span>${time}</span>
                  </div>
              </div>
            </div>`;
  } else {
    return `<div class="chat-item">
              <div class="content-wrapper">
                  <div class="user-wrapper">
                      <span style="color:${color};" class="user ${user} ${user}-color">${user}</span>
                      <span>${time}</span>
                  </div>
                  <div class="message">${msg}</div>
              </div>
            </div>`;
  }
}
