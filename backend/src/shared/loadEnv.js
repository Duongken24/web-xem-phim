import dotenv from "dotenv";
import { fileURLToPath } from "url";

dotenv.config({
  path: fileURLToPath(new URL("../../.env", import.meta.url)),
  override: false,
});

dotenv.config({
  path: fileURLToPath(new URL("../../../user/.env", import.meta.url)),
  override: false,
});
