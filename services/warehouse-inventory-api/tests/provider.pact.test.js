const { Verifier } = require('@pact-foundation/pact');
const app = require('../src/app');
const http = require('http');

describe('Warehouse Inventory API - Provider Pact Verification', () => {
  let server;
  let port;

  beforeAll((done) => {
    server = http.createServer(app);
    server.listen(0, () => {
      port = server.address().port;
      done();
    });
  });

  afterAll((done) => server.close(done));

  it('validates the pacts from PactFlow', async () => {
    const verifier = new Verifier({
      provider: 'warehouse-inventory-api',
      providerBaseUrl: `http://localhost:${port}`,

      pactBrokerUrl: process.env.PACT_BROKER_BASE_URL,
      pactBrokerToken: process.env.PACT_BROKER_TOKEN,

      publishVerificationResults: true,
      providerVersion: process.env.GITHUB_SHA || process.env.GIT_COMMIT,
      providerVersionBranch: process.env.GITHUB_REF_NAME || process.env.GIT_BRANCH || 'main',

      consumerVersionSelectors: [
        { mainBranch: true },
        { matchingBranch: true },
        { deployedOrReleased: true },
      ],
      enablePending: true,

      stateHandlers: {
        'LEATHER uppers, RUBBER soles, and all requested colors are in stock': async () => {
          // LEATHER and RUBBER are always in stock in app.js — no dynamic seeding needed
        },
        'SUEDE uppers are out of stock': async () => {
          // SUEDE is always out of stock in app.js — no dynamic seeding needed
        },
        'the shoe configuration is invalid': async () => {},
        'the materials catalogue is populated': async () => {},
        'material mat-leather-white exists': async () => {},
        'material mat-unknown does not exist': async () => {},
      },
    });

    await verifier.verifyProvider();
  });
});
