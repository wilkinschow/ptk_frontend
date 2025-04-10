const target = process.env.PROXY_URL || "https://rofyot5u21gsfg-8000.proxy.runpod.net/";

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
