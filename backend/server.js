require("dotenv").config({

})
const { PUBLIC_DATA } = require("./constant");
const app = require("./src/app");
const { ConnectDB } = require("./src/config/db.config");

const isElectron = process.env.ELECTRON_MODE === "true"
const HOST = isElectron ? "127.0.0.1" : "0.0.0.0"

const startServer = async () => {
    try {
        await ConnectDB()
        const server = app.listen(PUBLIC_DATA.port, HOST, () => {
            console.log(`the app is listen at http://${HOST}:${PUBLIC_DATA.port}`);

            // Notify Electron main process that backend is ready
            if (isElectron && typeof process.send === "function") {
                process.send({ type: "backend-ready", port: PUBLIC_DATA.port })
            }
        })

        // Graceful shutdown for Electron
        const graceful = () => {
            console.log("Backend shutting down gracefully...")
            server.close(() => {
                process.exit(0)
            })
            // Force exit after 5s
            setTimeout(() => process.exit(1), 5000)
        }

        process.on("SIGTERM", graceful)
        process.on("SIGINT", graceful)

    } catch (error) {
        console.error("Failed to start server:", error);
        process.exit(1);
    }
}

startServer();