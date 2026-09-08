const express = require('express');

const app = express();
app.use(express.json());

const VALID_UPPER_MATERIALS = ['LEATHER', 'MESH', 'SUEDE', 'CANVAS'];
const VALID_SOLE_TYPES = ['RUBBER', 'FOAM', 'LEATHER'];

const materials = {
  'mat-leather-white': {
    id: 'mat-leather-white',
    name: 'White Full-Grain Leather',
    type: 'UPPER',
    inStock: true,
    stockLevel: 'HIGH',
    availableColors: ['#FFFFFF', '#F5F5DC', '#FFFACD'],
  },
  'mat-leather-black': {
    id: 'mat-leather-black',
    name: 'Black Full-Grain Leather',
    type: 'UPPER',
    inStock: true,
    stockLevel: 'HIGH',
    availableColors: ['#000000', '#1C1C1C', '#2F2F2F'],
  },
  'mat-rubber-sole': {
    id: 'mat-rubber-sole',
    name: 'Black Vulcanized Rubber Sole',
    type: 'SOLE',
    inStock: true,
    stockLevel: 'MEDIUM',
    availableColors: ['#000000', '#FFFFFF'],
  },
  'mat-foam-sole': {
    id: 'mat-foam-sole',
    name: 'White EVA Foam Sole',
    type: 'SOLE',
    inStock: true,
    stockLevel: 'HIGH',
    availableColors: ['#FFFFFF', '#F0F0F0'],
  },
  'mat-suede-silver': {
    id: 'mat-suede-silver',
    name: 'Silver Suede Upper Panel',
    type: 'UPPER',
    inStock: false,
    stockLevel: 'LOW',
    availableColors: ['#C0C0C0', '#A9A9A9'],
  },
};

const stockByMaterialType = {
  LEATHER: { inStock: true, stockLevel: 'HIGH' },
  MESH: { inStock: true, stockLevel: 'MEDIUM' },
  SUEDE: { inStock: false, stockLevel: 'LOW' },
  CANVAS: { inStock: true, stockLevel: 'HIGH' },
  RUBBER: { inStock: true, stockLevel: 'MEDIUM' },
  FOAM: { inStock: true, stockLevel: 'HIGH' },
};

app.post('/v1/inventory/check', (req, res) => {
  const { size, upperMaterial, soleType, colorways } = req.body;

  if (!VALID_UPPER_MATERIALS.includes(upperMaterial)) {
    return res.status(422).json({
      code: 'INVALID_CONFIGURATION',
      message: `upperMaterial must be one of: ${VALID_UPPER_MATERIALS.join(', ')}`,
    });
  }

  if (!VALID_SOLE_TYPES.includes(soleType)) {
    return res.status(422).json({
      code: 'INVALID_CONFIGURATION',
      message: `soleType must be one of: ${VALID_SOLE_TYPES.join(', ')}`,
    });
  }

  const upperStock = stockByMaterialType[upperMaterial];
  const soleStock = stockByMaterialType[soleType];

  const missingMaterials = [];
  if (!upperStock.inStock) {
    missingMaterials.push({
      name: `${upperMaterial.charAt(0) + upperMaterial.slice(1).toLowerCase()} Upper Panel`,
      shortage: upperStock.stockLevel === 'LOW' ? 'LOW_STOCK' : 'OUT_OF_STOCK',
    });
  }
  if (!soleStock.inStock) {
    missingMaterials.push({
      name: `${soleType.charAt(0) + soleType.slice(1).toLowerCase()} Sole`,
      shortage: soleStock.stockLevel === 'LOW' ? 'LOW_STOCK' : 'OUT_OF_STOCK',
    });
  }

  if (missingMaterials.length > 0) {
    return res.json({ available: false, estimatedProductionDays: null, missingMaterials });
  }

  return res.json({
    available: true,
    estimatedProductionDays: 5,
    materials: [
      {
        name: upperMaterial === 'LEATHER' ? 'White Full-Grain Leather' : `${upperMaterial} Upper`,
        type: 'UPPER',
        stockLevel: upperStock.stockLevel,
      },
      {
        name: soleType === 'RUBBER' ? 'Black Vulcanized Rubber Sole' : `${soleType} Sole`,
        type: 'SOLE',
        stockLevel: soleStock.stockLevel,
      },
    ],
  });
});

app.get('/v1/materials', (req, res) => {
  res.json({
    materials: Object.values(materials).map(({ id, name, type, inStock }) => ({
      id,
      name,
      type,
      inStock,
    })),
  });
});

app.get('/v1/materials/:materialId', (req, res) => {
  const material = materials[req.params.materialId];
  if (!material) {
    return res.status(404).json({
      code: 'NOT_FOUND',
      message: `No material found with id: ${req.params.materialId}`,
    });
  }
  res.json(material);
});

module.exports = app;

if (require.main === module) {
  app.listen(3002, () => console.log('Warehouse Inventory API running on port 3002'));
}
