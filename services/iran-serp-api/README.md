# Iran SERP API

Google rank scraper for Iran. It runs Chromium with Playwright and exposes:

- `GET /health`
- `POST /search`

The service is independent from the main application. You can move this whole
directory to an Iranian VPS, build its Docker image, and keep the Vercel app
unchanged.

## API contract

Request:

```http
POST /search
Authorization: Bearer <SERVICE_SECRET>
Content-Type: application/json

{
  "query": "روف گاردن",
  "country": "ir",
  "language": "fa",
  "device": "desktop",
  "depth": 100
}
```

Response:

```json
{
  "search_metadata": { "status": "Success" },
  "search_information": { "total_results": 1200000 },
  "organic_results": [
    { "position": 1, "title": "...", "link": "https://example.com/page" }
  ],
  "serp_features": ["organic", "local"],
  "pages_used": 10
}
```

The main app routes only country `ir` to this contract. Other countries keep
using `SCRAPINGDOG_API_KEY`, with `SERPAPI_API_KEY` as its existing fallback.

Run it on a Docker host with an Iranian outbound IP (or set
`PLAYWRIGHT_PROXY_SERVER`). Configure these variables on the main app:

```env
IRAN_SERP_API_URL=https://your-service.example.com/search
IRAN_SERP_API_SECRET=the-same-value-as-SERVICE_SECRET
```

Service variables:

```env
SERVICE_SECRET=use-a-long-random-value
PLAYWRIGHT_PROXY_SERVER=http://proxy.example.com:8080
PLAYWRIGHT_PROXY_USERNAME=
PLAYWRIGHT_PROXY_PASSWORD=
```

Build and run:

```sh
docker build -t iran-serp-api .
docker run --rm -p 8080:8080 --env-file .env iran-serp-api
```

After pointing a domain with HTTPS to port `8080`, set `IRAN_SERP_API_URL` to
`https://that-domain.example/search`. Use the same random value for
`IRAN_SERP_API_SECRET` in Vercel and `SERVICE_SECRET` on the VPS.
