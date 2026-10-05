import { useEffect, useState } from "react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

function Profile() {
  // From context, not JSON.parse(localStorage): a fresh object every render
  // re-triggered the effect below in an endless fetch loop that wiped user input
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    dob: "",
    gender: "",
    height: "",
    weight: "",
    religion: "",
    caste: "",
    motherTongue: "",
    education: "",
    occupation: "",
    annualIncome: "",
    city: "",
    state: "",
    country: "",
    aboutMe: "",
    familyDetails: "",
    partnerPreference: "",
    photo: "",
  });

  useEffect(() => {
    if (!user) return;

    const loadProfile = async () => {
      try {
        const res = await api.get(
          `/profile/${user.id}`
        );

        if (res.data) {
          setFormData({
            dob: res.data.dob || "",
            gender: res.data.gender || "",
            height: res.data.height || "",
            weight: res.data.weight || "",
            religion: res.data.religion || "",
            caste: res.data.caste || "",
            motherTongue: res.data.motherTongue || "",
            education: res.data.education || "",
            occupation: res.data.occupation || "",
            annualIncome: res.data.annualIncome || "",
            city: res.data.city || "",
            state: res.data.state || "",
            country: res.data.country || "",
            aboutMe: res.data.aboutMe || "",
            familyDetails: res.data.familyDetails || "",
            partnerPreference: res.data.partnerPreference || "",
            photo: res.data.photo || "",
          });
        }
      } catch (err) {
        console.log(err);
      }
    };

    loadProfile();
  }, [user]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const saveProfile = async () => {
    try {
      const res = await api.post(
        "/profile/save",
        formData
      );

      alert(res.data.message);
    } catch (err) {
      console.log(err);
      alert("Failed to save profile");
    }
  };

  return (
    <div
      style={{
        width: "min(900px, 100% - 32px)",
        margin: "30px auto",
        padding: "clamp(16px, 5vw, 30px)",
        background: "#fff",
        borderRadius: "10px",
        boxShadow: "0 0 10px rgba(0,0,0,.15)",
      }}
    >
      <h1 style={{ color: "#8B0000", textAlign: "center" }}>
        Complete Your Profile
      </h1>

      <div
        className="grid grid-cols-1 sm:grid-cols-2"
        style={{
          gap: "15px",
          marginTop: "20px",
        }}
      >
        <input
          type="date"
          name="dob"
          value={formData.dob}
          onChange={handleChange}
        />

        <select
          name="gender"
          value={formData.gender}
          onChange={handleChange}
        >
          <option value="">Select Gender</option>
          <option>Male</option>
          <option>Female</option>
        </select>

        <input
          name="height"
          placeholder="Height"
          value={formData.height}
          onChange={handleChange}
        />

        <input
          name="weight"
          placeholder="Weight"
          value={formData.weight}
          onChange={handleChange}
        />

        <select
          name="religion"
          value={formData.religion}
          onChange={handleChange}
        >
          <option value="">Religion</option>
          <option>Hindu</option>
          <option>Muslim</option>
          <option>Christian</option>
          <option>Sikh</option>
          <option>Jain</option>
        </select>

        <input
          name="caste"
          placeholder="Caste"
          value={formData.caste}
          onChange={handleChange}
        />

        <input
          name="motherTongue"
          placeholder="Mother Tongue"
          value={formData.motherTongue}
          onChange={handleChange}
        />

        <input
          name="education"
          placeholder="Education"
          value={formData.education}
          onChange={handleChange}
        />

        <input
          name="occupation"
          placeholder="Occupation"
          value={formData.occupation}
          onChange={handleChange}
        />

        <input
          name="annualIncome"
          placeholder="Annual Income"
          value={formData.annualIncome}
          onChange={handleChange}
        />

        <input
          name="city"
          placeholder="City"
          value={formData.city}
          onChange={handleChange}
        />

        <input
          name="state"
          placeholder="State"
          value={formData.state}
          onChange={handleChange}
        />

        <input
          name="country"
          placeholder="Country"
          value={formData.country}
          onChange={handleChange}
        />
      </div>

      <br />

      <textarea
        name="aboutMe"
        placeholder="About Me"
        rows="4"
        style={{ width: "100%" }}
        value={formData.aboutMe}
        onChange={handleChange}
      />

      <br />
      <br />

      <textarea
        name="familyDetails"
        placeholder="Family Details"
        rows="4"
        style={{ width: "100%" }}
        value={formData.familyDetails}
        onChange={handleChange}
      />

      <br />
      <br />

      <textarea
        name="partnerPreference"
        placeholder="Partner Preference"
        rows="4"
        style={{ width: "100%" }}
        value={formData.partnerPreference}
        onChange={handleChange}
      />

      <br />
      <br />

      <button
        onClick={saveProfile}
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
        Save Profile
      </button>
    </div>
  );
}

export default Profile;