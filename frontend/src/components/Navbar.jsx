import React from "react";
import { NavLink } from "react-router-dom";
import "../App.css";

export default function Navbar() {
  return (
    <header>
      <h1>CFDROCKET</h1>
      <nav className="nav-links">
        <NavLink to="/" className={({ isActive }) => (isActive ? "active" : "")}>
          Home
        </NavLink>
        <NavLink to="/dashboard" className={({ isActive }) => (isActive ? "active" : "")}>
          Dashboard
        </NavLink>
        <NavLink to="/wallets" className={({ isActive }) => (isActive ? "active" : "")}>
          Wallets
        </NavLink>
        <NavLink to="/kyc" className={({ isActive }) => (isActive ? "active" : "")}>
          KYC
        </NavLink>
        <NavLink to="/deposit" className={({ isActive }) => (isActive ? "active" : "")}>
          Deposit
        </NavLink>
        <NavLink to="/withdraw" className={({ isActive }) => (isActive ? "active" : "")}>
          Withdraw
        </NavLink>
        <NavLink to="/transactions" className={({ isActive }) => (isActive ? "active" : "")}>
          Transactions
        </NavLink>
      </nav>
    </header>
  );
}
