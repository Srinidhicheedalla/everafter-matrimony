import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { loginUser } from "../services/authService";
import { useAuth } from "../context/AuthContext";

function Login() {

  const navigate = useNavigate();
  const { login } = useAuth();

  const [form, setForm] = useState({
    email: "",
    password: ""
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {

    e.preventDefault();

    try {

      setLoading(true);

      const res = await loginUser(form);

      login(res.data.user, res.data.token);

      alert("Login Successful");

      navigate("/dashboard");

    } catch (err) {

      alert(
        err.response?.data?.message || "Login Failed"
      );

    }

    setLoading(false);

  };

  return (

    <div className="container mx-auto px-4">

      <div
        style={{
          maxWidth: "420px",
          margin: "70px auto",
          padding: "30px",
          borderRadius: "12px",
          boxShadow: "0 0 15px #ddd"
        }}
      >

        <h2>Login</h2>

        <form onSubmit={handleSubmit}>

          <input
            type="email"
            name="email"
            placeholder="Email"
            aria-label="Email"
            value={form.email}
            onChange={handleChange}
            style={{
              width: "100%",
              padding: "12px",
              marginBottom: "15px"
            }}
          />

          <input
            type="password"
            name="password"
            placeholder="Password"
            aria-label="Password"
            value={form.password}
            onChange={handleChange}
            style={{
              width: "100%",
              padding: "12px",
              marginBottom: "15px"
            }}
          />

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "12px",
              background: "#c62828",
              color: "white",
              border: "none",
              cursor: "pointer"
            }}
          >

            {loading ? "Please wait..." : "Login"}

          </button>

        </form>

        <p
          style={{
            marginTop: "20px"
          }}
        >

          Don't have an account?{" "}

          <Link to="/register">

            Register

          </Link>

        </p>

      </div>

    </div>

  );

}

export default Login;