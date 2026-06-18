import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface User {
  id: number;
  email: string;
  role: "STUDENT" | "COMPANY" | "ADMIN" | "SUPER_ADMIN" | "TPO";
  is_verified: boolean;
  sidebarPermissions?: string[] | null;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  profile: any | null;
  loading: boolean;
  login: (data: any) => void;
  logout: () => void;
  updateProfile: (profile: any) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let savedAuth = null;
    try {
      savedAuth = localStorage.getItem("talentbridge_auth");
    } catch (e) {
      console.error("Failed to read auth from localStorage", e);
    }
    if (savedAuth) {
      try {
        const { user, token, profile } = JSON.parse(savedAuth);
        setUser(user);
        setToken(token);
        setProfile(profile);
      } catch (err) {
        console.error("Corrupted local storage auth item, resetting", err);
        try {
          localStorage.removeItem("talentbridge_auth");
        } catch (e) {}
      }
    }
    setLoading(false);
  }, []);

  const login = (data: any) => {
    setUser(data.user);
    setToken(data.token);
    setProfile(data.profile);
    try {
      localStorage.setItem("talentbridge_auth", JSON.stringify(data));
    } catch (e) {
      console.error("Failed to save auth to localStorage", e);
    }
  };

  const updateProfile = (newProfile: any) => {
    setProfile(newProfile);
    let savedAuth = null;
    try {
      savedAuth = localStorage.getItem("talentbridge_auth");
    } catch (e) {
      console.error("Failed to read auth from localStorage", e);
    }
    if (savedAuth) {
      try {
        const auth = JSON.parse(savedAuth);
        auth.profile = newProfile;
        localStorage.setItem("talentbridge_auth", JSON.stringify(auth));
      } catch (e) {
        console.error("Failed to update auth in localStorage", e);
      }
    }
  };

  const logout = async () => {
    let savedAuth = null;
    try {
      savedAuth = localStorage.getItem("talentbridge_auth");
    } catch (e) {
      console.error("Failed to read auth from localStorage", e);
    }
    if (savedAuth) {
      try {
        const { refreshToken } = JSON.parse(savedAuth);
        import("../services/api").then(api => {
          api.default.post("/auth/logout", { refreshToken }).catch(() => {});
        });
      } catch (e) {}
    }
    setUser(null);
    setToken(null);
    setProfile(null);
    try {
      localStorage.removeItem("talentbridge_auth");
    } catch (e) {}
  };

  return (
    <AuthContext.Provider value={{ user, token, profile, loading, login, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
