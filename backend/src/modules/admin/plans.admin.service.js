export const createPlansAdminService = ({ supabase }) => {
  const listPlans = async () => {
    const { data: plans } = await supabase
      .from("subscription_plans")
      .select("*")
      .order("created_at", { ascending: false });

    return plans || [];
  };

  const listSubscriptions = async () => {
    const { data: subs } = await supabase
      .from("user_subscriptions")
      .select("id, user_id, plan_id, status, start_date, end_date, created_at")
      .order("created_at", { ascending: false });

    let subscriptions = [];
    if (subs?.length > 0) {
      const userIds = [...new Set(subs.map((sub) => sub.user_id))];
      const planIds = [...new Set(subs.map((sub) => sub.plan_id))];

      const { data: users } = await supabase
        .from("profiles")
        .select("id, email, full_name")
        .in("id", userIds);

      const { data: plans } = await supabase
        .from("subscription_plans")
        .select("id, name")
        .in("id", planIds);

      const userMap = new Map(users?.map((user) => [user.id, user]) || []);
      const planMap = new Map(plans?.map((plan) => [plan.id, plan]) || []);

      subscriptions = subs.map((sub) => ({
        id: sub.id,
        user_id: sub.user_id,
        user_email: userMap.get(sub.user_id)?.email || "Unknown",
        user_name: userMap.get(sub.user_id)?.full_name || "Unknown",
        plan_id: sub.plan_id,
        plan_name: planMap.get(sub.plan_id)?.name || "Unknown",
        status: sub.status,
        start_date: sub.start_date,
        end_date: sub.end_date,
        created_at: sub.created_at,
      }));
    }

    return subscriptions;
  };

  const createPlan = async ({ name, code, price, durationDays, description = "", isActive = true }) => {
    if (!name || !code || !price || !durationDays) {
      const error = new Error("Name, code, price, durationDays báº¯t buá»™c");
      error.statusCode = 400;
      throw error;
    }

    const { data: newPlan, error: insertError } = await supabase
      .from("subscription_plans")
      .insert({
        name,
        code: code.toLowerCase(),
        price: Number(price),
        duration_days: Number(durationDays),
        description,
        is_active: isActive,
      })
      .select()
      .single();

    if (insertError) {
      throw new Error(insertError.message);
    }

    return newPlan;
  };

  const updatePlan = async (planId, { name, code, price, durationDays, description, isActive }) => {
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (code !== undefined) updateData.code = code.toLowerCase();
    if (price !== undefined) updateData.price = Number(price);
    if (durationDays !== undefined) updateData.duration_days = Number(durationDays);
    if (description !== undefined) updateData.description = description;
    if (isActive !== undefined) updateData.is_active = isActive;

    const { data: updatedPlan, error: updateError } = await supabase
      .from("subscription_plans")
      .update(updateData)
      .eq("id", planId)
      .select()
      .single();

    if (updateError) {
      throw new Error(updateError.message);
    }

    return updatedPlan;
  };

  const assignSubscription = async ({ userId, planId, startDate, status = "active" }, assignedBy) => {
    if (!userId || !planId) {
      const error = new Error("userId vÃ  planId báº¯t buá»™c");
      error.statusCode = 400;
      throw error;
    }

    const { data: plan } = await supabase
      .from("subscription_plans")
      .select("duration_days")
      .eq("id", planId)
      .single();

    const baseDate = startDate ? new Date(startDate) : new Date();
    const durationDays = plan?.duration_days || 30;
    const endDate = new Date(baseDate);
    endDate.setDate(endDate.getDate() + durationDays);

    const { data: subscription, error: insertError } = await supabase
      .from("user_subscriptions")
      .insert({
        user_id: userId,
        plan_id: planId,
        start_date: baseDate.toISOString().slice(0, 10),
        end_date: endDate.toISOString().slice(0, 10),
        status,
        assigned_by: assignedBy,
      })
      .select()
      .single();

    if (insertError) {
      throw new Error(insertError.message);
    }

    return subscription;
  };

  const updateSubscription = async (subscriptionId, { status, endDate }) => {
    const updateData = {};
    if (status !== undefined) updateData.status = status;
    if (endDate !== undefined) updateData.end_date = endDate;

    const { data: updatedSub, error: updateError } = await supabase
      .from("user_subscriptions")
      .update(updateData)
      .eq("id", subscriptionId)
      .select()
      .single();

    if (updateError) {
      throw new Error(updateError.message);
    }

    return updatedSub;
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
