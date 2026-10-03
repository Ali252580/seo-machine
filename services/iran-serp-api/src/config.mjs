/** Runtime settings for the standalone Iranian browser service. */
export const config = {
  port: Number(process.env.PORT || 8080),
  serviceSecret: process.env.SERVICE_SECRET?.trim(),
  maxDepth: 100,
  proxy: process.env.PLAYWRIGHT_PROXY_SERVER
    ? {
        server: process.env.PLAYWRIGHT_PROXY_SERVER,
        username: process.env.PLAYWRIGHT_PROXY_USERNAME,
        password: process.env.PLAYWRIGHT_PROXY_PASSWORD,
      }
    : undefined,
};
