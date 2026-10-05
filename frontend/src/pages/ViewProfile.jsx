import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../services/api";

function ViewProfile() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const res = await api.get(
        `/profile/${id}`
      );

      setProfile(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "Could not load profile");
    }
  };

  const sendInterest = async () => {
    try {
      const res = await api.post(
        "/interest/send",
        {
          receiverId: Number(id),
        }
      );

      alert(res.data.message);
    } catch (err) {
      console.log(err);
      alert("Failed to send interest");
    }
  };

  if (!profile) {
    return (
      <div
        style={{
          textAlign: "center",
          marginTop: "80px",
          fontSize: "22px",
        }}
      >
        {error || "Loading..."}
      </div>
    );
  }

  return (
    <div
      style={{
        width: "min(900px, 100% - 32px)",
        margin: "30px auto",
        padding: "clamp(16px, 5vw, 30px)",
        background: "#fff",
        borderRadius: "10px",
        boxShadow: "0 0 15px rgba(0,0,0,.15)",
      }}
    >
      <h1
        style={{
          color: "#8B0000",
          textAlign: "center",
        }}
      >
        {profile.userName}
      </h1>

      <hr />

      <p><b>Gender :</b> {profile.gender}</p>
      <p><b>DOB :</b> {profile.dob}</p>
      <p><b>Height :</b> {profile.height}</p>
      <p><b>Weight :</b> {profile.weight}</p>

      <p><b>Religion :</b> {profile.religion}</p>
      <p><b>Caste :</b> {profile.caste}</p>
      <p><b>Mother Tongue :</b> {profile.motherTongue}</p>

      <p><b>Education :</b> {profile.education}</p>
      <p><b>Occupation :</b> {profile.occupation}</p>
      <p><b>Income :</b> {profile.annualIncome}</p>

      <p><b>City :</b> {profile.city}</p>
      <p><b>State :</b> {profile.state}</p>
      <p><b>Country :</b> {profile.country}</p>

      <hr />

      <h3>About Me</h3>
      <p>{profile.aboutMe}</p>

      <h3>Family Details</h3>
      <p>{profile.familyDetails}</p>

      <h3>Partner Preference</h3>
      <p>{profile.partnerPreference}</p>

      <br />

      <button
        onClick={sendInterest}
        style={{
          width: "100%",
          padding: "15px",
          background: "#8B0000",
          color: "white",
          border: "none",
          borderRadius: "6px",
          fontSize: "18px",
          cursor: "pointer",
        }}
      >
        ❤️ Send Interest
      </button>

      <br />
      <br />

      <button
        onClick={() => navigate("/search")}
        style={{
          width: "100%",
          padding: "15px",
          background: "#444",
          color: "white",
          border: "none",
          borderRadius: "6px",
          fontSize: "18px",
          cursor: "pointer",
        }}
      >
        ← Back to Search
      </button>
    </div>
  );
}

export default ViewProfile;