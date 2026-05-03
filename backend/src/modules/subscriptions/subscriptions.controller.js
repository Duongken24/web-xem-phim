import { createSubscriptionsService } from "./subscriptions.service.js";

export const createSubscriptionsController = (deps) => {
  const service = createSubscriptionsService(deps);

  const listPlans = async (_req, res) => {
    try {
      const plans = await service.listPlans();

      res.json({
        success: true,
        plans,
      });
    } catch (err) {
      console.error("[PUBLIC SUBSCRIPTION PLANS] Error:", err.message);
      res.status(err.statusCode || 500).json({
        success: false,
        error: err.message || "Khong the tai danh sach goi dang ky.",
      });
    }
  };

  const getCurrentSubscription = async (req, res) => {
    try {
      const user = await deps.getUserFromToken(req);
      if (!user) {
        return res.status(401).json({ success: false, error: "Chua dang nhap" });
      }

      const subscription = await service.getCurrentSubscription(user.id);

      res.json({
        success: true,
        ...subscription,
      });
    } catch (err) {
      console.error("[CURRENT SUBSCRIPTION] Error:", err.message);
      res.status(err.statusCode || 500).json({
        success: false,
        error: err.message || "Khong the tai thong tin goi dang ky hien tai.",
      });
    }
  };

  return {
    getCurrentSubscription,
    listPlans,
  };
};
