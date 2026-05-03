-- Demo web seed for Thêm Phim
-- Mục tiêu:
-- 1. Làm nổi khối "Top phim trên Thêm Phim"
-- 2. Có thêm favorite / rating / comment / watch history để web nhìn đủ dữ liệu
-- 3. Có thể chạy lại tương đối an toàn
--
-- Cách dùng:
-- - Mở Supabase SQL Editor
-- - Chạy toàn bộ file này
-- - Sau đó reload frontend

DO $$
DECLARE
  seed_tag constant text := '[DEMO_WEB_SEED_20260504]';
  selected_movie_count integer := 0;
  selected_profile_count integer := 0;
BEGIN
  CREATE TEMP TABLE tmp_seed_movies AS
  SELECT
    m.id,
    m.title,
    row_number() OVER (
      ORDER BY
        COALESCE(m.view_count, 0) DESC,
        COALESCE(m.average_rating, 0) DESC,
        m.id ASC
    ) AS rn
  FROM public.movies m
  LEFT JOIN public.content_controls cc ON cc.movie_id = m.id
  WHERE COALESCE(m.is_active, true) = true
    AND COALESCE(m.status, 'active') = 'active'
    AND COALESCE(cc.is_hidden, false) = false
    AND COALESCE(cc.is_blocked, false) = false
    AND (
      NULLIF(TRIM(COALESCE(m.poster_url, '')), '') IS NOT NULL
      OR NULLIF(TRIM(COALESCE(m.poster_path, '')), '') IS NOT NULL
      OR NULLIF(TRIM(COALESCE(m.image_url, '')), '') IS NOT NULL
      OR NULLIF(TRIM(COALESCE(m.thumbnail_url, '')), '') IS NOT NULL
    )
  LIMIT 12;

  GET DIAGNOSTICS selected_movie_count = ROW_COUNT;

  CREATE TEMP TABLE tmp_seed_profiles AS
  SELECT
    p.id,
    COALESCE(NULLIF(TRIM(p.full_name), ''), NULLIF(TRIM(p.email), ''), 'Demo User') AS display_name,
    row_number() OVER (ORDER BY p.created_at ASC, p.id ASC) AS rn
  FROM public.profiles p
  WHERE COALESCE(p.is_blocked, false) = false
  LIMIT 5;

  GET DIAGNOSTICS selected_profile_count = ROW_COUNT;

  RAISE NOTICE 'Demo seed: selected % movies and % profiles', selected_movie_count, selected_profile_count;

  IF selected_movie_count = 0 THEN
    RAISE EXCEPTION 'Không tìm thấy phim active có poster để seed demo.';
  END IF;

  -- 1. Tăng dữ liệu hiển thị trực tiếp ở bảng movies
  UPDATE public.movies m
  SET
    view_count = GREATEST(COALESCE(m.view_count, 0), 1800 - (sm.rn * 95)),
    average_rating = GREATEST(COALESCE(m.average_rating, 0), 7.1 + ((13 - sm.rn) * 0.11)),
    total_ratings = GREATEST(COALESCE(m.total_ratings, 0), 25 + ((13 - sm.rn) * 4)),
    rating = GREATEST(COALESCE(m.rating, 0), 7.0 + ((13 - sm.rn) * 0.12)),
    is_featured = CASE WHEN sm.rn <= 4 THEN true ELSE COALESCE(m.is_featured, false) END,
    is_trending = CASE WHEN sm.rn <= 6 THEN true ELSE COALESCE(m.is_trending, false) END,
    updated_at = now()
  FROM tmp_seed_movies sm
  WHERE m.id = sm.id;

  -- 2. Đồng bộ content_controls cho vài phim nổi bật
  INSERT INTO public.content_controls (
    movie_id,
    is_hidden,
    is_featured,
    is_premium,
    is_blocked,
    note,
    updated_at
  )
  SELECT
    sm.id,
    false,
    sm.rn <= 4,
    false,
    false,
    seed_tag || ' spotlight',
    now()
  FROM tmp_seed_movies sm
  WHERE sm.rn <= 6
    AND NOT EXISTS (
      SELECT 1
      FROM public.content_controls cc
      WHERE cc.movie_id = sm.id
    );

  UPDATE public.content_controls cc
  SET
    is_hidden = false,
    is_blocked = false,
    is_featured = CASE
      WHEN EXISTS (SELECT 1 FROM tmp_seed_movies sm WHERE sm.id = cc.movie_id AND sm.rn <= 4) THEN true
      ELSE cc.is_featured
    END,
    updated_at = now(),
    note = CASE
      WHEN cc.note IS NULL OR cc.note = '' THEN seed_tag || ' refresh'
      ELSE cc.note
    END
  WHERE EXISTS (SELECT 1 FROM tmp_seed_movies sm WHERE sm.id = cc.movie_id);

  IF selected_profile_count > 0 THEN
    -- 3. Favorites: tránh duplicate bằng (user_id, movie_id)
    INSERT INTO public.favorites (user_id, movie_id, created_at)
    SELECT
      sp.id,
      sm.id,
      now() - ((sm.rn + sp.rn) || ' hours')::interval
    FROM tmp_seed_profiles sp
    JOIN tmp_seed_movies sm ON sm.rn <= CASE WHEN sp.rn <= 2 THEN 6 ELSE 4 END
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.favorites f
      WHERE f.user_id = sp.id
        AND f.movie_id = sm.id
    );

    -- 4. Ratings: update nếu đã có, insert nếu chưa có
    UPDATE public.ratings r
    SET
      rating = LEAST(10, GREATEST(7, 10 - sm.rn + sp.rn - 1)),
      review = seed_tag || ' Phim hấp dẫn, phù hợp để làm dữ liệu demo.',
      updated_at = now()
    FROM tmp_seed_profiles sp
    JOIN tmp_seed_movies sm ON sm.rn <= 6
    WHERE r.user_id = sp.id
      AND r.movie_id = sm.id;

    INSERT INTO public.ratings (user_id, movie_id, rating, review, created_at, updated_at)
    SELECT
      sp.id,
      sm.id,
      LEAST(10, GREATEST(7, 10 - sm.rn + sp.rn - 1)),
      seed_tag || ' Phim hấp dẫn, phù hợp để làm dữ liệu demo.',
      now() - ((sm.rn + sp.rn) || ' days')::interval,
      now()
    FROM tmp_seed_profiles sp
    JOIN tmp_seed_movies sm ON sm.rn <= 6
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.ratings r
      WHERE r.user_id = sp.id
        AND r.movie_id = sm.id
    );

    -- 5. Comments: một comment mẫu cho 6 phim đầu
    INSERT INTO public.comments (
      user_id,
      movie_id,
      content,
      likes_count,
      created_at,
      updated_at,
      author_name,
      status
    )
    SELECT
      sp.id,
      sm.id,
      seed_tag || ' Nội dung cuốn hút, hình ảnh ổn và rất phù hợp để test giao diện.',
      GREATEST(0, 6 - sm.rn),
      now() - ((sm.rn * 3) || ' hours')::interval,
      now(),
      sp.display_name,
      'visible'
    FROM tmp_seed_profiles sp
    JOIN tmp_seed_movies sm ON sm.rn <= 6
    WHERE sp.rn = 1
      AND NOT EXISTS (
        SELECT 1
        FROM public.comments c
        WHERE c.user_id = sp.id
          AND c.movie_id = sm.id
          AND c.content LIKE seed_tag || '%'
      );

    -- 6. Watch history: tạo tiến độ xem dở cho 3 phim đầu, giúp Home có dữ liệu lịch sử
    UPDATE public.watch_history wh
    SET
      watch_position = CASE sm.rn WHEN 1 THEN 1260 WHEN 2 THEN 980 ELSE 740 END,
      duration = CASE sm.rn WHEN 1 THEN 5400 WHEN 2 THEN 5100 ELSE 4800 END,
      progress = CASE sm.rn WHEN 1 THEN 23 WHEN 2 THEN 19 ELSE 15 END,
      last_watched_at = now() - ((sm.rn * 40) || ' minutes')::interval,
      updated_at = now()
    FROM tmp_seed_profiles sp
    JOIN tmp_seed_movies sm ON sm.rn <= 3
    WHERE sp.rn = 1
      AND wh.user_id = sp.id
      AND wh.movie_id = sm.id
      AND wh.episode_id IS NULL;

    INSERT INTO public.watch_history (
      user_id,
      movie_id,
      episode_id,
      watch_position,
      duration,
      progress,
      last_watched_at,
      created_at,
      updated_at
    )
    SELECT
      sp.id,
      sm.id,
      NULL,
      CASE sm.rn WHEN 1 THEN 1260 WHEN 2 THEN 980 ELSE 740 END,
      CASE sm.rn WHEN 1 THEN 5400 WHEN 2 THEN 5100 ELSE 4800 END,
      CASE sm.rn WHEN 1 THEN 23 WHEN 2 THEN 19 ELSE 15 END,
      now() - ((sm.rn * 40) || ' minutes')::interval,
      now() - ((sm.rn * 40) || ' minutes')::interval,
      now()
    FROM tmp_seed_profiles sp
    JOIN tmp_seed_movies sm ON sm.rn <= 3
    WHERE sp.rn = 1
      AND NOT EXISTS (
        SELECT 1
        FROM public.watch_history wh
        WHERE wh.user_id = sp.id
          AND wh.movie_id = sm.id
          AND wh.episode_id IS NULL
      );

    -- 7. Search / click logs: giúp analytics và AI có thêm tín hiệu
    INSERT INTO public.search_logs (
      user_id,
      query,
      normalized_query,
      source_page,
      filters_json,
      result_count,
      clicked_movie_id,
      created_at
    )
    SELECT
      sp.id,
      'phim hay demo',
      'phim hay demo',
      '/search',
      jsonb_build_object('source', 'demo_seed'),
      selected_movie_count,
      sm.id,
      now() - ((sm.rn * 2) || ' hours')::interval
    FROM tmp_seed_profiles sp
    JOIN tmp_seed_movies sm ON sm.rn <= 4
    WHERE sp.rn = 1
      AND NOT EXISTS (
        SELECT 1
        FROM public.search_logs sl
        WHERE sl.user_id = sp.id
          AND sl.clicked_movie_id = sm.id
          AND sl.query = 'phim hay demo'
      );

    INSERT INTO public.movie_click_logs (
      user_id,
      movie_id,
      source_page,
      source_module,
      query_text,
      recommendation_source,
      rank_position,
      session_id,
      created_at
    )
    SELECT
      sp.id,
      sm.id,
      '/',
      'home_rankings',
      NULL,
      'demo_seed',
      sm.rn,
      'demo-seed-session',
      now() - ((sm.rn * 90) || ' minutes')::interval
    FROM tmp_seed_profiles sp
    JOIN tmp_seed_movies sm ON sm.rn <= 6
    WHERE sp.rn = 1
      AND NOT EXISTS (
        SELECT 1
        FROM public.movie_click_logs ml
        WHERE ml.user_id = sp.id
          AND ml.movie_id = sm.id
          AND ml.session_id = 'demo-seed-session'
      );
  ELSE
    RAISE NOTICE 'Không có profile nào trong bảng profiles, nên chỉ seed được dữ liệu trực tiếp trên movies/content_controls.';
  END IF;
END $$;

-- Kiểm tra nhanh sau khi chạy:
-- 1. reload web
-- 2. kiểm tra Home > Top phim trên Thêm Phim
-- 3. kiểm tra Home > Tiếp tục xem với profile đầu tiên
-- 4. kiểm tra movie detail có comment/rating/favorite
