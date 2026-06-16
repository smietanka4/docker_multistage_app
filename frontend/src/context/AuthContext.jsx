import { createContext, useState, useEffect } from "react";

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem("access_token");
    if (savedToken) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setToken(savedToken);
      try {
        const payload = JSON.parse(atob(savedToken.split(".")[1]));
        setUser({
          id: payload.sub,
          username: payload.preferred_username,
          email: payload.email,
          roles: payload.realm_access?.roles || [],
        });
      } catch {
        console.error("Invalid token");
        localStorage.removeItem("access_token");
      }
    }
    setLoading(false);
  }, []);

  const login = async () => {
    const clientId = "frontend";
    const redirectUrl = `${window.location.origin}/callback`;
    const scope = "openid profile email";
    const responseType = "code";

    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);
    sessionStorage.setItem("pkce_verifier", codeVerifier);

    const authUrl =
      `http://localhost:8080/realms/myapp/protocol/openid-connect/auth?` +
      `client_id=${clientId}&` +
      `redirect_uri=${encodeURIComponent(redirectUrl)}&` +
      `scope=${encodeURIComponent(scope)}&` +
      `response_type=${responseType}&` +
      `code_challenge=${codeChallenge}&` +
      `code_challenge_method=S256`;

    window.location.href = authUrl;
  };

  const logout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    sessionStorage.removeItem("pkce_verifier");
    setUser(null);
    setToken(null);

    const logoutUrl =
      `http://localhost:8080/realms/myapp/protocol/openid-connect/logout?` +
      `client_id=frontend&` +
      `post_logout_redirect_uri=${encodeURIComponent(window.location.origin)}`;

    window.location.href = logoutUrl;
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

function generateCodeVerifier() {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  const length = 128;
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

async function generateCodeChallenge(verifier) {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return btoa(String.fromCharCode(...new Uint8Array(hashBuffer)))
    .replace(/\+/g, "-")
    .replace(/\//g, "-")
    .replace(/=+$/, "");
}
