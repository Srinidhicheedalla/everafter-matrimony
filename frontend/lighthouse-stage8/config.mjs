export const config = {
  baseUrl: "http://localhost:5173",
  backendUrl: "http://localhost:5000",
  publicPages: ["/", "/login", "/register"],
  authenticatedPages: ["/dashboard", "/profile", "/search", "/matches", "/interests", "/notifications"],
  authEmail: process.env.LH_EMAIL || "",
  authPassword: process.env.LH_PASSWORD || "",
};
