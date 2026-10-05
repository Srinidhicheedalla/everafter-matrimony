import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

function Search() {
  const navigate = useNavigate();

  const [profiles, setProfiles] = useState([]);
  const [filteredProfiles, setFilteredProfiles] = useState([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    try {
      const res = await api.get("/profile/all");
      setProfiles(res.data);
      setFilteredProfiles(res.data);
    } catch (err) {
      console.log(err);
    }
  };

  const handleSearch = (value) => {
    setSearch(value);

    const filtered = profiles.filter((profile) => {
      return (
        profile.userName?.toLowerCase().includes(value.toLowerCase()) ||
        profile.city?.toLowerCase().includes(value.toLowerCase()) ||
        profile.religion?.toLowerCase().includes(value.toLowerCase()) ||
        profile.education?.toLowerCase().includes(value.toLowerCase())
      );
    });

    setFilteredProfiles(filtered);
  };

  return (
    <div
      style={{
        maxWidth: "1000px",
        margin: "30px auto",
        padding: "20px",
      }}
    >
      <h1 style={{ textAlign: "center", color: "#8B0000" }}>
        Search Members
      </h1>

      <input
        type="text"
        placeholder="Search by Name, City, Religion or Education"
        value={search}
        onChange={(e) => handleSearch(e.target.value)}
        style={{
          width: "100%",
          padding: "12px",
          marginBottom: "25px",
          borderRadius: "6px",
        }}
      />

      {filteredProfiles.map((profile) => (
        <div
          key={profile.userId}
          style={{
            border: "1px solid #ddd",
            borderRadius: "10px",
            padding: "20px",
            marginBottom: "20px",
          }}
        >
          <h2>{profile.userName}</h2>

          <p><b>Gender:</b> {profile.gender}</p>
          <p><b>Religion:</b> {profile.religion}</p>
          <p><b>Education:</b> {profile.education}</p>
          <p><b>Occupation:</b> {profile.occupation}</p>
          <p><b>City:</b> {profile.city}</p>

          <button
            onClick={() => navigate(`/view-profile/${profile.userId}`)}
            style={{
              background: "#8B0000",
              color: "white",
              border: "none",
              padding: "10px 18px",
              borderRadius: "5px",
              cursor: "pointer",
            }}
          >
            View Profile
          </button>
        </div>
      ))}
    </div>
  );
}

export default Search;