const express = require('express');
const axios   = require('axios');
const app     = express();

const PORT        = process.env.PORT        || 3002;
const CATALOG_URL = process.env.CATALOG_URL || 'http://localhost:3001';

app.use(express.json());

// ─── Registro de órdenes en memoria ──────────────────────────────────────────
const ordenes = [];

// ─── POST /api/ordenes ────────────────────────────────────────────────────────
app.post('/api/ordenes', async (req, res) => {
  const { libroId, cantidad, cliente } = req.body;

  // Validación básica de campos
  if (!libroId || !cantidad || !cliente) {
    return res.status(400).json({
      error: 'Faltan datos. Se requieren: libroId, cantidad y cliente.',
    });
  }

  try {
    // 1. Consultar al Servicio de Catálogo
    const { data: libro } = await axios.get(`${CATALOG_URL}/api/libros/${libroId}`);

    // 2. ⭐ RETO EXTRA — verificar stock suficiente
    if (libro.stock < cantidad) {
      return res.status(400).json({
        error: `Stock insuficiente. Disponible: ${libro.stock}, solicitado: ${cantidad}.`,
      });
    }

    // 3. Descontar el stock en el Catálogo
    await axios.patch(`${CATALOG_URL}/api/libros/${libroId}/stock`, { cantidad });

    // 4. Calcular total y guardar la orden
    const totalAPagar = parseFloat((libro.precio * cantidad).toFixed(2));

    const nuevaOrden = {
      id: ordenes.length + 1,
      cliente,
      libro: libro.titulo,
      autor: libro.autor,
      cantidad,
      precioUnitario: libro.precio,
      totalAPagar,
      stockRestante: libro.stock - cantidad,
      fecha: new Date().toISOString(),
    };

    ordenes.push(nuevaOrden);

    return res.status(201).json({
      mensaje: '✅ Orden creada exitosamente.',
      orden: nuevaOrden,
    });

  } catch (error) {
    // El Catálogo respondió 404 → libro no existe
    if (error.response && error.response.status === 404) {
      return res.status(404).json({
        error: `El libro con id ${libroId} no existe en el catálogo.`,
      });
    }

    // Cualquier otro fallo de comunicación
    return res.status(500).json({
      error: 'No se pudo comunicar con el Servicio de Catálogo. Intenta más tarde.',
    });
  }
});

// ─── Inicio del servidor ──────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🛒 Servicio de Órdenes corriendo en http://localhost:${PORT}`);
  console.log(`   Conectado al Catálogo en: ${CATALOG_URL}`);
});

module.exports = app; // necesario para Vercel (serverless)
