module.exports = {
    apps: [
        {
            name: "wms-api",
            script: "server.js",
            instances: 1,
            autorestart: true,
            watch: false,
            max_memory_restart: "512M",
            env: {
                NODE_ENV: "production",
                PORT: 5000
            }
        },
        {
            name: "wms-sync-worker",
            script: "src/workers/sync.worker.js",
            instances: 1,
            autorestart: true,
            watch: false,
            max_memory_restart: "256M",
            env: {
                NODE_ENV: "production"
            }
        }
    ]
}
