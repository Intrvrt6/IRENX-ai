const path = require("path");

/**
 * Compatibility build for environments that invoke webpack automatically.
 * Production IRENX deployment remains Wrangler/Cloudflare-native; this bundle
 * is only a deterministic build artifact and does not replace worker/index.ts.
 */
module.exports = {
  mode: "production",
  target: "web",
  entry: path.resolve(__dirname, "build/webpack-entry.js"),
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "irenx-build.js",
    clean: true,
  },
  devtool: false,
  optimization: {
    minimize: true,
  },
};
