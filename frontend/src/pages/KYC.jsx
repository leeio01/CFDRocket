import React, { useState } from "react";

export default function KYC() {
  const [kycList, setKycList] = useState([]);
  const [form, setForm] = useState({ name: "", phone: "", city: "", country: "", age: "" });

  const onSubmit = (e) => {
    e.preventDefault();
    setKycList([...kycList, form]);
    setForm({ name: "", phone: "", city: "", country: "", age: "" });
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>KYC Form (Demo Only)</h2>
      <form onSubmit={onSubmit}>
        {Object.keys(form).map((field) => (
          <input
            key={field}
            style={styles.input}
            placeholder={field.toUpperCase()}
            value={form[field]}
            onChange={(e) => setForm({ ...form, [field]: e.target.value })}
            required
          />
        ))}
        <button type="submit" style={styles.button}>Submit</button>
      </form>

      <h3>Submitted KYC</h3>
      <ul>
        {kycList.map((k, i) => (
          <li key={i}>{k.name} – {k.country}</li>
        ))}
      </ul>
    </div>
  );
}

const styles = {
  input: { display: "block", margin: "10px 0", padding: "10px", borderRadius: "5px" },
  button: { padding: "10px 15px", border: "none", background: "purple", color: "white", borderRadius: "5px" }
};
