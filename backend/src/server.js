export const startServer = (app, port, onListen) => {
  return app.listen(port, onListen);
};

