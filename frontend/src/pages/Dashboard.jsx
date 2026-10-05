import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";
import api from "../services/api";

function Dashboard() {
  const { user, logout } = useAuth();

  const [stats, setStats] = useState({
    members: 0,
    pending: 0,
    matches: 0,
    profile: 0,
  });

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const profiles = await api.get(
        "/profile/all"
      );

      const interests = await api.get(
        `/interest/received`
      );

      const matches = await api.get(
        `/interest/matches`
      );

      const myProfile = await api.get(
        `/profile/${user.id}`
      );

      let percentage = 0;

      if (myProfile.data) {
        const fields = [
          "dob",
          "gender",
          "height",
          "weight",
          "religion",
          "caste",
          "motherTongue",
          "education",
          "occupation",
          "annualIncome",
          "city",
          "state",
          "country",
          "aboutMe",
          "familyDetails",
          "partnerPreference",
        ];

        let completed = 0;

        fields.forEach((field) => {
          if (myProfile.data[field]) completed++;
        });

        percentage = Math.round((completed / fields.length) * 100);
      }

      setStats({
        members: profiles.data.length,
        pending: interests.data.filter(
          (i) => i.status === "Pending"
        ).length,
        matches: matches.data.length,
        profile: percentage,
      });
    } catch (err) {
      console.log(err);
    }
  };

  return (
    <div
      style={{
        maxWidth: "1200px",
        margin: "40px auto",
        padding: "20px",
      }}
    >
      <h1 style={{ color: "#8B0000" }}>
        Welcome, {user?.fullName} 👋
      </h1>

      <p>{user?.email}</p>

      <div
        className="grid grid-cols-2 lg:grid-cols-4"
        style={{
          gap: "20px",
          marginTop: "40px",
        }}
      >
        <div style={cardStyle}>
          <h2>{stats.members}</h2>
          <p>Total Members</p>
        </div>

        <div style={cardStyle}>
          <h2>{stats.pending}</h2>
          <p>Pending Interests</p>
        </div>

        <div style={cardStyle}>
          <h2>{stats.matches}</h2>
          <p>My Matches</p>
        </div>

        <div style={cardStyle}>
          <h2>{stats.profile}%</h2>
          <p>Profile Completed</p>
        </div>
      </div>

      <h2 style={{ marginTop: "50px" }}>
        Quick Actions
      </h2>

      <div
        className="grid grid-cols-2 md:grid-cols-3"
        style={{
          gap: "20px",
          marginTop: "20px",
        }}
      >
        <Link to="/profile">
          <button style={btnStyle}>👤 My Profile</button>
        </Link>

        <Link to="/search">
          <button style={btnStyle}>🔍 Search Members</button>
        </Link>

        <Link to="/interests">
          <button style={btnStyle}>❤️ Interests</button>
        </Link>

        <Link to="/matches">
          <button style={btnStyle}>🤝 Matches</button>
        </Link>

        <Link to="/notifications">
          <button style={btnStyle}>🔔 Notifications</button>
        </Link>

        <button
          style={btnStyle}
          onClick={logout}
        >
          🚪 Logout
        </button>
      </div>
    </div>
  );
}

const cardStyle = {
  background: "#fff",
  padding: "clamp(16px, 4vw, 30px)",
  borderRadius: "10px",
  textAlign: "center",
  boxShadow: "0 0 10px rgba(0,0,0,.12)",
};

const btnStyle = {
  width: "100%",
  height: "100%", // equal heights when labels wrap on narrow screens
  padding: "18px",
  background: "#8B0000",
  color: "white",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
  fontSize: "16px",
};

export default Dashboard;