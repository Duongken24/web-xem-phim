export const registerRoutes = (app, routes = []) => {
  routes.forEach((route) => {
    app.use(route);
  });

  return app;
};
