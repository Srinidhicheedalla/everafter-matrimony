import { useEffect, useState } from "react";
import axios from "axios";

function Matches() {
  const user = JSON.parse(localStorage.getItem("user"));

  const [matches, setMatches] = useState([]);

  useEffect(() => {
    fetchMatches();
  }, []);

  const fetchMatches = async () => {
    try {
      const res = await axios.get(
        `http://localhost:5000/api/interest/matches/${user.id}`
      );

      setMatches(res.data);
    } catch (err) {
      console.log(err);
    }
  };

  return (
    <div
      style={{
        maxWidth: "1000px",
        margin: "30px auto",
        padding: "20px",
      }}
    >
      <h1
        style={{
          textAlign: "center",
          color: "#8B0000",
          marginBottom: "30px",
        }}
      >
        ❤️ My Matches
      </h1>

      {matches.length === 0 ? (
        <h2 style={{ textAlign: "center" }}>
          No Matches Yet
        </h2>
      ) : (
        matches.map((match) => (
          <div
            key={match.id}
            style={{
              border: "1px solid #ddd",
              borderRadius: "10px",
              padding: "20px",
              marginBottom: "20px",
              boxShadow: "0 2px 8px rgba(0,0,0,.1)",
            }}
          >
            <h2>{match.fullName}</h2>

            <p>
              <b>Email:</b> {match.email}
            </p>

            <p>
              <b>Religion:</b> {match.religion}
            </p>

            <p>
              <b>Education:</b> {match.education}
            </p>

            <p>
              <b>Occupation:</b> {match.occupation}
            </p>

            <p>
              <b>City:</b> {match.city}
            </p>

            <p
              style={{
                color: "green",
                fontWeight: "bold",
                marginTop: "15px",
              }}
            >
              ❤️ Match Confirmed
            </p>
          </div>
        ))
      )}
    </div>
  );
}

export default Matches;