import { Link } from "react-router-dom";

function Home() {
  return (
    <div
      style={{
        textAlign: "center",
        padding: "80px 20px",
      }}
    >
      <h1 style={{ color: "#8B0000", fontSize: "48px" }}>
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

      <div style={{ marginTop: "40px" }}>
        <Link to="/register">
          <button
            style={{
              padding: "12px 25px",
              marginRight: "15px",
              cursor: "pointer",
            }}
          >
            Register
          </button>
        </Link>

        <Link to="/login">
          <button
            style={{
              padding: "12px 25px",
              cursor: "pointer",
            }}
          >
            Login
          </button>
        </Link>
      </div>
    </div>
  );
}

export default Home;