const path = require('path');

module.exports = {
  entry: "./src/web-app/index.tsx",
  output: {
    filename: "bundle.js",
    path: path.join(__dirname, "public")
  },

  // Enable sourcemaps for debugging webpack's output.
  devtool: "source-map",


  resolve: {
    // Add '.ts' and '.tsx' as resolvable extensions.
    extensions: [".ts", ".tsx", ".js", ".json"]
  },

  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: /(node_modules|\.webpack)/,
        use: {
          loader: 'ts-loader',
          options: {
            transpileOnly: true,
          },
        },
      },
      // All output '.js' files will have any sourcemaps re-processed by 'source-map-loader'.
      { enforce: "pre", test: /\.js$/, loader: "source-map-loader" },

      { test: /\.s?css$/, use: ['style-loader', 'css-loader'] }
    ]
  },
};