module.exports = {
  apps: [

    {
      name  : "interview-client-frontend",
      script: "./serve-admin.js",
      env   : {
        PROD: "1",
      }
    }
  ]
};
