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
  "search_information": {},
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

## Validation and operational limits

- SERVICE_SECRET is mandatory; startup fails without it.
- Only Iran with Tehran targeting is supported. Other city locations receive HTTP 400 rather than silently being measured in Tehran.
- At most two searches run concurrently. Extra requests receive HTTP 429 with Retry-After: 30; there is no persistent queue.
- Page collection has a 40-second deadline. Blocked, unreadable, or repeated result pages fail with HTTP 503 instead of returning a successful ranking snapshot. Genuine empty results also fail conservatively because the parser cannot distinguish them reliably.
- Estimated total result counts are omitted. Parsed organic positions require live validation against Google; geolocation alone does not guarantee Iranian results.
- Deploy this service separately from the web application and validate it with your actual outbound IP. Unit tests do not verify Google HTML or proxy availability.
