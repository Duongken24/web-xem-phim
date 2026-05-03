export const createUsersAdminService = ({ supabase }) => {
  const listUsers = async (query = "") => {
    let usersQuery = supabase.from("profiles").select("*").order("created_at", { ascending: false });

    if (query) {
      usersQuery = usersQuery.or(`email.ilike.%${query}%,full_name.ilike.%${query}%`);
    }

    const { data: users } = await usersQuery;
    const userRows = users || [];

    if (!userRows.length) {
      return [];
    }

    const userIds = userRows.map((item) => item.id);
    const [
      { data: watchRows, error: watchError },
      { data: favoriteRows, error: favoriteError },
      { data: ratingRows, error: ratingError },
    ] = await Promise.all([
      supabase.from("watch_history").select("user_id, last_watched_at").in("user_id", userIds),
      supabase.from("favorites").select("user_id").in("user_id", userIds),
      supabase.from("ratings").select("user_id").in("user_id", userIds),
    ]);

    if (watchError) console.warn("[ADMIN USERS] Could not fetch watch history counts:", watchError.message);
    if (favoriteError) console.warn("[ADMIN USERS] Could not fetch favorite counts:", favoriteError.message);
    if (ratingError) console.warn("[ADMIN USERS] Could not fetch rating counts:", ratingError.message);

    const activityByUser = new Map(
      userRows.map((item) => [
        item.id,
        {
          watch_count: 0,
          favorite_count: 0,
          rating_count: 0,
          last_watched_at: null,
        },
      ])
    );

    for (const row of watchRows || []) {
      const activity = activityByUser.get(row.user_id);
      if (!activity) continue;
      activity.watch_count += 1;

      if (row.last_watched_at && (!activity.last_watched_at || row.last_watched_at > activity.last_watched_at)) {
        activity.last_watched_at = row.last_watched_at;
      }
    }

    for (const row of favoriteRows || []) {
      const activity = activityByUser.get(row.user_id);
      if (activity) activity.favorite_count += 1;
    }

    for (const row of ratingRows || []) {
      const activity = activityByUser.get(row.user_id);
      if (activity) activity.rating_count += 1;
    }

    return userRows.map((item) => ({
      ...item,
      ...(activityByUser.get(item.id) || {
        watch_count: 0,
        favorite_count: 0,
        rating_count: 0,
        last_watched_at: null,
      }),
    }));
  };

  const createUser = async ({ email, password, fullName = "", role = "user" }) => {
    if (!email || !password) {
      const error = new Error("Email vÃ  password báº¯t buá»™c");
      error.statusCode = 400;
      throw error;
    }

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) {
      throw new Error(`Auth error: ${authError.message}`);
    }

    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .insert({
        id: authData.user.id,
        email,
        full_name: fullName,
        role,
        is_blocked: false,
      })
      .select()
      .single();

    if (profileError) {
      throw new Error(`Profile error: ${profileError.message}`);
    }

    return {
      user: authData.user,
      profile: profileData,
    };
  };

  const updateUserRole = async (userId, role) => {
    if (!role) {
      const error = new Error("Role báº¯t buá»™c");
      error.statusCode = 400;
      throw error;
    }

    const { data: updatedProfile, error: updateError } = await supabase
      .from("profiles")
      .update({ role })
      .eq("id", userId)
      .select()
      .single();

    if (updateError) {
      throw new Error(updateError.message);
    }

    return updatedProfile;
  };

  const updateUserBlock = async (userId, isBlocked) => {
    const { data: updatedProfile, error: updateError } = await supabase
      .from("profiles")
      .update({ is_blocked: isBlocked })
      .eq("id", userId)
      .select()
      .single();

    if (updateError) {
      throw new Error(updateError.message);
    }

    return updatedProfile;
  };

  return {
    createUser,
    listUsers,
    updateUserBlock,
    updateUserRole,
  };
};
