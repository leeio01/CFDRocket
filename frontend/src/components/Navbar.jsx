// Navbar.jsx
import React, { useState, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import "../App.css";

export default function Navbar() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const [open, setOpen] = useState(true); // sidebar open state
  const [isMobile, setIsMobile] = useState(false);

  // Detect screen size
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  function handleLogout() {
    localStorage.removeItem("token");
    navigate("/");
  }

  const links = token
    ? [
        { path: "/dashboard", label: "Dashboard" },
        { path: "/wallets", label: "Wallets" },
        { path: "/kyc", label: "KYC" },
        { path: "/deposit", label: "Deposit" },
        { path: "/withdraw", label: "Withdraw" },
        { path: "/transactions", label: "Transactions" },
      ]
    : [{ path: "/", label: "Login" }];

  return (
    <>
      {/* Hamburger button */}
      <button
        className="hamburger"
        onClick={() => setOpen(!open)}
        style={{
          position: "fixed",
          top: 20,
          left: 20,
          zIndex: 1001,
          background: "linear-gradient(135deg, #ff00ff, #00ffff)",
          border: "none",
          padding: "10px 12px",
          borderRadius: "8px",
          cursor: "pointer",
          color: "#fff",
          fontSize: "20px",
          boxShadow: "0 0 10px #ff00ff, 0 0 20px #00ffff",
        }}
      >
        {open ? "✖" : "☰"}
      </button>

      {/* Sidebar */}
      <aside
        className={`sidebar ${open ? "open" : ""}`}
        style={{
          position: "fixed",
          top: 0,
          left: open ? 0 : "-250px",
          height: "100%",
          width: "250px",
          background: "#1a1a2e",
          boxShadow: "2px 0 20px rgba(0,0,0,0.5)",
          display: "flex",
          flexDirection: "column",
          padding: "40px 20px",
          gap: "20px",
          transition: "left 0.3s ease",
          zIndex: 1000,
        }}
      >
        <h2 style={{ color: "#fff", textAlign: "center", marginBottom: "30px" }}>
          CFDROCKET
        </h2>

        {links.map((link) => (
          <NavLink
            key={link.path}
            to={link.path}
            className={({ isActive }) =>
              isActive ? "active-sidebar-link" : "sidebar-link"
            }
            style={{
              color: "#fff",
              fontWeight: 600,
              fontSize: "18px",
              textDecoration: "none",
              padding: "10px 0",
              borderRadius: "8px",
              transition: "all 0.2s ease",
            }}
            onClick={() => isMobile && setOpen(false)}
          >
            {link.label}
          </NavLink>
        ))}

        {token && (
          <button
            onClick={handleLogout}
            style={{
              marginTop: "auto",
              padding: "10px",
              borderRadius: "8px",
              border: "none",
              background: "linear-gradient(135deg, #ff00ff, #00ffff)",
              color: "#fff",
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "0 0 10px #ff00ff, 0 0 20px #00ffff",
            }}
          >
            Logout
          </button>
        )}
      </aside>
    </>
  );
}
