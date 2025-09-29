// Navbar.jsx
import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import "../App.css";

export default function Navbar() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  function handleLogout() {
    localStorage.removeItem("token");
    navigate("/"); // go back to login
  }

  return (
    <header>
      <h1>CFDROCKET</h1>
      <nav className="nav-links">
        {!token ? (
          // If not logged in → only show Home/Login
          <>
            <NavLink
              to="/"
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              Login
            </NavLink>
          </>
        ) : (
          // If logged in → show all links
          <>
            <NavLink
              to="/dashboard"
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              Dashboard
            </NavLink>
            <NavLink
              to="/wallets"
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              Wallets
            </NavLink>
            <NavLink
              to="/kyc"
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              KYC
            </NavLink>
            <NavLink
              to="/deposit"
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              Deposit
            </NavLink>
            <NavLink
              to="/withdraw"
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              Withdraw
            </NavLink>
            <NavLink
              to="/transactions"
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              Transactions
            </NavLink>
            <button onClick={handleLogout} style={{ marginLeft: "20px" }}>
              Logout
            </button>
          </>
        )}
      </nav>
    </header>
  );
}
