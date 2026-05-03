import { createCatalogService } from "./catalog.service.js";

export const createCatalogController = (deps) => {
  const service = createCatalogService(deps);

  const listGenres = async (_req, res) => {
    try {
      const genres = await service.listGenres();
      res.json({ success: true, genres });
    } catch (err) {
      console.error("[CATALOG GENRES] Error:", err.message);
      res.status(err.statusCode || 500).json({
        success: false,
        error: err.message || "Khong the tai danh sach the loai.",
      });
    }
  };

  const listYears = async (_req, res) => {
    try {
      const years = await service.listYears();
      res.json({ success: true, years });
    } catch (err) {
      console.error("[CATALOG YEARS] Error:", err.message);
      res.status(err.statusCode || 500).json({
        success: false,
        error: err.message || "Khong the tai danh sach nam phat hanh.",
      });
    }
  };

  return {
    listGenres,
    listYears,
  };
};
