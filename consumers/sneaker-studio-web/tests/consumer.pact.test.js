const { PactV3, MatchersV3 } = require('@pact-foundation/pact');
const { InventoryClient } = require('../src/inventoryClient');
const path = require('path');

const { like, regex, eachLike, integer } = MatchersV3;

const provider = new PactV3({
  consumer: 'sneaker-studio-web',
  provider: 'warehouse-inventory-api',
  dir: path.resolve(__dirname, '../pacts'),
});

const validShoeConfig = {
  size: 'US-10',
  upperMaterial: 'LEATHER',
  soleType: 'RUBBER',
  colorways: [
    { zone: 'TOE_BOX', color: '#FFFFFF' },
    { zone: 'HEEL', color: '#000000' },
    { zone: 'TONGUE', color: '#FF0000' },
    { zone: 'LACES', color: '#FFFFFF' },
  ],
};

const unavailableShoeConfig = {
  size: 'US-12',
  upperMaterial: 'SUEDE',
  soleType: 'FOAM',
  colorways: [
    { zone: 'TOE_BOX', color: '#C0C0C0' },
    { zone: 'HEEL', color: '#C0C0C0' },
    { zone: 'TONGUE', color: '#C0C0C0' },
    { zone: 'LACES', color: '#000000' },
  ],
};

describe('Warehouse Inventory API - Consumer Pact Tests', () => {
  describe('POST /v1/inventory/check', () => {
    it('returns available when the warehouse has all materials in stock', async () => {
      await provider
        .given('LEATHER uppers, RUBBER soles, and all requested colors are in stock')
        .uponReceiving('a request to check inventory for a leather and rubber custom sneaker')
        .withRequest({
          method: 'POST',
          path: '/v1/inventory/check',
          headers: { 'Content-Type': 'application/json' },
          body: validShoeConfig,
        })
        .willRespondWith({
          status: 200,
          body: {
            available: true,
            estimatedProductionDays: integer(5),
            materials: eachLike({
              name: like('White Full-Grain Leather'),
              type: like('UPPER'),
              stockLevel: regex('^(HIGH|MEDIUM|LOW)$', 'HIGH'),
            }),
          },
        })
        .executeTest(async (mockServer) => {
          const client = new InventoryClient(mockServer.url);
          const result = await client.checkInventory(validShoeConfig);
          expect(result.available).toBe(true);
          expect(result.estimatedProductionDays).toBeGreaterThan(0);
          expect(result.materials.length).toBeGreaterThan(0);
        });
    });

    it('returns not available when the warehouse is missing requested materials', async () => {
      await provider
        .given('SUEDE uppers are out of stock')
        .uponReceiving('a request to check inventory for a suede custom sneaker')
        .withRequest({
          method: 'POST',
          path: '/v1/inventory/check',
          headers: { 'Content-Type': 'application/json' },
          body: unavailableShoeConfig,
        })
        .willRespondWith({
          status: 200,
          body: {
            available: false,
            estimatedProductionDays: null,
            missingMaterials: eachLike({
              name: like('Silver Suede Upper Panel'),
              shortage: regex('^(LOW_STOCK|OUT_OF_STOCK)$', 'OUT_OF_STOCK'),
            }),
          },
        })
        .executeTest(async (mockServer) => {
          const client = new InventoryClient(mockServer.url);
          const result = await client.checkInventory(unavailableShoeConfig);
          expect(result.available).toBe(false);
          expect(result.estimatedProductionDays).toBeNull();
          expect(result.missingMaterials.length).toBeGreaterThan(0);
        });
    });

    it('returns 422 when the shoe configuration is invalid', async () => {
      await provider
        .given('the shoe configuration is invalid')
        .uponReceiving('a request with an unrecognised upper material')
        .withRequest({
          method: 'POST',
          path: '/v1/inventory/check',
          headers: { 'Content-Type': 'application/json' },
          body: {
            size: 'US-10',
            upperMaterial: 'UNOBTAINIUM',
            soleType: 'RUBBER',
            colorways: [],
          },
        })
        .willRespondWith({
          status: 422,
          body: {
            code: like('INVALID_CONFIGURATION'),
            message: like('upperMaterial must be one of: LEATHER, MESH, SUEDE, CANVAS'),
          },
        })
        .executeTest(async (mockServer) => {
          const client = new InventoryClient(mockServer.url);
          await expect(client.checkInventory({
            size: 'US-10',
            upperMaterial: 'UNOBTAINIUM',
            soleType: 'RUBBER',
            colorways: [],
          })).rejects.toThrow();
        });
    });
  });

  describe('GET /v1/materials', () => {
    it('returns the full catalogue of available materials', async () => {
      await provider
        .given('the materials catalogue is populated')
        .uponReceiving('a request for the materials catalogue')
        .withRequest({
          method: 'GET',
          path: '/v1/materials',
        })
        .willRespondWith({
          status: 200,
          body: {
            materials: eachLike({
              id: like('mat-leather-white'),
              name: like('White Full-Grain Leather'),
              type: regex('^(UPPER|SOLE|LINING)$', 'UPPER'),
              inStock: like(true),
            }),
          },
        })
        .executeTest(async (mockServer) => {
          const client = new InventoryClient(mockServer.url);
          const result = await client.getMaterials();
          expect(result.materials.length).toBeGreaterThan(0);
          expect(result.materials[0].id).toBeTruthy();
          expect(result.materials[0].name).toBeTruthy();
        });
    });
  });

  describe('GET /v1/materials/:materialId', () => {
    it('returns detailed information for a known material', async () => {
      await provider
        .given('material mat-leather-white exists')
        .uponReceiving('a request for details on a specific material')
        .withRequest({
          method: 'GET',
          path: '/v1/materials/mat-leather-white',
        })
        .willRespondWith({
          status: 200,
          body: {
            id: like('mat-leather-white'),
            name: like('White Full-Grain Leather'),
            type: like('UPPER'),
            inStock: like(true),
            stockLevel: regex('^(HIGH|MEDIUM|LOW)$', 'HIGH'),
            availableColors: eachLike(like('#FFFFFF')),
          },
        })
        .executeTest(async (mockServer) => {
          const client = new InventoryClient(mockServer.url);
          const result = await client.getMaterial('mat-leather-white');
          expect(result.id).toBeTruthy();
          expect(result.stockLevel).toBeTruthy();
          expect(result.availableColors.length).toBeGreaterThan(0);
        });
    });

    it('returns 404 when the material does not exist in the catalogue', async () => {
      await provider
        .given('material mat-unknown does not exist')
        .uponReceiving('a request for a material that does not exist')
        .withRequest({
          method: 'GET',
          path: '/v1/materials/mat-unknown',
        })
        .willRespondWith({
          status: 404,
          body: {
            code: like('NOT_FOUND'),
            message: like('No material found with id: mat-unknown'),
          },
        })
        .executeTest(async (mockServer) => {
          const client = new InventoryClient(mockServer.url);
          await expect(client.getMaterial('mat-unknown')).rejects.toThrow();
        });
    });
  });
});
