const rules = require('./webpack.rules');

// CSS rule
rules.push({
  test: /\.css$/i,
  use: ['style-loader', 'css-loader', 'postcss-loader'],
});


// Babel loader rule for JS/JSX
rules.push({
  test: /\.(js|jsx)$/,
  exclude: /node_modules/,
  use: {
    loader: 'babel-loader',
  },
});

module.exports = {
  // Your webpack config
  module: {
    rules,
  },
  resolve: {
    extensions: ['.js', '.jsx'],
  },
};
