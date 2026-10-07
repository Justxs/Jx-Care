/**
 * app.json is the app's config. Only the website demo build (scripts/build-web-demo.mjs, with
 * JX_WEB_DEMO=1) changes it: routes come from src/web-demo/routes instead of app/, and the web
 * export is one page served from a folder of the website.
 */
module.exports = ({ config }) => {
  if (process.env.JX_WEB_DEMO !== '1') return config;
  return {
    ...config,
    extra: { ...config.extra, router: { ...config.extra?.router, root: 'src/web-demo/routes' } },
    web: { ...config.web, output: 'single' },
    experiments: {
      ...config.experiments,
      typedRoutes: false,
      baseUrl: process.env.JX_WEB_DEMO_BASE_URL ?? '/demo',
    },
  };
};
