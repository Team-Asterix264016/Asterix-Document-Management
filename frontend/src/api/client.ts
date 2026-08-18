import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000/api";

export const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("asterix_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("asterix_token");
      localStorage.removeItem("asterix_user");
      if (!window.location.pathname.startsWith("/login")) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

/** Downloads an authenticated endpoint's response as a file (plain <a href> can't carry the Bearer token). */
export async function downloadFile(path: string, filename: string): Promise<void> {
  const res = await api.get(path, { responseType: "blob" });
  const url = window.URL.createObjectURL(res.data as Blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export function apiErrorMessage(error: unknown, fallback = "Something went wrong. Please try again."): string {
  if (axios.isAxiosError(error)) {
    if (!error.response) {
      return "Could not connect to the server. Is the backend running?";
    }
    return (error.response.data as { error?: string } | undefined)?.error ?? fallback;
  }
  return fallback;
}

export const usersApi = {
  getAll: async () => {
    const res = await api.get("/users");
    return res.data;
  },
  create: async (userData: any) => {
    const res = await api.post("/users", userData);
    return res.data;
  },
  resetPassword: async (id: string, newPassword: string) => {
    const res = await api.patch(`/users/${id}/password`, { newPassword });
    return res.data;
  },
};

