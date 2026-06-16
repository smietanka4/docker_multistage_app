import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";


export function Callback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const code = searchParams.get("code");

  useEffect(() => {
    if (!code) {
      navigate("/login");
      return;
    }

    const exchangeCode = async () => {
      try {
        const verifier = sessionStorage.getItem("pkce_verifier");
        const response = await fetch(
          "http://localhost:8080/realms/myapp/protocol/openid-connect/token",
          {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              grant_type: "authorization_code",
              client_id: "frontend",
              code: code,
              redirect_uri: `${window.location.origin}/callback`,
              code_verifier: verifier,
            }),
          },
        );

        const data = await response.json();
        localStorage.setItem("access_token", data.access_token);
        localStorage.setItem("refresh_token", data.refresh_token);
        sessionStorage.removeItem("pkce_verifier");

        window.location.href = "/";
      } catch (err) {
        console.error("Token exchange failed:", err);
        navigate("/login");
      }
    };

    exchangeCode();
  }, [code, navigate]);

  return <div>Logowanie w trakcie...</div>;
}
