import { prisma } from '../config/db.js';

// Helper: sum all sizes from sizeStock object
function sumSizeStock(sizeStock) {
  if (!sizeStock || typeof sizeStock !== 'object') return null;
  return Object.values(sizeStock).reduce((acc, v) => acc + (parseInt(v) || 0), 0);
}

// @desc    Get all products
// @route   GET /api/v1/products
// @access  Public
export const getProducts = async (req, res) => {
  try {
    const products = await prisma.product.findMany();
    res.status(200).json({ success: true, count: products.length, data: products });
  } catch (err) {
    console.error('[GET PRODUCTS ERROR]', err);
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Get single product
// @route   GET /api/v1/products/:id
// @access  Public
export const getProduct = async (req, res) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id }
    });

    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    res.status(200).json({ success: true, data: product });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Create product (ADMIN ONLY)
// @route   POST /api/v1/products
// @access  Private/Admin
export const createProduct = async (req, res) => {
  try {
    const { name, description, price, category, stock, tag, sizeStock: rawSizeStock } = req.body;
    let imageUrls = [];
    const baseUrl = `${req.protocol}://${req.get('host')}`;

    // Handle up to 4 images
    if (req.files) {
      for (let i = 1; i <= 4; i++) {
        const fieldName = `image${i}`;
        if (req.files[fieldName]) {
          imageUrls.push(`${baseUrl}/uploads/${req.files[fieldName][0].filename}`);
        }
      }
    }

    // Parse sizeStock if provided (sent as JSON string in FormData)
    let sizeStock = null;
    let computedStock = parseInt(stock) || 0;
    if (rawSizeStock) {
      try {
        sizeStock = typeof rawSizeStock === 'string' ? JSON.parse(rawSizeStock) : rawSizeStock;
        // Auto-compute total stock as sum of all sizes
        const sum = sumSizeStock(sizeStock);
        if (sum !== null) computedStock = sum;
      } catch (_) { /* malformed — ignore */ }
    }

    const product = await prisma.product.create({
      data: {
        name,
        description,
        price: parseFloat(price),
        category,
        stock: computedStock,
        sizeStock,
        tag,
        images: imageUrls
      }
    });
    res.status(201).json({ success: true, data: product });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Update product (ADMIN ONLY)
// @route   PUT/PATCH /api/v1/products/:id
// @access  Private/Admin
export const updateProduct = async (req, res) => {
  try {
    const { name, description, price, category, stock, tag, sizeStock: rawSizeStock } = req.body;
    
    // Get existing product to handle partial image updates
    const currentProduct = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!currentProduct) return res.status(404).json({ success: false, error: 'Not found' });

    const updateData = {};
    if (name) updateData.name = name;
    if (description) updateData.description = description;
    if (price) updateData.price = parseFloat(price);
    if (category) updateData.category = category;
    if (tag) updateData.tag = tag;

    // Handle sizeStock
    if (rawSizeStock) {
      try {
        const sizeStock = typeof rawSizeStock === 'string' ? JSON.parse(rawSizeStock) : rawSizeStock;
        updateData.sizeStock = sizeStock;
        const sum = sumSizeStock(sizeStock);
        if (sum !== null) updateData.stock = sum;
      } catch (_) { /* malformed — ignore */ }
    } else if (stock !== undefined && stock !== '') {
      updateData.stock = parseInt(stock);
    }

    let imageUrls = [...currentProduct.images];
    const baseUrl = `${req.protocol}://${req.get('host')}`;

    if (req.files) {
      for (let i = 1; i <= 4; i++) {
        const fieldName = `image${i}`;
        if (req.files[fieldName]) {
          // Overwrite at index i-1 or push if new
          imageUrls[i - 1] = `${baseUrl}/uploads/${req.files[fieldName][0].filename}`;
        }
      }
    }

    updateData.images = imageUrls.filter(img => img !== null && img !== undefined);

    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: updateData
    });
    res.status(200).json({ success: true, data: product });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Delete product (ADMIN ONLY)
// @route   DELETE /api/v1/products/:id
// @access  Private/Admin
export const deleteProduct = async (req, res) => {
  try {
    await prisma.product.delete({
      where: { id: req.params.id }
    });
    res.status(200).json({ success: true, data: {} });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Update product stock only (ADMIN ONLY)
// @route   PATCH /api/v1/products/:id/stock
// @access  Private/Admin
export const updateStock = async (req, res) => {
  try {
    const { stock, sizeStock: rawSizeStock } = req.body;
    const updateData = {};

    if (rawSizeStock) {
      try {
        const sizeStock = typeof rawSizeStock === 'string' ? JSON.parse(rawSizeStock) : rawSizeStock;
        updateData.sizeStock = sizeStock;
        const sum = sumSizeStock(sizeStock);
        if (sum !== null) updateData.stock = sum;
      } catch (_) {
        return res.status(400).json({ success: false, error: 'Invalid sizeStock format' });
      }
    } else {
      if (stock === undefined || stock === null || isNaN(stock) || stock < 0) {
        return res.status(400).json({ success: false, error: 'Valid stock quantity required' });
      }
      updateData.stock = parseInt(stock);
    }

    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: updateData
    });

    res.status(200).json({ success: true, data: product });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

