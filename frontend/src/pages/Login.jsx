import React, { useContext } from "react";
import { AuthContext } from "../context/AuthContext";

export function Login() {
  const { login } = useContext(AuthContext);

  return (
    <div style={{ textAlign: "center", marginTop: "50px" }}>
      <h1>Zaloguj się</h1>
      <button
        onClick={login}
        style={{ padding: "10px 20px", fontSize: "16px" }}
      >
        Zaloguj z OAuth
      </button>
    </div>
  );
}
