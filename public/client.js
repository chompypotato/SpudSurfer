const socket = io()
const term = new Terminal()

term.open(document.getElementById("terminal"))

const newSessionButton = document.getElementById("new-session")
newSessionButton.addEventListener("click", () => {
  socket.emit("create_session")
})

socket.on("session_created", (sessionId) => {
  console.log(`New SpudSurfer session created: ${sessionId}`)
  term.write(`\r\nConnected to new SpudSurfer session: ${sessionId}\r\n`)
})

socket.on("terminal_output", (data) => {
  term.write(data)
})

term.onData((data) => {
  socket.emit("terminal_input", data)
})

socket.on("error", (message) => {
  term.write(`\r\nError: ${message}\r\n`)
})

