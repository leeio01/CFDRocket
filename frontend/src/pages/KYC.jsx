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
    <div style={styles.wrapper}>
      <h2 style={styles.heading}>KYC Form</h2>

      <form onSubmit={onSubmit} style={styles.form}>
        {Object.keys(form).map((field) => (
          <input
            key={field}
            style={styles.input}
            placeholder={field.charAt(0).toUpperCase() + field.slice(1)}
            value={form[field]}
            onChange={(e) => setForm({ ...form, [field]: e.target.value })}
            required
          />
        ))}
        <button type="submit" style={styles.button}>Submit</button>
      </form>

      <h3 style={styles.subheading}>Submitted KYC</h3>
      <ul style={styles.list}>
        {kycList.map((k, i) => (
          <li key={i} style={styles.listItem}>
            <strong>{k.name}</strong> – {k.country}, {k.city}, Age: {k.age}, Phone: {k.phone}
          </li>
        ))}
      </ul>
    </div>
  );
}

const styles = {
  wrapper: {
    padding: "24px",
    maxWidth: "600px",
    margin: "0 auto",
    background: "#f9fafb",
    borderRadius: "12px",
    boxShadow: "0 6px 20px rgba(0,0,0,0.1)",
  },
  heading: {
    fontSize: "26px",
    fontWeight: "700",
    marginBottom: "20px",
    textAlign: "center",
    color: "#1f2937",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "14px",
    marginBottom: "20px",
  },
  input: {
    padding: "12px 14px",
    fontSize: "16px",
    borderRadius: "8px",
    border: "1px solid rgba(0,0,0,0.3)",
    outline: "none",
    backgroundColor: "#fff",
    color: "#111",
    transition: "all 0.2s ease",
  },
  button: {
    padding: "12px",
    fontSize: "16px",
    borderRadius: "8px",
    border: "none",
    background: "linear-gradient(135deg, #2563eb, #7e22ce)",
    color: "#fff",
    fontWeight: "600",
    cursor: "pointer",
  },
  subheading: {
    fontSize: "22px",
    fontWeight: "600",
    marginBottom: "10px",
    color: "#1f2937",
  },
  list: {
    listStyle: "none",
    padding: "0",
    margin: "0",
  },
  listItem: {
    padding: "10px 0",
    borderBottom: "1px solid #e5e7eb",
    fontSize: "16px",
    color: "#374151",
  },
};

// Add focus style dynamically using inline style + pseudo-class is not possible in inline styles,
// but you can use CSS in App.css like this:
//
// input:focus {
//   border: 1px solid #111;
//   box-shadow: 0 0 3px rgba(0,0,0,0.2);
// }
