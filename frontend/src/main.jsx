import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App";

// Pages
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Convert from "./pages/Convert";
import Deposit from "./pages/Deposit";
import Withdraw from "./pages/Withdraw";
import Wallets from "./pages/Wallets";
import KYC from "./pages/KYC";
import Transactions from "./pages/Transactions";

import "./index.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />}>
          {/* Default route → Login */}
          <Route index element={<Login />} />

          {/* Main Pages */}
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="convert" element={<Convert />} />
          <Route path="deposit" element={<Deposit />} />
          <Route path="withdraw" element={<Withdraw />} />
          <Route path="wallets" element={<Wallets />} />
          <Route path="kyc" element={<KYC />} />
          <Route path="transactions" element={<Transactions />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
