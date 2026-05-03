import { createDashboardAdminService } from "./dashboard.admin.service.js";

const requireAdminUser = async (req, getAdminUserFromRequest) => {
  const user = (await getAdminUserFromRequest(req)).user;
  if (!user) {
    return { error: { status: 401, body: { success: false, error: "ChÆ°a Ä‘Äƒng nháº­p" } } };
  }

  const profile = { role: "admin" };
  const profileError = null;

  if (profileError || profile?.role !== "admin") {
    return { error: { status: 403, body: { success: false, error: "Báº¡n khÃ´ng cÃ³ quyá»n truy cáº­p" } } };
  }

  return { user };
};

export const createDashboardAdminController = (deps) => {
  const service = createDashboardAdminService(deps);

  const getDashboardTest = async (_req, res) => {
    try {
      console.log("[TEST] Testing dashboard endpoint");
      const payload = await service.getDashboardTest();

      res.json({
        success: true,
        ...payload,
      });
    } catch (err) {
      console.error("[TEST] Error:", err.message);
      res.status(500).json({ success: false, error: err.message });
    }
  };

  const getDashboard = async (req, res) => {
    try {
      const auth = await requireAdminUser(req, deps.getAdminUserFromRequest);
      console.log("[ADMIN] Dashboard request from user:", auth.user?.id);

      if (auth.error) {
        return res.status(auth.error.status).json(auth.error.body);
      }

      const dashboard = await service.getDashboard();
      console.log("[ADMIN] Dashboard data retrieved successfully");

      res.json({
        success: true,
        stats: dashboard.stats,
        recentUsers: dashboard.recentUsers,
        recentSubscriptions: dashboard.recentSubscriptions,
      });
    } catch (err) {
      console.error("[ADMIN] Error:", err.message);
      res.status(err.statusCode || 500).json({ success: false, error: err.message });
    }
  };

  const getStats = async (req, res) => {
    try {
      const auth = await requireAdminUser(req, deps.getAdminUserFromRequest);
      if (auth.error) {
        return res.status(auth.error.status).json(auth.error.body);
      }

      const stats = await service.getStats();

      res.json({
        success: true,
        stats,
      });
    } catch (err) {
      console.error("[ADMIN STATS] Error:", err.message);
      res.status(err.statusCode || 500).json({ success: false, error: err.message });
    }
  };

  const getWatchStats = async (req, res) => {
    try {
      const auth = await requireAdminUser(req, deps.getAdminUserFromRequest);
      if (auth.error) {
        return res.status(auth.error.status).json(auth.error.body);
      }

      const data = await service.getWatchStats();

      res.json({
        success: true,
        watchStats: data.watchStats,
        summary: data.summary,
      });
    } catch (err) {
      console.error("[ADMIN WATCH STATS] Error:", err.message);
      res.status(err.statusCode || 500).json({ success: false, error: err.message });
    }
  };

  return {
    getDashboard,
    getDashboardTest,
    getStats,
    getWatchStats,
  };
};
