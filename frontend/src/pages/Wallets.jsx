import React, { useState } from "react";

export default function Wallets() {
  const [wallets, setWallets] = useState([
    { asset: "BTC", address: "1ABC123FakeAddress" },
    { asset: "ETH", address: "0xFakeEthAddress" },
  ]);
  const [asset, setAsset] = useState("");
  const [address, setAddress] = useState("");

  const addWallet = (e) => {
    e.preventDefault();
    if (!asset || !address) return alert("Enter both fields");
    setWallets([...wallets, { asset, address }]);
    setAsset("");
    setAddress("");
  };

  return (
    <div>
      <h2>Wallet Management (Owner Only)</h2>
      <form onSubmit={addWallet} style={{ marginBottom: "20px" }}>
        <input
          placeholder="Asset (e.g., BTC)"
          value={asset}
          onChange={(e) => setAsset(e.target.value)}
        />
        <input
          placeholder="Wallet Address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />
        <button type="submit">Add Wallet</button>
      </form>

      <ul>
        {wallets.map((w, i) => (
          <li key={i}>
            {w.asset}: {w.address}
          </li>
        ))}
      </ul>
    </div>
  );
}
