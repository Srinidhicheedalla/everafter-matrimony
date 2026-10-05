import { useEffect, useState } from "react";
import api from "../services/api";

function Interests() {

  const [interests, setInterests] = useState([]);

  useEffect(() => {
    fetchInterests();
  }, []);

  const fetchInterests = async () => {
    try {
      const res = await api.get(
        `/interest/received`
      );

      setInterests(res.data);
    } catch (err) {
      console.log(err);
    }
  };

  const acceptInterest = async (id) => {
    try {
      const res = await api.put(
        `/interest/accept/${id}`
      );

      alert(res.data.message);

      fetchInterests();
    } catch (err) {
      console.log(err);
    }
  };

  const rejectInterest = async (id) => {
    try {
      const res = await api.put(
        `/interest/reject/${id}`
      );

      alert(res.data.message);

      fetchInterests();
    } catch (err) {
      console.log(err);
    }
  };

  return (
    <div
      style={{
        maxWidth: "900px",
        margin: "30px auto",
        padding: "20px",
      }}
    >
      <h1
        style={{
          textAlign: "center",
          color: "#8B0000",
        }}
      >
        ❤️ Received Interests
      </h1>

      {interests.length === 0 ? (
        <h2 style={{ textAlign: "center" }}>
          No Interests Received
        </h2>
      ) : (
        interests.map((interest) => (
          <div
            key={interest.id}
            style={{
              border: "1px solid #ddd",
              borderRadius: "10px",
              padding: "20px",
              marginBottom: "20px",
              boxShadow: "0 2px 10px rgba(0,0,0,.1)",
            }}
          >
            <h2>{interest.fullName}</h2>

            <p>
              <b>Status :</b> {interest.status}
            </p>

            {interest.status === "Pending" && (
              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  marginTop: "15px",
                }}
              >
                <button
                  onClick={() => acceptInterest(interest.id)}
                  style={{
                    flex: 1,
                    padding: "12px",
                    background: "green",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                  }}
                >
                  Accept
                </button>

                <button
                  onClick={() => rejectInterest(interest.id)}
                  style={{
                    flex: 1,
                    padding: "12px",
                    background: "crimson",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                  }}
                >
                  Reject
                </button>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}

export default Interests;