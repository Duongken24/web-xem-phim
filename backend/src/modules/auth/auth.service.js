import { supabase } from "../../shared/supabaseClient.js";

const UNAUTHORIZED_MESSAGE = "Chưa đăng nhập";
const FORBIDDEN_MESSAGE = "Bạn không có quyền truy cập";

export const getUserFromToken = async (req) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("Không tìm thấy Header Authorization hợp lệ");
      return null;
    }

    const token = authHeader.split(" ")[1];

    if (
      !token ||
      token === "null" ||
      token === "undefined" ||
      token.split(".").length !== 3
    ) {
      console.error("Token gửi lên bị lỗi định dạng (Malformed):", token);
      return null;
    }

    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      console.error("Supabase Auth Error:", error?.message);
      return null;
    }

    return data.user;
  } catch (err) {
    console.error("Lỗi xử lý Token:", err.message);
    return null;
  }
};

export const getOptionalUserFromToken = async (req) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  return getUserFromToken(req);
};

export const getAdminUserFromRequest = async (req) => {
  const user = await getUserFromToken(req);

  if (!user) {
    const err = new Error(UNAUTHORIZED_MESSAGE);
    err.statusCode = 401;
    throw err;
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (error || profile?.role !== "admin") {
    const err = new Error(FORBIDDEN_MESSAGE);
    err.statusCode = 403;
    throw err;
  }

  return { user, profile };
};

