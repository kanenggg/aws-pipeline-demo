import { apiClient } from "./apiClient";

// Register
export async function register(
  username: string,
  email: string,
  password: string
) {
  // Axios automatically handles JSON.stringify and Content-Type
  const res = await apiClient.post("/users/register", {
    username,
    email,
    password,
  });
  return res.data;
}

// Login
export async function login(email: string, password: string) {
  const res = await apiClient.post("/users/login", {
    email,
    password,
  });

  // Access data directly via res.data
  const data = res.data;

  if (data.token) {
    localStorage.setItem("token", data.token); // store token
  }
  return data;
}

// Get all users (protected)
export async function getUsers() {
  // We do NOT need to manually add headers or get the token here.
  // The 'apiClient' interceptor does it automatically.
  const res = await apiClient.get("/users");
  return res.data;
}
