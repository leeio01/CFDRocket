import React from "react";
import { Outlet } from "react-router-dom";
import Navbar from "./components/Navbar";
import "./App.css";

export default function App() {
  return (
    <div className="app-container flex flex-col min-h-screen">
      <Navbar />

      {/* Page Content */}
      <main className="flex-grow p-4 bg-gray-100">
        <div className="max-w-5xl mx-auto bg-white shadow rounded p-6">
          <Outlet />
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 text-white text-center p-4">
        © {new Date().getFullYear()} CFDROCKET — BUILT WITH ❤️
      </footer>
    </div>
  );
}
