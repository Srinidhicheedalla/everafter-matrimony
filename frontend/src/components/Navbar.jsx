import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function Navbar() {
  const { user, logout } = useAuth();

  return (
    // Wraps onto two centered rows on phones, one row from sm up
    <nav className="flex flex-wrap items-center justify-center sm:justify-between gap-x-6 gap-y-2 px-4 sm:px-10 py-3 sm:py-4 bg-[#8B0000] text-white">
      <Link to="/" className="text-white text-xl sm:text-2xl font-bold">
        EverAfter Matrimony
      </Link>

      <div className="flex items-center gap-5">
        <Link to="/" className="text-white">
          Home
        </Link>

        {!user && (
          <>
            <Link to="/login" className="text-white">
              Login
            </Link>

            <Link to="/register" className="text-white">
              Register
            </Link>
          </>
        )}

        {user && (
          <>
            <Link to="/dashboard" className="text-white">
              Dashboard
            </Link>

            <button
              onClick={logout}
              className="bg-white text-[#8B0000] px-4 py-2 rounded-md"
            >
              Logout
            </button>
          </>
        )}
      </div>
    </nav>
  );
}

export default Navbar;
