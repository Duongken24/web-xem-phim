export const createSubscriptionsService = ({
  getCurrentSubscriptionForUser,
  supabase,
}) => {
  void getCurrentSubscriptionForUser;

  const listPlans = async () => {
    return [];
  };

  const getCurrentSubscription = async (userId) => {
    try {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role, is_blocked")
        .eq("id", userId)
        .maybeSingle();

      if (profileError && profileError.code !== "PGRST116") {
        console.warn("[CURRENT SUBSCRIPTION PROFILE]", profileError.message);
      }

      return {
        role: profile?.role || null,
        isBlocked: Boolean(profile?.is_blocked),
        hasPremiumAccess: false,
        subscription: null,
      };
    } catch (error) {
      console.warn("[CURRENT SUBSCRIPTION]", error?.message || error);
      return {
        role: null,
        isBlocked: false,
        hasPremiumAccess: false,
        subscription: null,
      };
    }
  };

  return {
    getCurrentSubscription,
    listPlans,
  };
};
