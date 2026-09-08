const axios = require('axios');

class InventoryClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.http = axios.create({ baseURL: baseUrl });
  }

  async checkInventory(shoeConfig) {
    const response = await this.http.post('/v1/inventory/check', shoeConfig);
    return response.data;
  }

  async getMaterials() {
    const response = await this.http.get('/v1/materials');
    return response.data;
  }

  async getMaterial(materialId) {
    const response = await this.http.get(`/v1/materials/${materialId}`);
    return response.data;
  }
}

module.exports = { InventoryClient };
