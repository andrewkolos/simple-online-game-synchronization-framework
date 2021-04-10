module.exports = {
  entry: "./src/web-app/index.tsx",
  output: {
    filename: "bundle.js",
    path: __dirname + "/public"
  },

  // Enable sourcemaps for debugging webpack's output.
  devtool: "source-map",

  mode: 'development',

  resolve: {
    // Add '.ts' and '.tsx' as resolvable extensions.
    extensions: [".ts", ".tsx", ".js", ".json"]
  },

  module: {
    rules: [
      // All files with a '.ts' or '.tsx' extension will be handled by 'awesome-typescript-loader'.
      { test: /\.tsx?$/, loader: "awesome-typescript-loader" },
      // All output '.js' files will have any sourcemaps re-processed by 'source-map-loader'.
      { enforce: "pre", test: /\.js$/, loader: "source-map-loader" },

      { test: /\.s?css$/, use: ['style-loader', 'css-loader', 'sass-loader'] }
    ]
  },

  devServer: {
    contentBase: __dirname + "/public",
    historyApiFallback: { // Redirects all routes to index.html.
      index: 'index.html'
    }
  },
};