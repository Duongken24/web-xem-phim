import { createPlansAdminService } from "./plans.admin.service.js";

const requireAdminUser = async (req, getAdminUserFromRequest) => {
  const user = (await getAdminUserFromRequest(req)).user;
  if (!user) {
    return { error: { status: 401, body: { success: false, error: "ChÆ°a Ä‘Äƒng nháº­p" } } };
  }

  const profile = { role: "admin" };

  if (profile?.role !== "admin") {
    return { error: { status: 403, body: { success: false, error: "Báº¡n khÃ´ng cÃ³ quyá»n truy cáº­p" } } };
  }

  return { user };
};

export const createPlansAdminController = (deps) => {
  const service = createPlansAdminService(deps);

  const listPlans = async (req, res) => {
    try {
      const auth = await requireAdminUser(req, deps.getAdminUserFromRequest);
      if (auth.error) return res.status(auth.error.status).json(auth.error.body);

      const plans = await service.listPlans();
      res.json({ success: true, plans });
    } catch (err) {
      console.error("[ADMIN PLANS] Error:", err.message);
      res.status(err.statusCode || 500).json({ success: false, error: err.message });
    }
  };

  const listSubscriptions = async (req, res) => {
    try {
      const auth = await requireAdminUser(req, deps.getAdminUserFromRequest);
      if (auth.error) return res.status(auth.error.status).json(auth.error.body);

      const subscriptions = await service.listSubscriptions();
      res.json({ success: true, subscriptions });
    } catch (err) {
      console.error("[ADMIN SUBSCRIPTIONS] Error:", err.message);
      res.status(err.statusCode || 500).json({ success: false, error: err.message });
    }
  };

  const createPlan = async (req, res) => {
    try {
      const auth = await requireAdminUser(req, deps.getAdminUserFromRequest);
      if (auth.error) return res.status(auth.error.status).json(auth.error.body);

      const plan = await service.createPlan(req.body);
      res.json({ success: true, plan });
    } catch (err) {
      console.error("[CREATE PLAN] Error:", err.message);
      res.status(err.statusCode || 500).json({ success: false, error: err.message });
    }
  };

  const updatePlan = async (req, res) => {
    try {
      const auth = await requireAdminUser(req, deps.getAdminUserFromRequest);
      if (auth.error) return res.status(auth.error.status).json(auth.error.body);

      const plan = await service.updatePlan(req.params.planId, req.body);
      res.json({ success: true, plan });
    } catch (err) {
      console.error("[UPDATE PLAN] Error:", err.message);
      res.status(err.statusCode || 500).json({ success: false, error: err.message });
    }
  };

  const assignSubscription = async (req, res) => {
    try {
      const auth = await requireAdminUser(req, deps.getAdminUserFromRequest);
      if (auth.error) return res.status(auth.error.status).json(auth.error.body);

      const subscription = await service.assignSubscription(req.body, auth.user.id);
      res.json({ success: true, subscription });
    } catch (err) {
      console.error("[ASSIGN SUBSCRIPTION] Error:", err.message);
      res.status(err.statusCode || 500).json({ success: false, error: err.message });
    }
  };

  const updateSubscription = async (req, res) => {
    try {
      const auth = await requireAdminUser(req, deps.getAdminUserFromRequest);
      if (auth.error) return res.status(auth.error.status).json(auth.error.body);

      const subscription = await service.updateSubscription(req.params.subscriptionId, req.body);
      res.json({ success: true, subscription });
    } catch (err) {
      console.error("[UPDATE SUBSCRIPTION] Error:", err.message);
      res.status(err.statusCode || 500).json({ success: false, error: err.message });
    }
  };

  return {
    assignSubscription,
    createPlan,
    listPlans,
    listSubscriptions,
    updatePlan,
    updateSubscription,
  };
};
