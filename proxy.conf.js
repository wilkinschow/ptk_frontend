const target = process.env.PROXY_URL || "https://2n97bwalcltto0-8000.proxy.runpod.net/";

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
