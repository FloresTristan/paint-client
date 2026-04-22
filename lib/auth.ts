const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE;

async function parseJsonSafe(response: Response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
}

export async function authFetch(path: string, options: RequestInit = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const data = await parseJsonSafe(response);

  if (!response.ok) {
    throw new Error(data?.error || data?.message || "Request failed");
  }

  return data;
}

export async function loginUser(email: string, password: string) {
  return authFetch("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function registerUser(email: string, username: string, password: string) {
  return authFetch("/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, username, password }),
  });
}

export async function getCurrentUser() {
  return authFetch("/auth/me", {
    method: "GET",
  });
}

export async function logoutUser() {
  return authFetch("/auth/logout", {
    method: "POST",
  });
}

export async function createUser(email: string, username: string, password: string) {
  return authFetch("/auth/users", {
    method: "POST",
    body: JSON.stringify({ email, username, password }),
  });
}