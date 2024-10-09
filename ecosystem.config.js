module.exports = {
  apps: [
    {
      name: "publish-app",
      script: "./node_modules/.bin/ts-node", // Path to locally installed ts-node
      args: "-T ./examples/publish.ts",
      interpreter: "node",
      exec_mode: "fork",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
