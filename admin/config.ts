import type { AdminConfig } from "@keystone-6/core/types";
import CustomNavigation from "./pages/customNavigation";
export const components: AdminConfig["components"] = {
  Navigation: CustomNavigation,
};
