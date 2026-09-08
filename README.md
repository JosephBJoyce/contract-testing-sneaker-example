# Sneaker Studio — Pact Contract Testing Example

This repository demonstrates **Classic Consumer-Driven Contract Testing (CDC)** with Pact and PactFlow. The scenario: a custom sneaker storefront (the consumer) calls a warehouse inventory API (the provider) to check whether all the materials needed to build a bespoke shoe are in stock before confirming an order.

---

## The domain

A customer visits **Sneaker Studio** and designs their own shoe — choosing upper material, sole type, size, and colour zones. Before confirming, the storefront calls the **Warehouse Inventory API** to find out if the warehouse can fulfil the order. The contract between these two services is the focus of this repo.

```
Sneaker Studio Web          Warehouse Inventory API
       |                              |
       |-- POST /v1/inventory/check ->|  "Can you build these shoes?"
       |<- { available: true, ... } --|
       |                              |
       |-- GET /v1/materials -------> |  "What materials do you carry?"
       |<- { materials: [...] } ------|
       |                              |
       |-- GET /v1/materials/:id ---> |  "Tell me about this material"
       |<- { id, stockLevel, ... } --|
```

---

## Starting a PactFlow trial

PactFlow hosts contracts, runs verification, and provides the `can-i-deploy` deployment gate.

### Step 1 — Sign up

Go to [pactflow.io](https://pactflow.io) and start a trial. Choose a subdomain — this becomes your workspace URL:

```
https://your-org.pactflow.io
```

### Step 2 — Create an API token

Inside your PactFlow workspace:

1. Click your avatar → **Settings** → **API Tokens**
2. Click **Create token**, give it a name (e.g. `github-actions`)
3. Copy the token — you will only see it once

### Step 3 — Configure this repository

In your GitHub repository go to **Settings → Secrets and variables → Actions** and add:

| Type | Name | Value |
|---|---|---|
| **Variable** | `PACT_BROKER_BASE_URL` | `https://your-org.pactflow.io` |
| **Secret** | `PACT_BROKER_TOKEN` | *(the API token from Step 2)* |

The URL is a variable (not a secret) because it is not sensitive and showing it in workflow logs makes debugging easier.

### Step 4 — Run the one-time setup workflow

Go to **Actions → Setup PactFlow → Run workflow**. This creates the `production` and `staging` environments in PactFlow and registers both services as pacticipants. It only needs to run once.

### Step 5 — Trigger the pipelines

Run workflows in this order on first use:

1. **Consumer — Sneaker Studio Web** — generates and publishes the consumer pact
2. **Provider — Warehouse Inventory API** — fetches and verifies the pact against the real server

After the first run, workflows trigger automatically on push.

---

## How Classic CDC works here

The Sneaker Studio team writes Pact consumer tests that run against a Pact mock server. Those tests describe exactly what the storefront needs from the inventory API — which fields, which status codes, which error shapes. The tests produce a pact file (a JSON contract) that is published to PactFlow.

The Warehouse Inventory API team runs the Pact verifier against their real Express server before every deployment. If they rename a field or change a status code that the storefront depends on, verification fails and the deployment is blocked automatically.

```
Sneaker Studio Web        PactFlow            Warehouse Inventory API
       |                     |                          |
       |-- run pact tests -> |                          |
       |   (mock server)     |                          |
       |-- publish pact ---> |                          |
       |                     |<-- fetch pacts ----------|
       |                     |                          |-- verify against
       |                     |                          |   real server
       |                     |<-- publish results ------|
       |                     |                          |
       |<-- can-i-deploy? ---|                          |
       |                     |<-- can-i-deploy? --------|
```

---

## Interactions covered

| Method | Path | Scenario |
|---|---|---|
| `POST` | `/v1/inventory/check` | All materials available → 200 `available: true` |
| `POST` | `/v1/inventory/check` | Material out of stock → 200 `available: false` |
| `POST` | `/v1/inventory/check` | Invalid configuration → 422 |
| `GET` | `/v1/materials` | Full materials catalogue → 200 |
| `GET` | `/v1/materials/:materialId` | Known material detail → 200 |
| `GET` | `/v1/materials/:materialId` | Unknown material → 404 |

---

## Repository structure

```
.github/workflows/
  setup-pactflow.yml                  # One-time: create environments + pacticipants
  consumer-sneaker-studio.yml         # Consumer: test, publish pact, can-i-deploy
  provider-warehouse-inventory.yml    # Provider: verify pact, can-i-deploy

consumers/
  sneaker-studio-web/
    src/inventoryClient.js            # Axios HTTP client used by the storefront
    tests/consumer.pact.test.js       # Pact consumer tests (6 interactions)
    package.json

services/
  warehouse-inventory-api/
    src/app.js                        # Express server (provider implementation)
    tests/provider.pact.test.js       # Fetches + verifies pacts from PactFlow
    package.json
```

---

## Running locally

```bash
# Consumer tests — generates the pact file
cd consumers/sneaker-studio-web
npm install
npm test

# Provider verification — requires PACT_BROKER_BASE_URL and PACT_BROKER_TOKEN
cd services/warehouse-inventory-api
npm install
PACT_BROKER_BASE_URL=https://your-org.pactflow.io \
PACT_BROKER_TOKEN=your-token \
npm test

# Start the provider server standalone
npm start
```

---

## Technical notes

### Why no `Content-Type` header matchers?

The Pact FFI (the Rust core used in `@pact-foundation/pact` v13) panics when any matcher — `like()`, `regex()`, `eachLike()` — is applied to a `Content-Type` header. The fix is to omit `headers:` from `willRespondWith` entirely. The consumer test sets `Content-Type` on the request (which is safe), but assertions on response content type are omitted.

### Why `PACT_BROKER_BASE_URL` is a variable, not a secret

The workspace URL is not sensitive. Storing it as a GitHub Actions **variable** (`vars.PACT_BROKER_BASE_URL`) rather than a secret means it appears in workflow logs, making it easy to confirm which PactFlow workspace a run is targeting. Only the API token (`PACT_BROKER_TOKEN`) needs to be a secret.

### Provider state handlers

Each Pact interaction is prefixed with a `given(...)` provider state — a human-readable string describing the world the provider should be in when handling that request. The provider test maps each state string to a setup function via `stateHandlers`. In this example, stock levels are baked into the provider's in-memory store rather than being dynamically seeded, so the handlers are no-ops. In a production setup they would seed a test database.
