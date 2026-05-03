const getDashboardCounts = async (supabase) => {
  const [
    { count: totalUsers },
    { count: totalAdmins },
    { count: totalNormalUsers },
    { count: blockedUsers },
    { count: totalPlans },
    { count: activePlans },
    { count: totalSubscriptions },
    { count: activeSubscriptions },
    { count: hiddenContent },
    { count: premiumContent },
    { count: featuredContent },
    { count: blockedContent },
  ] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "admin"),
    supabase.from("profiles").select("*", { count: "exact", head: true }).neq("role", "admin"),
    supabase.from("profiles").select("*", { count: "exact", head: true }).eq("is_blocked", true),
    supabase.from("subscription_plans").select("*", { count: "exact", head: true }),
    supabase.from("subscription_plans").select("*", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("user_subscriptions").select("*", { count: "exact", head: true }),
    supabase.from("user_subscriptions").select("*", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("content_controls").select("*", { count: "exact", head: true }).eq("is_hidden", true),
    supabase.from("content_controls").select("*", { count: "exact", head: true }).eq("is_premium", true),
    supabase.from("content_controls").select("*", { count: "exact", head: true }).eq("is_featured", true),
    supabase.from("content_controls").select("*", { count: "exact", head: true }).eq("is_blocked", true),
  ]);

  return {
    totalUsers: totalUsers || 0,
    totalAdmins: totalAdmins || 0,
    totalNormalUsers: totalNormalUsers || 0,
    blockedUsers: blockedUsers || 0,
    totalPlans: totalPlans || 0,
    activePlans: activePlans || 0,
    totalSubscriptions: totalSubscriptions || 0,
    activeSubscriptions: activeSubscriptions || 0,
    hiddenContent: hiddenContent || 0,
    premiumContent: premiumContent || 0,
    featuredContent: featuredContent || 0,
    blockedContent: blockedContent || 0,
  };
};

export const createDashboardAdminService = ({ supabase }) => {
  const getDashboardTest = async () => {
    const { count: totalUsers } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true });

    return {
      message: "Test successful",
      totalUsers: totalUsers || 0,
      timestamp: new Date().toISOString(),
    };
  };

  const getDashboard = async () => {
    const stats = await getDashboardCounts(supabase);

    const { data: recentUsers } = await supabase
      .from("profiles")
      .select("id, email, full_name, role, is_blocked, created_at")
      .order("created_at", { ascending: false })
      .limit(5);

    const { data: recentSubs } = await supabase
      .from("user_subscriptions")
      .select("id, user_id, plan_id, status, start_date, end_date, created_at")
      .order("created_at", { ascending: false })
      .limit(5);

    let recentSubscriptions = [];
    if (recentSubs?.length > 0) {
      const userIds = [...new Set(recentSubs.map((sub) => sub.user_id))];
      const planIds = [...new Set(recentSubs.map((sub) => sub.plan_id))];

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

      recentSubscriptions = recentSubs.map((sub) => ({
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

    return {
      stats,
      recentUsers: recentUsers || [],
      recentSubscriptions,
    };
  };

  const getStats = () => getDashboardCounts(supabase);

  const getWatchStats = async () => {
    console.log("[WATCH STATS] Fetching watch history...");

    let watchHistory = [];
    let tryRelationship = true;

    if (tryRelationship) {
      const { data, error: watchError } = await supabase
        .from("watch_history")
        .select(`
          id,
          user_id,
          movie_id,
          watch_position,
          duration,
          progress,
          last_watched_at,
          created_at,
          profiles!user_id(email, full_name)
        `)
        .order("last_watched_at", { ascending: false })
        .limit(100);

      if (watchError) {
        console.warn("[WATCH STATS] Relationship query failed, trying separate queries:", watchError.message);
        tryRelationship = false;
      } else {
        watchHistory = data || [];
      }
    }

    if (!tryRelationship || watchHistory.length === 0) {
      console.log("[WATCH STATS] Using fallback separate queries...");

      const { data: watchData, error: watchError } = await supabase
        .from("watch_history")
        .select("id, user_id, movie_id, watch_position, duration, progress, last_watched_at, created_at")
        .order("last_watched_at", { ascending: false })
        .limit(100);

      if (watchError) {
        throw new Error(`Failed to fetch watch history: ${watchError.message}`);
      }

      watchHistory = watchData || [];

      if (watchHistory.length > 0) {
        const userIds = [...new Set(watchHistory.map((watch) => watch.user_id))];

        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("id, email, full_name")
          .in("id", userIds);

        if (profilesError) {
          console.warn("[WATCH STATS] Failed to fetch profiles:", profilesError.message);
        }

        const profileMap = new Map((profiles || []).map((profile) => [profile.id, profile]));

        watchHistory = watchHistory.map((watch) => ({
          ...watch,
          profiles: profileMap.get(watch.user_id) || { email: "Unknown", full_name: "Unknown" },
        }));
      }
    }

    if (!watchHistory || watchHistory.length === 0) {
      console.log("[WATCH STATS] No watch history data");
      return {
        watchStats: [],
        summary: {
          totalWatchEntries: 0,
          totalUsers: 0,
          totalMovies: 0,
          averageProgress: 0,
        },
      };
    }

    const movieIds = [...new Set(watchHistory.map((watch) => watch.movie_id).filter(Boolean))];
    const { data: movies, error: moviesError } = movieIds.length
      ? await supabase
          .from("movies")
          .select("id, tmdb_id, title, original_title, release_year")
          .in("id", movieIds)
      : { data: [], error: null };

    if (moviesError) {
      console.warn("[WATCH STATS] Failed to fetch movies:", moviesError.message);
    }

    const movieMap = new Map((movies || []).map((movie) => [Number(movie.id), movie]));

    const watchStats = watchHistory.map((watch) => {
      const watchedMinutes = watch.duration ? Math.round((watch.watch_position || 0) / 60) : 0;
      const totalMinutes = watch.duration ? Math.round(watch.duration / 60) : 0;
      const userProfile = watch.profiles || {};
      const movie = movieMap.get(Number(watch.movie_id)) || {};
      const computedProgress = watch.duration
        ? Math.min(100, Math.round(((watch.watch_position || 0) / watch.duration) * 100))
        : 0;

      return {
        id: watch.id,
        user_id: watch.user_id,
        user_email: userProfile.email || "Unknown",
        user_name: userProfile.full_name || "Unknown",
        movie_id: watch.movie_id,
        tmdb_id: movie.tmdb_id || null,
        movie_title: movie.title || movie.original_title || `Movie #${watch.movie_id}`,
        release_year: movie.release_year || null,
        watch_position: watch.watch_position || 0,
        watched_minutes: watchedMinutes,
        total_minutes: totalMinutes,
        progress_percent: watch.progress || computedProgress,
        last_watched_at: watch.last_watched_at || watch.created_at,
      };
    });

    const totalUsers = new Set(watchStats.map((stat) => stat.user_id)).size;
    const totalMovies = new Set(watchStats.map((stat) => stat.movie_id)).size;
    const totalWatchEntries = watchStats.length;
    const averageProgress = watchStats.length > 0
      ? Math.round(watchStats.reduce((sum, stat) => sum + (stat.progress_percent || 0), 0) / watchStats.length)
      : 0;

    console.log("[WATCH STATS] Returning data:", {
      totalEntries: totalWatchEntries,
      totalUsers,
      totalMovies,
      avgProgress: averageProgress,
    });

    return {
      watchStats,
      summary: {
        totalWatchEntries,
        totalUsers,
        totalMovies,
        averageProgress,
      },
    };
  };

  return {
    getDashboard,
    getDashboardTest,
    getStats,
    getWatchStats,
  };
};
