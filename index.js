const getPlaygroundHtml = require('react-cosmos/lib/server/playground-html').default;
const launchEditor = require('react-dev-utils/launchEditor');
const webpack = require('webpack');
const start = require('neutrino/src/start');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const express = require('express');
const merge = require('deepmerge');
const { join, resolve } = require('path');

const MODULES = join(__dirname, 'node_modules');

module.exports = (neutrino, opts = {}) => {
  const cosmosConfig = merge({
    webpackConfigPath: '.neutrinorc.js',
    rootPath: neutrino.options.root,
    hot: true,
    port: 8989,
  }, opts || {});

  neutrino.register('cosmos', () => {
    neutrino.config.entry('cosmos')
      .clear()
      .merge([...(cosmosConfig.globalImports || [])])
      .add(require.resolve('react-cosmos/lib/client/loader-entry'));

    neutrino.config
      .plugin('cosmos-html')
      .use(HtmlWebpackPlugin, [{
        filename: 'cosmos.html',
        chunks: ['runtime', 'cosmos'],
      }]);

    neutrino.config
      .plugin('cosmos-define')
      .use(webpack.DefinePlugin, [{
        COSMOS_CONFIG: JSON.stringify({
          containerQuerySelector: cosmosConfig.containerQuerySelector,
        }),
      }]);

    neutrino.config.output
      .path('/loader/')
      .filename('[name].js')
      .publicPath('/loader/');
    neutrino.config.module
      .rule('cosmos-embed-modules')
      .include
        .add(require.resolve('react-cosmos/lib/client/user-modules'))
        .end()
      .use('embed-modules')
        .loader(require.resolve('react-cosmos/lib/server/embed-modules-webpack-loader'));

    neutrino.config.devServer
      .port(cosmosConfig.port)
      .historyApiFallback(false)
      .set('before', app => {
        const playgroundHtml = getPlaygroundHtml(cosmosConfig);

        app.use('/src', express.static(neutrino.options.source));

        app.get('/loader/index.html', (req, res) => {
          return res.redirect('/cosmos.html');
        });

        app.get('/loader/runtime.js', (req, res) => {
          return res.redirect('/runtime.js');
        });

        app.get('/loader/cosmos.js', (req, res) => {
          return res.redirect('/cosmos.js');
        });

        app.get('/loader/cosmos.css', (req, res) => {
          return res.redirect('/cosmos.css');
        });

        app.get('/', (req, res) => {
          res.send(playgroundHtml);
        });

        app.get('/bundle.js', (req, res) => {
          res.sendFile(require.resolve('react-cosmos-playground'));
        });

        app.get('/favicon.ico', (req, res) => {
          res.sendFile(resolve(
            require.resolve('react-cosmos/lib/server/server.js'),
            '../static/favicon.ico'
          ));
        });

        app.get('/__open-stack-frame-in-editor', (req, res) => {
          launchEditor(req.query.fileName, req.query.lineNumber);
          res.end();
        });
      });

    return start(neutrino.config.toConfig(), neutrino)
      .map(output => null);
  });

  neutrino.config.resolve.modules.add(MODULES);
  neutrino.config.resolveLoader.modules.add(MODULES);
};
