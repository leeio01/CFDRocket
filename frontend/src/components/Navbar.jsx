import React from "react";
import { NavLink } from "react-router-dom";
import "../App.css";

export default function Navbar() {
  return (
    <header>
      <h1>CFDROCKET</h1>
      <nav className="nav-links">
        <NavLink to="/" className={({ isActive }) => isActive ? "active" : ""}>Home</NavLink>
        <NavLink to="/dashboard" className={({ isActive }) => isActive ? "active" : ""}>Dashboard</NavLink>
        <NavLink to="/convert" className={({ isActive }) => isActive ? "active" : ""}>Convert</NavLink>
        <NavLink to="/deposit" className={({ isActive }) => isActive ? "active" : ""}>Deposit</NavLink>
        <NavLink to="/withdraw" className={({ isActive }) => isActive ? "active" : ""}>Withdraw</NavLink>
      </nav>
    </header>
  );
}
