export type Course = {
  id: string;
  title: string;
  slug: string;
  description: string;
  level?: string;
  status: "draft" | "published" | "archived";
};

export type Actor = {
  id: string;
  display_name: string;
  roles: string[];
  avatar_url?: string | null;
  email?: string | null;
  account_status?: string;
  must_change_credentials?: boolean;
  pending_email?: string | null;
};

export type CourseResource = {
  id: string;
  course_id: string;
  playlist_id: string | null;
  section: "official" | "playlist" | "video" | "pending";
  title: string;
  channel: string;
  duration: string;
  url: string | null;
  description: string;
  position: number;
  status: "published" | "draft" | "pending_url" | "unavailable";
};

export type PlaylistWithLessons = CourseResource & {
  lessons: CourseResource[];
};

export type CourseResourcesBundle = {
  course: Course;
  official: CourseResource[];
  playlists: PlaylistWithLessons[];
  videos: CourseResource[];
  pending: CourseResource[];
};

export type CourseResourceInput = {
  section: "official" | "playlist" | "video" | "pending";
  playlist_id?: string | null;
  title: string;
  channel: string;
  duration: string;
  url: string | null;
  description: string;
  position: number;
  status: "published" | "draft" | "pending_url" | "unavailable";
};

export const apiOrigin = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export async function api<T>(path: string, token?: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${apiOrigin}${path}`, {
      ...init,
      credentials: "include",
      signal: AbortSignal.timeout(15000),
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        "X-Kairos-CSRF": "1",
        ...(token && token !== "cookie-session" ? { Authorization: `Bearer ${token}` } : {}),
        ...init?.headers,
      },
    });
  } catch {
    throw new Error("Não foi possível conectar à escola. Tente novamente em instantes.");
  }
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(
      typeof body?.detail === "string" ? body.detail : "Não foi possível concluir a operação."
    );
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return response.json() as Promise<T>;
}
