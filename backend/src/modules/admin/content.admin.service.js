export const createContentAdminService = ({ supabase }) => {
  const listContent = async (query = "") => {
    let contentQuery = supabase.from("content_controls").select("*").order("updated_at", { ascending: false });

    if (query) {
      contentQuery = contentQuery.or(`movie_title.ilike.%${query}%`);
    }

    const { data: content } = await contentQuery;
    return content || [];
  };

  const upsertContent = async ({ movieId, isHidden, isFeatured, isPremium, isBlocked, note }, updatedBy) => {
    if (movieId === undefined) {
      const error = new Error("movieId báº¯t buá»™c");
      error.statusCode = 400;
      throw error;
    }

    const { data: existing } = await supabase
      .from("content_controls")
      .select("id")
      .eq("movie_id", movieId)
      .single();

    const contentData = {
      movie_id: movieId,
      is_hidden: isHidden || false,
      is_featured: isFeatured || false,
      is_premium: isPremium || false,
      is_blocked: isBlocked || false,
      note: note || null,
      updated_by: updatedBy,
      updated_at: new Date().toISOString(),
    };

    let result;
    let error;

    if (existing) {
      const { data, error: err } = await supabase
        .from("content_controls")
        .update(contentData)
        .eq("id", existing.id)
        .select()
        .single();
      result = data;
      error = err;
    } else {
      const { data, error: err } = await supabase
        .from("content_controls")
        .insert(contentData)
        .select()
        .single();
      result = data;
      error = err;
    }

    if (error) {
      throw new Error(error.message);
    }

    return result;
  };

  return {
    listContent,
    upsertContent,
  };
};
