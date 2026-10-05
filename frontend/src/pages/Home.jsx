import { Link } from "react-router-dom";

function Home() {
  return (
    <div
      style={{
        textAlign: "center",
        padding: "80px 20px",
      }}
    >
      <h1 style={{ color: "#8B0000", fontSize: "clamp(32px, 8vw, 48px)" }}>
        EverAfter Matrimony
      </h1>

      <p
        style={{
          fontSize: "20px",
          marginTop: "20px",
        }}
      >
        Find Your Perfect Life Partner
      </p>

      <div
        style={{
          marginTop: "40px",
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: "15px",
        }}
      >
        <Link to="/register">
          <button
            style={{
              ...btnStyle,
              background: "#8B0000",
              color: "white",
            }}
          >
            Register
          </button>
        </Link>

        <Link to="/login">
          <button
            style={{
              ...btnStyle,
              background: "transparent",
              color: "#8B0000",
            }}
          >
            Login
          </button>
        </Link>
      </div>
    </div>
  );
}

const btnStyle = {
  padding: "12px 28px",
  border: "2px solid #8B0000",
  borderRadius: "6px",
  fontSize: "16px",
  cursor: "pointer",
};

export default Home;