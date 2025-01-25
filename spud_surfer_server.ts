import express from "express"
import { createServer } from "http"
import { Server } from "socket.io"
import Docker from "dockerode"
import { v4 as uuidv4 } from "uuid"

const app = express()
const httpServer = createServer(app)
const io = new Server(httpServer)
const docker = new Docker()

const activeSessions: { [key: string]: { containerId: string; socket: any } } = {}

app.use(express.static("public"))

io.on("connection", (socket) => {
  console.log("New client connected")

  socket.on("create_session", async () => {
    const sessionId = uuidv4()
    console.log(`Creating new session: ${sessionId}`)

    try {
      const container = await docker.createContainer({
        Image: "spudsurfer",
        Cmd: ["/bin/bash"],
        Tty: true,
        OpenStdin: true,
      })

      await container.start()

      const exec = await container.exec({
        Cmd: ["lynx"],
        AttachStdin: true,
        AttachStdout: true,
        AttachStderr: true,
        Tty: true,
      })

      const stream = await exec.start({ hijack: true, stdin: true })

      activeSessions[sessionId] = { containerId: container.id, socket }

      stream.on("data", (chunk) => {
        socket.emit("terminal_output", chunk.toString())
      })

      socket.on("terminal_input", (data) => {
        stream.write(data)
      })

      socket.emit("session_created", sessionId)
    } catch (error) {
      console.error("Error creating container:", error)
      socket.emit("error", "Failed to create browsing session")
    }
  })

  socket.on("disconnect", () => {
    console.log("Client disconnected")
    Object.entries(activeSessions).forEach(([sessionId, session]) => {
      if (session.socket === socket) {
        docker.getContainer(session.containerId).stop(() => {
          docker.getContainer(session.containerId).remove()
        })
        delete activeSessions[sessionId]
      }
    })
  })
})

const port = process.env.PORT || 3000

httpServer.listen(port, () => {
  console.log(`SpudSurfer server running on port ${port}`)
})

