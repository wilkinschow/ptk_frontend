// const target = process.env.PROXY_URL || "https://w97lrlc2wzwvxb-8000.proxy.runpod.net/";
const target = process.env.PROXY_URL || "http://localhost:4000/";

module.exports = {
  "/api": {
    target: target,
    secure: false,
    changeOrigin: true,
    pathRewrite: {
      "^/api": ""
    }
  }
};
