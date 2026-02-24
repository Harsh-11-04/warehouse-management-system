require("dotenv").config({

})
const { PUBLIC_DATA } = require("./constant");
const app = require("./src/app");
const { ConnectDB } = require("./src/config/db.config");
const startServer = async () => {
    try {
        await ConnectDB()
        app.listen(PUBLIC_DATA.port, () => {
            console.log(`the app is listen at http://localhost:${PUBLIC_DATA.port}`);
        })
    } catch (error) {
        console.error("Failed to start server:", error);
        process.exit(1);
    }
}

startServer();


// --views