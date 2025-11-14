## Security hardening checklist (Kong-only)

### 1. Rate limiting & brute-force mitigation
- Start the stack: `docker compose up -d` (run `docker compose run --rm kong kong migrations bootstrap` the very first time).
- Apply the declarative config:  
  ```bash
  docker run --rm -v "${PWD}:/workspace" -w /workspace \
    kong/deck:latest gateway sync --kong-addr http://host.docker.internal:8001 kong.yml
  ```
- `kong.yml` already enforces `key-auth` + `rate-limiting` (5 req/min, 60 req/hour) for every `/api` call, especially `/api/auth/login`. Test via:
  ```bash
  curl -X POST http://localhost:8000/api/auth/login \
    -H 'Content-Type: application/json' \
    -H 'apikey: local-demo-key' \
    -d '{"identifier":"demo","password":"wrong"}'
  ```
  Send 6 requests within a minute → expect HTTP 429.

### 2. API key hygiene
- Keep only placeholders in `backend/.env.example`. Real secrets and Kong API keys live in env vars, vaults, or Docker secrets.
- Never commit `backend/.env`; confirm with `git status --ignored`.
- Rotate leaked keys by removing the consumer or credential via:
  ```bash
  curl -X DELETE http://localhost:8001/consumers/local-tester/key-auth/<credential-id>
  ```
  then issue a new key and share securely with clients.

### 3. Monitoring & alerting
- Stream Kong container logs (`docker compose logs -f kong`) to your logging stack. Alert on repeated 401/403/429 for the same IP/API key.
- Use the Admin API (`/status`, `/metrics` if enabled) to observe request rates and plugin counters.

### 4. Incident response
- If brute-force detected: disable the consumer, lower `rate-limiting` thresholds in `kong.yml`, sync, and investigate the account being targeted.
- For credential leakage: rotate API keys, invalidate affected backend secrets, and notify consumers about the new key distribution.

### 5. Automation & regression tests
- Keep a simple brute-force script (curl loop) in your test suite/CI to assert the gateway responds with 429 after 5 requests in under a minute.
- Add integration tests that verify missing/invalid `apikey` returns 401, ensuring key-auth is always enforced before hitting the backend.
